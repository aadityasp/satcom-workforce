/**
 * Attendance Service
 *
 * Handles attendance business logic including check-in/out,
 * break management, overtime calculation, and attendance overrides.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceEventType, BreakType, VerificationStatus, WorkMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { GeofenceService } from './geofence.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StartBreakDto } from './dto/start-break.dto';
import { OverrideAttendanceDto } from './dto/override-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService,
  ) {}

  /**
   * Check in for the day
   */
  async checkIn(userId: string, companyId: string, checkInDto: CheckInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing check-in today
    const existingDay = await this.prisma.attendanceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: { events: true },
    });

    if (existingDay) {
      const hasCheckIn = existingDay.events.some(
        (e) => e.type === AttendanceEventType.CheckIn && !e.isOverride,
      );
      if (hasCheckIn && !existingDay.isComplete) {
        throw new BadRequestException('Already checked in today');
      }
    }

    // Validate geofence if required for office mode
    let verificationStatus: VerificationStatus = VerificationStatus.None;
    if (checkInDto.workMode === WorkMode.Office) {
      verificationStatus = await this.geofenceService.validateLocation(
        companyId,
        checkInDto.latitude,
        checkInDto.longitude,
      );
    }

    // Create or update attendance day
    const attendanceDay = await this.prisma.attendanceDay.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        date: today,
      },
      update: {},
    });

    // Create check-in event
    const event = await this.prisma.attendanceEvent.create({
      data: {
        attendanceDayId: attendanceDay.id,
        type: AttendanceEventType.CheckIn,
        timestamp: new Date(),
        workMode: checkInDto.workMode,
        latitude: checkInDto.latitude,
        longitude: checkInDto.longitude,
        verificationStatus,
        deviceFingerprint: checkInDto.deviceFingerprint,
        notes: checkInDto.notes,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'AttendanceCheckIn',
        entityType: 'AttendanceEvent',
        entityId: event.id,
        after: {
          workMode: checkInDto.workMode,
          verificationStatus,
        },
      },
    });

    return {
      event,
      attendanceDay: await this.getAttendanceDay(attendanceDay.id),
    };
  }

  /**
   * Check out for the day
   */
  async checkOut(userId: string, checkOutDto: CheckOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance
    const attendanceDay = await this.prisma.attendanceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: { events: true, breaks: true },
    });

    if (!attendanceDay) {
      throw new BadRequestException('Not checked in today');
    }

    const checkInEvent = attendanceDay.events.find(
      (e) => e.type === AttendanceEventType.CheckIn,
    );
    if (!checkInEvent) {
      throw new BadRequestException('No check-in found for today');
    }

    const hasCheckOut = attendanceDay.events.some(
      (e) => e.type === AttendanceEventType.CheckOut,
    );
    if (hasCheckOut) {
      throw new BadRequestException('Already checked out today');
    }

    // End any open breaks
    const openBreaks = attendanceDay.breaks.filter((b) => !b.endTime);
    for (const openBreak of openBreaks) {
      await this.endBreak(userId, openBreak.id);
    }

    // Create check-out event
    const event = await this.prisma.attendanceEvent.create({
      data: {
        attendanceDayId: attendanceDay.id,
        type: AttendanceEventType.CheckOut,
        timestamp: new Date(),
        workMode: checkInEvent.workMode,
        latitude: checkOutDto.latitude,
        longitude: checkOutDto.longitude,
        notes: checkOutDto.notes,
      },
    });

    // Calculate work time and overtime
    await this.calculateDayTotals(attendanceDay.id);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'AttendanceCheckOut',
        entityType: 'AttendanceEvent',
        entityId: event.id,
      },
    });

    return {
      event,
      attendanceDay: await this.getAttendanceDay(attendanceDay.id),
    };
  }

  /**
   * Start a break
   */
  async startBreak(userId: string, startBreakDto: StartBreakDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceDay = await this.prisma.attendanceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: { breaks: true, events: true },
    });

    if (!attendanceDay) {
      throw new BadRequestException('Not checked in today');
    }

    // Check if checked in and not checked out
    const hasCheckIn = attendanceDay.events.some(
      (e) => e.type === AttendanceEventType.CheckIn,
    );
    const hasCheckOut = attendanceDay.events.some(
      (e) => e.type === AttendanceEventType.CheckOut,
    );

    if (!hasCheckIn || hasCheckOut) {
      throw new BadRequestException('Cannot start break - not in an active work session');
    }

    // Check for open breaks
    const openBreak = attendanceDay.breaks.find((b) => !b.endTime);
    if (openBreak) {
      throw new BadRequestException('Already on a break');
    }

    const breakSegment = await this.prisma.breakSegment.create({
      data: {
        attendanceDayId: attendanceDay.id,
        type: startBreakDto.type,
        startTime: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'BreakStarted',
        entityType: 'BreakSegment',
        entityId: breakSegment.id,
        after: { type: startBreakDto.type },
      },
    });

    return breakSegment;
  }

  /**
   * End a break
   */
  async endBreak(userId: string, breakId: string) {
    const breakSegment = await this.prisma.breakSegment.findUnique({
      where: { id: breakId },
      include: { attendanceDay: true },
    });

    if (!breakSegment) {
      throw new NotFoundException('Break not found');
    }

    if (breakSegment.attendanceDay.userId !== userId) {
      throw new BadRequestException('Break does not belong to user');
    }

    if (breakSegment.endTime) {
      throw new BadRequestException('Break already ended');
    }

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - breakSegment.startTime.getTime()) / 60000,
    );

    const updated = await this.prisma.breakSegment.update({
      where: { id: breakId },
      data: {
        endTime,
        durationMinutes,
      },
    });

    // Update day totals
    await this.recalculateBreakTotals(breakSegment.attendanceDayId);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'BreakEnded',
        entityType: 'BreakSegment',
        entityId: breakId,
        after: { durationMinutes },
      },
    });

    return updated;
  }

  /**
   * Get today's attendance for user
   */
  async getToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceDay = await this.prisma.attendanceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        breaks: { orderBy: { startTime: 'asc' } },
      },
    });

    return attendanceDay;
  }

  /**
   * Get attendance history
   */
  async getHistory(
    userId: string,
    options: {
      startDate: Date;
      endDate: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const { startDate, endDate, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [days, total] = await Promise.all([
      this.prisma.attendanceDay.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          events: { orderBy: { timestamp: 'asc' } },
          breaks: { orderBy: { startTime: 'asc' } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceDay.count({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    return {
      data: days,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get attendance summary
   */
  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const days = await this.prisma.attendanceDay.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { events: true },
    });

    const presentDays = days.filter((d) =>
      d.events.some((e) => e.type === AttendanceEventType.CheckIn),
    ).length;

    const totalWorkMinutes = days.reduce((sum, d) => sum + d.totalWorkMinutes, 0);
    const totalOvertimeMinutes = days.reduce((sum, d) => sum + d.overtimeMinutes, 0);

    // Calculate average check-in/out times
    const checkIns = days
      .flatMap((d) => d.events)
      .filter((e) => e.type === AttendanceEventType.CheckIn)
      .map((e) => e.timestamp);

    const checkOuts = days
      .flatMap((d) => d.events)
      .filter((e) => e.type === AttendanceEventType.CheckOut)
      .map((e) => e.timestamp);

    const avgCheckIn = this.calculateAverageTime(checkIns);
    const avgCheckOut = this.calculateAverageTime(checkOuts);

    // Get leave days
    const leaveDays = await this.prisma.leaveRequest.count({
      where: {
        userId,
        status: 'Approved',
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
    });

    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays - leaveDays,
      leaveDays,
      totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 10) / 10,
      averageCheckInTime: avgCheckIn,
      averageCheckOutTime: avgCheckOut,
    };
  }

  /**
   * Override attendance event (HR/Admin)
   */
  async overrideAttendance(
    eventId: string,
    overrideDto: OverrideAttendanceDto,
    actorId: string,
  ) {
    const event = await this.prisma.attendanceEvent.findUnique({
      where: { id: eventId },
      include: { attendanceDay: true },
    });

    if (!event) {
      throw new NotFoundException('Attendance event not found');
    }

    const before = {
      timestamp: event.timestamp,
      workMode: event.workMode,
    };

    const updated = await this.prisma.attendanceEvent.update({
      where: { id: eventId },
      data: {
        timestamp: overrideDto.timestamp
          ? new Date(overrideDto.timestamp)
          : undefined,
        workMode: overrideDto.workMode,
        isOverride: true,
        overrideReason: overrideDto.reason,
        overrideBy: actorId,
      },
    });

    // Recalculate day totals
    await this.calculateDayTotals(event.attendanceDayId);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'AttendanceOverride',
        entityType: 'AttendanceEvent',
        entityId: eventId,
        before,
        after: {
          timestamp: updated.timestamp,
          workMode: updated.workMode,
        },
        reason: overrideDto.reason,
      },
    });

    return updated;
  }

  /**
   * Get attendance day by ID
   */
  private async getAttendanceDay(id: string) {
    return this.prisma.attendanceDay.findUnique({
      where: { id },
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        breaks: { orderBy: { startTime: 'asc' } },
      },
    });
  }

  /**
   * Calculate day totals after check-out
   */
  private async calculateDayTotals(attendanceDayId: string) {
    const day = await this.prisma.attendanceDay.findUnique({
      where: { id: attendanceDayId },
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        breaks: true,
        user: { include: { company: { include: { workPolicy: true } } } },
      },
    });

    if (!day) return;

    const checkIn = day.events.find(
      (e) => e.type === AttendanceEventType.CheckIn,
    );
    const checkOut = day.events.find(
      (e) => e.type === AttendanceEventType.CheckOut,
    );

    if (!checkIn || !checkOut) return;

    // Calculate work time
    const totalMinutes = Math.round(
      (checkOut.timestamp.getTime() - checkIn.timestamp.getTime()) / 60000,
    );

    // Calculate break totals
    const breakMinutes = day.breaks
      .filter((b) => b.type === BreakType.Break)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const lunchMinutes = day.breaks
      .filter((b) => b.type === BreakType.Lunch)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const workMinutes = totalMinutes - breakMinutes - lunchMinutes;

    // Calculate overtime
    const policy = day.user.company.workPolicy;
    const overtimeThreshold = policy?.overtimeThresholdMinutes || 480;
    const maxOvertime = policy?.maxOvertimeMinutes || 240;

    let overtimeMinutes = 0;
    if (workMinutes > overtimeThreshold) {
      overtimeMinutes = Math.min(workMinutes - overtimeThreshold, maxOvertime);
    }

    await this.prisma.attendanceDay.update({
      where: { id: attendanceDayId },
      data: {
        totalWorkMinutes: workMinutes,
        totalBreakMinutes: breakMinutes,
        totalLunchMinutes: lunchMinutes,
        overtimeMinutes,
        isComplete: true,
      },
    });
  }

  /**
   * Recalculate break totals
   */
  private async recalculateBreakTotals(attendanceDayId: string) {
    const day = await this.prisma.attendanceDay.findUnique({
      where: { id: attendanceDayId },
      include: { breaks: true },
    });

    if (!day) return;

    const breakMinutes = day.breaks
      .filter((b) => b.type === BreakType.Break)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const lunchMinutes = day.breaks
      .filter((b) => b.type === BreakType.Lunch)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    await this.prisma.attendanceDay.update({
      where: { id: attendanceDayId },
      data: {
        totalBreakMinutes: breakMinutes,
        totalLunchMinutes: lunchMinutes,
      },
    });
  }

  /**
   * Calculate average time from timestamps
   */
  private calculateAverageTime(timestamps: Date[]): string | null {
    if (timestamps.length === 0) return null;

    const totalMinutes = timestamps.reduce((sum, ts) => {
      return sum + ts.getHours() * 60 + ts.getMinutes();
    }, 0);

    const avgMinutes = Math.round(totalMinutes / timestamps.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
}
