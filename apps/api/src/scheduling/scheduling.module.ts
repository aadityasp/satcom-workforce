/**
 * Scheduling Module
 *
 * Advanced AI-powered scheduling system with shift management,
 * coverage optimization, and predictive analytics.
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { ShiftTemplatesService } from './shift-templates.service';
import { ShiftSwapsService } from './shift-swaps.service';
import { CoverageOptimizerService } from './coverage-optimizer.service';
import { AISchedulingService } from './ai-scheduling.service';
import { AvailabilityService } from './availability.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SchedulingController],
  providers: [
    SchedulingService,
    ShiftTemplatesService,
    ShiftSwapsService,
    CoverageOptimizerService,
    AISchedulingService,
    AvailabilityService,
  ],
  exports: [
    SchedulingService,
    ShiftSwapsService,
    AISchedulingService,
  ],
})
export class SchedulingModule {}
