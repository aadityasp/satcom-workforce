/**
 * Notifications Service
 *
 * Multi-channel notification delivery with:
 * - Push notifications via Firebase
 * - Email notifications
 * - SMS notifications
 * - In-app notifications
 * - Preference-based routing
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { NotificationType, NotificationChannel, ShiftStatus, UserRole } from '@prisma/client';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  imageUrl?: string;
}

export interface BulkNotificationPayload extends NotificationPayload {
  userIds: string[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Send notification to a single user through preferred channels
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Determine channels to use
      const channels = payload.channels || preferences.channels || [NotificationChannel.InApp];
      
      // Create in-app notification
      await this.createInAppNotification(userId, payload);
      
      // Send through other channels based on preferences
      const sendPromises: Promise<void>[] = [];
      
      if (channels.includes(NotificationChannel.Push) && preferences.pushEnabled) {
        sendPromises.push(this.sendPushNotification(userId, payload));
      }
      
      if (channels.includes(NotificationChannel.Email) && preferences.emailEnabled) {
        sendPromises.push(this.sendEmailNotification(userId, payload));
      }
      
      if (channels.includes(NotificationChannel.Sms) && preferences.smsEnabled) {
        sendPromises.push(this.sendSmsNotification(userId, payload));
      }
      
      await Promise.allSettled(sendPromises);
      
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}: ${(error as Error).message}`);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    // Batch notifications for efficiency
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(userId => this.sendToUser(userId, payload))
      );
    }
  }

  /**
   * Send notification to all users in a company
   */
  async sendToCompany(companyId: string, payload: NotificationPayload): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    
    await this.sendToUsers(users.map(u => u.id), payload);
  }

  /**
   * Send notification to users by role
   */
  async sendToRole(
    companyId: string,
    roles: string[],
    payload: NotificationPayload
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { companyId, role: { in: roles as UserRole[] }, isActive: true },
      select: { id: true },
    });
    
    await this.sendToUsers(users.map(u => u.id), payload);
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        priority: payload.priority || 'normal',
        actionUrl: payload.actionUrl,
        imageUrl: payload.imageUrl,
        isRead: false,
      },
    });
  }

  /**
   * Send push notification via Firebase
   */
  private async sendPushNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    // Get user's push tokens
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return;

    // In production, integrate with Firebase Cloud Messaging
    // For now, log the notification
    this.logger.log(`[PUSH] To ${userId}: ${payload.title}`);
    
    // TODO: Implement FCM integration
    // const message = {
    //   notification: {
    //     title: payload.title,
    //     body: payload.body,
    //   },
    //   data: payload.data,
    //   tokens: tokens.map(t => t.token),
    // };
    // await admin.messaging().sendMulticast(message);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.email) return;

    const emailTemplate = this.getEmailTemplate(payload.type);
    
    await this.emailService.sendEmail({
      to: user.email,
      subject: payload.title,
      html: emailTemplate(payload),
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.phone) return;

    // In production, integrate with Twilio or similar
    this.logger.log(`[SMS] To ${user.phone}: ${payload.title}`);
    
    // TODO: Implement Twilio integration
    // await twilioClient.messages.create({
    //   body: `${payload.title}\n${payload.body}`,
    //   to: user.profile.phone,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    // });
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<{
    channels: NotificationChannel[];
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const defaults = {
      channels: [NotificationChannel.InApp, NotificationChannel.Email],
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
    };

    if (preferences.length === 0) {
      return defaults;
    }

    return {
      channels: preferences.map(p => p.channel),
      pushEnabled: preferences.some(p => p.channel === NotificationChannel.Push && p.enabled),
      emailEnabled: preferences.some(p => p.channel === NotificationChannel.Email && p.enabled),
      smsEnabled: preferences.some(p => p.channel === NotificationChannel.Sms && p.enabled),
    };
  }

  /**
   * Get email template for notification type
   */
  private getEmailTemplate(type: NotificationType): (payload: NotificationPayload) => string {
    const templates: Record<NotificationType, (payload: NotificationPayload) => string> = {
      [NotificationType.ShiftAssigned]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        ${p.actionUrl ? `<a href="${p.actionUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Shift</a>` : ''}
      `,
      [NotificationType.ShiftUpdated]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.ShiftCancelled]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.ShiftReminder]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        <p>Don't forget to check in on time!</p>
      `,
      [NotificationType.ShiftSwapRequest]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        ${p.actionUrl ? `<a href="${p.actionUrl}" style="padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Respond</a>` : ''}
      `,
      [NotificationType.TimeOffApproved]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.TimeOffRejected]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.TimeOffReminder]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.TimesheetDue]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        <p>Please submit your timesheet before the deadline.</p>
      `,
      [NotificationType.TimesheetApproved]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.TimesheetRejected]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        <p>Please review and resubmit.</p>
      `,
      [NotificationType.OvertimeAlert]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.AnomalyDetected]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
        ${p.actionUrl ? `<a href="${p.actionUrl}" style="padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Review</a>` : ''}
      `,
      [NotificationType.Announcement]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.ChatMessage]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.PresenceUpdate]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.ExpenseApproved]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.ExpenseRejected]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.TrainingAssigned]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.CertificationExpiring]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
      [NotificationType.System]: (p) => `
        <h2>${p.title}</h2>
        <p>${p.body}</p>
      `,
    };

    return templates[type] || ((p) => `<h2>${p.title}</h2><p>${p.body}</p>`);
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { unreadOnly } = options;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Register push token
   */
  async registerPushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    // Deactivate old tokens for this device (if we had device ID)
    await this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
      update: {
        platform,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Unregister push token
   */
  async unregisterPushToken(token: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: {
      channel: NotificationChannel;
      enabled: boolean;
    }[]
  ): Promise<void> {
    for (const pref of preferences) {
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_channel: {
            userId,
            channel: pref.channel,
          },
        },
        create: {
          userId,
          channel: pref.channel,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      });
    }
  }

  /**
   * Send scheduled reminders
   */
  async sendShiftReminders(): Promise<void> {
    const upcomingShifts = await this.prisma.shift.findMany({
      where: {
        status: ShiftStatus.Scheduled,
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
      },
      include: {
        user: true,
      },
    });

    for (const shift of upcomingShifts) {
      await this.sendToUser(shift.userId, {
        type: NotificationType.ShiftReminder,
        title: 'Upcoming Shift Reminder',
        body: `You have a shift starting in less than 24 hours`,
        data: { shiftId: shift.id },
        channels: [NotificationChannel.Push, NotificationChannel.Email],
      });
    }
  }
}
