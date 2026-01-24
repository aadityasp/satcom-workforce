/**
 * Attendance Module
 *
 * Handles attendance tracking including check-in/out,
 * breaks, overtime calculation, and geofence validation.
 */

import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { GeofenceService } from './geofence.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, GeofenceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
