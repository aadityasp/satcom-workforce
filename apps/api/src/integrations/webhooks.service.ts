/**
 * Webhooks Service
 *
 * Manages outgoing webhooks for event notifications.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register webhook
   */
  async registerWebhook(
    companyId: string,
    url: string,
    events: string[],
    secret?: string
  ) {
    return this.prisma.webhook.create({
      data: {
        companyId,
        url,
        events,
        secret,
        isActive: true,
      },
    });
  }

  /**
   * Get webhooks
   */
  async getWebhooks(companyId: string) {
    return this.prisma.webhook.findMany({
      where: { companyId },
    });
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    companyId: string,
    updates: { url?: string; events?: string[]; isActive?: boolean }
  ) {
    return this.prisma.webhook.update({
      where: { id: webhookId, companyId },
      data: updates,
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, companyId: string) {
    await this.prisma.webhook.delete({
      where: { id: webhookId, companyId },
    });
    return { deleted: true };
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(
    companyId: string,
    eventType: string,
    data: any
  ) {
    // Get active webhooks for this event type
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        companyId,
        isActive: true,
        events: { has: eventType },
      },
    });

    const event: WebhookEvent = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // Send to all matching webhooks
    const results = await Promise.allSettled(
      webhooks.map(webhook => this.sendWebhook(webhook, event))
    );

    return {
      event,
      delivered: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }

  /**
   * Send webhook payload
   */
  private async sendWebhook(
    webhook: { id: string; url: string; secret: string | null },
    event: WebhookEvent
  ): Promise<void> {
    const payload = JSON.stringify(event);
    
    // Generate signature if secret is configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-ID': webhook.id,
      'X-Event-Type': event.type,
    };

    if (webhook.secret) {
      const signature = createHmac('sha256', webhook.secret)
        .update(payload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payload,
      });

      // Log delivery attempt
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventId: event.id,
          eventType: event.type,
          payload: event as any,
          statusCode: response.status,
          success: response.ok,
          responseBody: response.ok ? null : await response.text(),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      // Log failed delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventId: event.id,
          eventType: event.type,
          payload: event as any,
          statusCode: 0,
          success: false,
          responseBody: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId: string, companyId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, companyId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents() {
    return [
      { name: 'user.created', description: 'When a new user is created' },
      { name: 'user.updated', description: 'When a user is updated' },
      { name: 'attendance.check_in', description: 'When a user checks in' },
      { name: 'attendance.check_out', description: 'When a user checks out' },
      { name: 'shift.assigned', description: 'When a shift is assigned' },
      { name: 'shift.started', description: 'When a shift starts' },
      { name: 'shift.completed', description: 'When a shift completes' },
      { name: 'leave.requested', description: 'When leave is requested' },
      { name: 'leave.approved', description: 'When leave is approved' },
      { name: 'timesheet.submitted', description: 'When timesheet is submitted' },
      { name: 'timesheet.approved', description: 'When timesheet is approved' },
      { name: 'expense.submitted', description: 'When expense is submitted' },
      { name: 'expense.approved', description: 'When expense is approved' },
      { name: 'anomaly.detected', description: 'When an anomaly is detected' },
    ];
  }
}
