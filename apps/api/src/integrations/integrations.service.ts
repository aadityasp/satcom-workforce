/**
 * Integrations Service
 *
 * Manages third-party integrations with:
 * - Payroll providers
 * - HRIS systems
 * - Calendar apps
 * - Accounting software
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationType, IntegrationStatus } from '@prisma/client';

export interface CreateIntegrationDto {
  type: IntegrationType;
  name: string;
  config: Record<string, any>;
}

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create integration
   */
  async createIntegration(
    companyId: string,
    actorId: string,
    dto: CreateIntegrationDto
  ) {
    return this.prisma.integration.create({
      data: {
        companyId,
        type: dto.type,
        name: dto.name,
        config: dto.config,
        status: IntegrationStatus.Pending,
        createdBy: actorId,
      },
    });
  }

  /**
   * Get integrations
   */
  async getIntegrations(companyId: string) {
    return this.prisma.integration.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update integration status
   */
  async updateStatus(
    integrationId: string,
    companyId: string,
    status: IntegrationStatus,
    errorMessage?: string
  ) {
    return this.prisma.integration.update({
      where: { id: integrationId, companyId },
      data: {
        status,
        errorMessage,
        lastSyncAt: status === IntegrationStatus.Active ? new Date() : undefined,
      },
    });
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string, companyId: string) {
    await this.prisma.integration.delete({
      where: { id: integrationId, companyId },
    });
    return { deleted: true };
  }

  /**
   * Sync with external system
   */
  async syncIntegration(integrationId: string, companyId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, companyId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Update last sync time
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    });

    // TODO: Implement actual sync logic based on integration type
    return { success: true, message: 'Sync initiated' };
  }

  /**
   * Get available integration types
   */
  getAvailableIntegrations() {
    return [
      {
        type: IntegrationType.QuickBooks,
        name: 'QuickBooks',
        description: 'Sync payroll and expense data with QuickBooks',
        configFields: ['apiKey', 'companyId', 'realmId'],
      },
      {
        type: IntegrationType.Salesforce,
        name: 'Salesforce',
        description: 'Sync employee data with Salesforce',
        configFields: ['clientId', 'clientSecret', 'instanceUrl'],
      },
      {
        type: IntegrationType.Slack,
        name: 'Slack',
        description: 'Send notifications to Slack channels',
        configFields: ['webhookUrl', 'channel'],
      },
      {
        type: IntegrationType.GoogleCalendar,
        name: 'Google Calendar',
        description: 'Sync shifts with Google Calendar',
        configFields: ['clientId', 'clientSecret', 'refreshToken'],
      },
      {
        type: IntegrationType.ADP,
        name: 'ADP',
        description: 'Sync payroll with ADP',
        configFields: ['clientId', 'clientSecret', 'certificates'],
      },
      {
        type: IntegrationType.BambooHR,
        name: 'BambooHR',
        description: 'Sync employee data with BambooHR',
        configFields: ['apiKey', 'subdomain'],
      },
      {
        type: IntegrationType.Gusto,
        name: 'Gusto',
        description: 'Sync payroll with Gusto',
        configFields: ['accessToken', 'companyId'],
      },
      {
        type: IntegrationType.Zapier,
        name: 'Zapier',
        description: 'Trigger Zapier workflows',
        configFields: ['webhookUrl'],
      },
    ];
  }
}
