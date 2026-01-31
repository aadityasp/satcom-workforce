/**
 * Attendance Day Response DTOs
 *
 * Complete attendance day context for frontend status card
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WorkMode,
  BreakType,
  AttendanceEventType,
  VerificationStatus,
} from '@prisma/client';

/**
 * DTO for attendance events in timeline
 */
export class AttendanceEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AttendanceEventType })
  type: AttendanceEventType;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ enum: WorkMode })
  workMode: WorkMode;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiProperty({ enum: VerificationStatus })
  verificationStatus: VerificationStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isOverride: boolean;
}

/**
 * DTO for break segments in timeline
 */
export class BreakSegmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: BreakType })
  type: BreakType;

  @ApiProperty()
  startTime: string;

  @ApiPropertyOptional()
  endTime?: string;

  @ApiPropertyOptional()
  durationMinutes?: number;
}

/**
 * DTO for current break state
 */
export class CurrentBreakDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: BreakType })
  type: BreakType;

  @ApiProperty()
  startTime: string;
}

/**
 * DTO for work policy limits
 */
export class WorkPolicyDto {
  @ApiProperty({ description: 'Standard break duration in minutes' })
  breakDurationMinutes: number;

  @ApiProperty({ description: 'Lunch duration in minutes' })
  lunchDurationMinutes: number;

  @ApiProperty({ description: 'Minutes of work before overtime kicks in' })
  overtimeThresholdMinutes: number;

  @ApiProperty({ description: 'Maximum overtime minutes allowed' })
  maxOvertimeMinutes: number;

  @ApiProperty({ description: 'Standard work hours per day' })
  standardWorkHours: number;
}

/**
 * Complete attendance day response DTO
 */
export class AttendanceDayResponseDto {
  @ApiPropertyOptional({ description: 'Attendance day ID (null if not checked in)' })
  id?: string;

  @ApiProperty({ description: 'Date in ISO format' })
  date: string;

  @ApiProperty({
    description: 'Current attendance status',
    enum: ['not_checked_in', 'working', 'on_break', 'checked_out'],
  })
  status: 'not_checked_in' | 'working' | 'on_break' | 'checked_out';

  @ApiPropertyOptional({ description: 'Check-in timestamp' })
  checkInTime?: string;

  @ApiPropertyOptional({ description: 'Check-out timestamp' })
  checkOutTime?: string;

  @ApiPropertyOptional({ enum: WorkMode, description: 'Current work mode' })
  workMode?: WorkMode;

  @ApiPropertyOptional({
    type: CurrentBreakDto,
    description: 'Current break if on break',
  })
  currentBreak?: CurrentBreakDto;

  @ApiProperty({ description: 'Total work minutes (excluding breaks)' })
  totalWorkMinutes: number;

  @ApiProperty({ description: 'Total break minutes' })
  totalBreakMinutes: number;

  @ApiProperty({ description: 'Total lunch minutes' })
  totalLunchMinutes: number;

  @ApiProperty({ description: 'Overtime minutes' })
  overtimeMinutes: number;

  @ApiProperty({ type: [AttendanceEventDto], description: 'All events for the day' })
  events: AttendanceEventDto[];

  @ApiProperty({ type: [BreakSegmentDto], description: 'All breaks for the day' })
  breaks: BreakSegmentDto[];

  @ApiProperty({ type: WorkPolicyDto, description: 'Work policy limits for UI indicators' })
  policy: WorkPolicyDto;
}

/**
 * Check-in response with full day context
 */
export class CheckInResponseDto {
  @ApiProperty({ description: 'The check-in event created' })
  event: AttendanceEventDto;

  @ApiProperty({ type: AttendanceDayResponseDto, description: 'Full attendance day context' })
  attendanceDay: AttendanceDayResponseDto;
}

/**
 * Check-out summary statistics
 */
export class CheckOutSummaryDto {
  @ApiProperty({ description: 'Total work minutes for the day' })
  workedMinutes: number;

  @ApiProperty({ description: 'Total break minutes for the day' })
  breakMinutes: number;

  @ApiProperty({ description: 'Overtime minutes for the day' })
  overtime: number;
}

/**
 * Check-out response with full day context and summary
 */
export class CheckOutResponseDto {
  @ApiProperty({ description: 'The check-out event created' })
  event: AttendanceEventDto;

  @ApiProperty({ type: AttendanceDayResponseDto, description: 'Full attendance day context' })
  attendanceDay: AttendanceDayResponseDto;

  @ApiProperty({ type: CheckOutSummaryDto, description: 'Summary statistics for the day' })
  summary: CheckOutSummaryDto;
}
