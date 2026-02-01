/**
 * Notifications Module
 *
 * Multi-channel notification system supporting:
 * - Push notifications (Firebase)
 * - Email notifications
 * - SMS notifications
 * - In-app notifications
 * - WebSocket real-time notifications
 */

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
