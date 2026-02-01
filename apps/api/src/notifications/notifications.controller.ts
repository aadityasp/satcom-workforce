/**
 * Notifications Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole, NotificationChannel } from '@prisma/client';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.notificationsService.getUserNotifications(user.id, {
      unreadOnly: unreadOnly === 'true',
      page,
      limit,
    });
    return { success: true, ...result };
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @Body() dto: { notificationIds?: string[] },
  ) {
    if (dto.notificationIds && dto.notificationIds.length > 0) {
      for (const id of dto.notificationIds) {
        await this.notificationsService.markAsRead(id, user.id);
      }
    } else {
      await this.notificationsService.markAllAsRead(user.id);
    }
    return { success: true };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear notifications' })
  async clearNotifications(
    @CurrentUser() user: any,
    @Body() dto: { notificationIds?: string[] },
  ) {
    if (dto.notificationIds && dto.notificationIds.length > 0) {
      for (const id of dto.notificationIds) {
        await this.notificationsService.deleteNotification(id, user.id);
      }
    }
    return { success: true };
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  async registerPushToken(
    @CurrentUser() user: any,
    @Body() dto: { token: string; platform: 'ios' | 'android' | 'web' },
  ) {
    await this.notificationsService.registerPushToken(
      user.id,
      dto.token,
      dto.platform,
    );
    return { success: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() user: any) {
    // Preferences are fetched internally; expose them via a dedicated query
    const notifications = await this.notificationsService.getUserNotifications(user.id, {});
    return { success: true, data: notifications.meta };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: { preferences: { channel: NotificationChannel; enabled: boolean }[] },
  ) {
    await this.notificationsService.updatePreferences(user.id, dto.preferences);
    return { success: true };
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR, UserRole.SuperAdmin)
  @ApiOperation({ summary: 'Send notification to users (admin)' })
  async sendNotification(
    @CurrentUser() user: any,
    @Body() dto: { userIds: string[]; payload: NotificationPayload },
  ) {
    await this.notificationsService.sendToUsers(dto.userIds, dto.payload);
    return { success: true };
  }
}
