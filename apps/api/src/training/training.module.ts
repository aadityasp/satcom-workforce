/**
 * Training Module
 *
 * Training and certification tracking system.
 */

import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
