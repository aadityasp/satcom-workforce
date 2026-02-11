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
import { AttendanceEventType, BreakType, VerificationStatus, WorkMode, AnomalyType, AnomalyStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { GeofenceService } from './geofence.service';
import { AnomaliesService } from '../anomalies/anomalies.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { StartBreakDto } from './dto/start-break.dto';
import { OverrideAttendanceDto } from './dto/override-attendance.dto';
import {
  AttendanceDayResponseDto,
  WorkPolicyDto,
  AttendanceEventDto,
  BreakSegmentDto,
} from './dto/attendance-day.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService,
    private anomaliesService: AnomaliesService,
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
      // ATT-1 fix: Properly detect open check-in session (no corresponding check-out)
      // Sort check-ins descending to find the most recent one
      const sortedCheckIns = existingDay.events
        .filter((e) => e.type === AttendanceEventType.CheckIn)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const lastCheckIn = sortedCheckIns[0];

      if (lastCheckIn) {
        // Check if there is a check-out event AFTER the most recent check-in
        const hasCheckOutAfterLastCheckIn = existingDay.events.some(
          (e) =>
            e.type === AttendanceEventType.CheckOut &&
            e.timestamp.getTime() > lastCheckIn.timestamp.getTime(),
        );
        if (!hasCheckOutAfterLastCheckIn) {
          throw new BadRequestException('Already checked in today. Please check out before checking in again.');
        }
      }
      // If day was complete (checked out), allow re-checking in
    }

    // Validate geofence if required for office mode
    let verificationStatus: VerificationStatus = VerificationStatus.None;
    if (checkInDto.workMode === WorkMode.Office) {
      verificationStatus = await this.geofenceService.validateAndCreateAnomaly(
        userId,
        companyId,
        checkInDto.latitude,
        checkInDto.longitude,
      );
    }

    // ATT-1 fix: Wrap upsert + event creation in a transaction for atomicity
    const { attendanceDay, event } = await this.prisma.$transaction(async (tx) => {
      // Re-check for open session inside transaction to prevent race conditions
      const dayInTx = await tx.attendanceDay.findUnique({
        where: { userId_date: { userId, date: today } },
        include: { events: true },
      });

      if (dayInTx) {
        const sortedCIs = dayInTx.events
          .filter((e) => e.type === AttendanceEventType.CheckIn)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const lastCI = sortedCIs[0];
        if (lastCI) {
          const hasCOAfterLastCI = dayInTx.events.some(
            (e) =>
              e.type === AttendanceEventType.CheckOut &&
              e.timestamp.getTime() > lastCI.timestamp.getTime(),
          );
          if (!hasCOAfterLastCI) {
            throw new BadRequestException('Already checked in today. Please check out before checking in again.');
          }
        }
      }

      // Create or update attendance day - reset isComplete if re-checking in
      const txDay = await tx.attendanceDay.upsert({
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
        update: {
          isComplete: false, // Reset to allow new session
        },
      });

      // Create check-in event
      const txEvent = await tx.attendanceEvent.create({
        data: {
          attendanceDayId: txDay.id,
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
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'AttendanceCheckIn',
          entityType: 'AttendanceEvent',
          entityId: txEvent.id,
          after: {
            workMode: checkInDto.workMode,
            verificationStatus,
          },
        },
      });

      return { attendanceDay: txDay, event: txEvent };
    });

    return {
      event,
      attendanceDay: await this.getAttendanceDayWithPolicy(attendanceDay.id, companyId, userId),
    };
  }

  /**
   * Check out for the day
   */
  async checkOut(userId: string, companyId: string, checkOutDto: CheckOutDto) {
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

    // Find the most recent check-in event (to support multiple check-ins per day)
    const checkInEvents = attendanceDay.events
      .filter((e) => e.type === AttendanceEventType.CheckIn)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const checkInEvent = checkInEvents[0];
    if (!checkInEvent) {
      throw new BadRequestException('No check-in found for today');
    }

    // Check if there's a checkout AFTER the most recent check-in
    const hasCheckOutAfterCheckIn = attendanceDay.events.some(
      (e) => e.type === AttendanceEventType.CheckOut &&
             e.timestamp.getTime() > checkInEvent.timestamp.getTime(),
    );
    if (hasCheckOutAfterCheckIn) {
      throw new BadRequestException('Already checked out for this session');
    }

    // End any open breaks
    const openBreaks = attendanceDay.breaks.filter((b) => !b.endTime);
    for (const openBreak of openBreaks) {
      await this.endBreak(userId, companyId, openBreak.id);
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

    // Get updated attendance day for summary
    const updatedDay = await this.prisma.attendanceDay.findUnique({
      where: { id: attendanceDay.id },
    });

    return {
      event,
      attendanceDay: await this.getAttendanceDayWithPolicy(attendanceDay.id, companyId, userId),
      summary: {
        workedMinutes: updatedDay?.totalWorkMinutes || 0,
        breakMinutes: (updatedDay?.totalBreakMinutes || 0) + (updatedDay?.totalLunchMinutes || 0),
        overtime: updatedDay?.overtimeMinutes || 0,
      },
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
  async endBreak(userId: string, companyId: string, breakId: string) {
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

    // Check for break policy violation and create anomaly if needed
    await this.checkBreakPolicyViolation(
      breakSegment.attendanceDayId,
      userId,
      companyId,
    );

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
   * Get today's attendance for user with full context
   */
  async getToday(userId: string, companyId: string): Promise<AttendanceDayResponseDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceDay = await this.prisma.attendanceDay.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    return this.getAttendanceDayWithPolicy(attendanceDay?.id || null, companyId, userId);
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
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { startDate, endDate } = options;
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
   * Get attendance day with full context including work policy
   */
  async getAttendanceDayWithPolicy(
    attendanceDayId: string | null,
    companyId: string,
    userId: string,
  ): Promise<AttendanceDayResponseDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch work policy
    const policy = await this.prisma.workPolicy.findUnique({
      where: { companyId },
    });

    const defaultPolicy: WorkPolicyDto = {
      breakDurationMinutes: policy?.breakDurationMinutes ?? 15,
      lunchDurationMinutes: policy?.lunchDurationMinutes ?? 60,
      overtimeThresholdMinutes: policy?.overtimeThresholdMinutes ?? 480,
      maxOvertimeMinutes: policy?.maxOvertimeMinutes ?? 240,
      standardWorkHours: policy?.standardWorkHours ?? 8,
    };

    // If no attendance day, return not_checked_in status
    if (!attendanceDayId) {
      return {
        date: today.toISOString(),
        status: 'not_checked_in',
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        totalLunchMinutes: 0,
        overtimeMinutes: 0,
        events: [],
        breaks: [],
        policy: defaultPolicy,
      };
    }

    // Fetch attendance day with events and breaks
    const day = await this.prisma.attendanceDay.findUnique({
      where: { id: attendanceDayId },
      include: {
        events: { orderBy: { timestamp: 'asc' } },
        breaks: { orderBy: { startTime: 'asc' } },
      },
    });

    if (!day) {
      return {
        date: today.toISOString(),
        status: 'not_checked_in',
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        totalLunchMinutes: 0,
        overtimeMinutes: 0,
        events: [],
        breaks: [],
        policy: defaultPolicy,
      };
    }

    // Compute status based on most recent check-in/check-out pair
    // Sort events by timestamp descending to find most recent
    const sortedCheckIns = day.events
      .filter((e) => e.type === AttendanceEventType.CheckIn)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const checkInEvent = sortedCheckIns[0];

    // Find check-out events that occurred after the most recent check-in
    const checkOutEvent = checkInEvent
      ? day.events.find(
          (e) => e.type === AttendanceEventType.CheckOut &&
                 e.timestamp.getTime() > checkInEvent.timestamp.getTime()
        )
      : null;
    const openBreak = day.breaks.find((b) => !b.endTime);

    let status: 'not_checked_in' | 'working' | 'on_break' | 'checked_out';
    if (!checkInEvent) {
      status = 'not_checked_in';
    } else if (checkOutEvent) {
      status = 'checked_out';
    } else if (openBreak) {
      status = 'on_break';
    } else {
      status = 'working';
    }

    // Map events to DTOs
    const events: AttendanceEventDto[] = day.events.map((e) => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp.toISOString(),
      workMode: e.workMode,
      latitude: e.latitude ? Number(e.latitude) : undefined,
      longitude: e.longitude ? Number(e.longitude) : undefined,
      verificationStatus: e.verificationStatus,
      notes: e.notes || undefined,
      isOverride: e.isOverride,
    }));

    // Map breaks to DTOs
    const breaks: BreakSegmentDto[] = day.breaks.map((b) => ({
      id: b.id,
      type: b.type,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime?.toISOString(),
      durationMinutes: b.durationMinutes || undefined,
    }));

    // Calculate live totals for work minutes if still working
    let totalWorkMinutes = day.totalWorkMinutes;
    if (status === 'working' && checkInEvent) {
      const now = new Date();
      const elapsedMinutes = Math.round(
        (now.getTime() - checkInEvent.timestamp.getTime()) / 60000,
      );
      const breakMinutes = day.totalBreakMinutes + day.totalLunchMinutes;
      totalWorkMinutes = Math.max(0, elapsedMinutes - breakMinutes);
    } else if (status === 'on_break' && checkInEvent && openBreak) {
      // Calculate work up to break start
      const breakStartTime = openBreak.startTime.getTime();
      const checkInTime = checkInEvent.timestamp.getTime();
      const elapsedMinutes = Math.round((breakStartTime - checkInTime) / 60000);
      const completedBreakMinutes = day.totalBreakMinutes + day.totalLunchMinutes;
      totalWorkMinutes = Math.max(0, elapsedMinutes - completedBreakMinutes);
    }

    // Calculate live break minutes if on break
    let totalBreakMinutes = day.totalBreakMinutes + day.totalLunchMinutes;
    if (openBreak) {
      const now = new Date();
      const currentBreakMinutes = Math.round(
        (now.getTime() - openBreak.startTime.getTime()) / 60000,
      );
      totalBreakMinutes += currentBreakMinutes;
    }

    return {
      id: day.id,
      date: day.date.toISOString(),
      status,
      checkInTime: checkInEvent?.timestamp.toISOString(),
      checkOutTime: checkOutEvent?.timestamp.toISOString(),
      workMode: checkInEvent?.workMode,
      currentBreak: openBreak
        ? {
            id: openBreak.id,
            type: openBreak.type,
            startTime: openBreak.startTime.toISOString(),
          }
        : undefined,
      totalWorkMinutes,
      totalBreakMinutes: day.totalBreakMinutes,
      totalLunchMinutes: day.totalLunchMinutes,
      overtimeMinutes: day.overtimeMinutes,
      events,
      breaks,
      policy: defaultPolicy,
    };
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

    // Sort events by timestamp ascending
    const sortedEvents = [...day.events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // Pair check-ins with their corresponding check-outs and sum all sessions
    let totalMinutes = 0;
    const checkIns = sortedEvents.filter((e) => e.type === AttendanceEventType.CheckIn);
    const checkOuts = sortedEvents.filter((e) => e.type === AttendanceEventType.CheckOut);

    for (const ci of checkIns) {
      // Find the first check-out after this check-in
      const co = checkOuts.find((e) => e.timestamp.getTime() > ci.timestamp.getTime());
      if (co) {
        totalMinutes += Math.round(
          (co.timestamp.getTime() - ci.timestamp.getTime()) / 60000,
        );
        // Remove this check-out so it's not paired again
        checkOuts.splice(checkOuts.indexOf(co), 1);
      }
    }

    if (totalMinutes === 0 && checkIns.length === 0) return;

    // Calculate break totals
    const breakMinutes = day.breaks
      .filter((b) => b.type === BreakType.Break)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const lunchMinutes = day.breaks
      .filter((b) => b.type === BreakType.Lunch)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const workMinutes = Math.max(0, totalMinutes - breakMinutes - lunchMinutes);

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

  /**
   * Get check-in locations for map visualization (Super Admin only)
   */
  async getCheckInLocations(
    companyId: string,
    options: { startDate: Date; endDate: Date },
  ) {
    const events = await this.prisma.attendanceEvent.findMany({
      where: {
        type: AttendanceEventType.CheckIn,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate,
        },
        latitude: { not: null },
        longitude: { not: null },
        attendanceDay: {
          user: { companyId },
        },
      },
      include: {
        attendanceDay: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return events.map((event) => ({
      id: event.id,
      userId: event.attendanceDay.userId,
      userName: event.attendanceDay.user.profile
        ? `${event.attendanceDay.user.profile.firstName} ${event.attendanceDay.user.profile.lastName}`
        : event.attendanceDay.user.email,
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
      timestamp: event.timestamp.toISOString(),
      workMode: event.workMode,
      verificationStatus: event.verificationStatus,
    }));
  }

  /**
   * Check if break time exceeds policy limits and create anomaly if so
   */
  private async checkBreakPolicyViolation(
    attendanceDayId: string,
    userId: string,
    companyId: string,
  ): Promise<void> {
    // Get the attendance day with all breaks
    const day = await this.prisma.attendanceDay.findUnique({
      where: { id: attendanceDayId },
      include: { breaks: true },
    });

    if (!day) return;

    // Calculate total break minutes (only completed breaks)
    const totalBreakMinutes = day.breaks
      .filter((b) => b.endTime != null)
      .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    // Get work policy
    const policy = await this.prisma.workPolicy.findUnique({
      where: { companyId },
    });

    if (!policy) return;

    // Check if exceeds limit (breakDurationMinutes + lunchDurationMinutes)
    const maxBreakMinutes = policy.breakDurationMinutes + policy.lunchDurationMinutes;

    if (totalBreakMinutes > maxBreakMinutes) {
      // Check if anomaly already exists for this day
      const startOfDay = new Date(day.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existingAnomaly = await this.prisma.anomalyEvent.findFirst({
        where: {
          userId,
          type: AnomalyType.ExcessiveBreak,
          detectedAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      if (!existingAnomaly) {
        // Find anomaly rule for ExcessiveBreak
        const rule = await this.prisma.anomalyRule.findFirst({
          where: {
            companyId,
            type: AnomalyType.ExcessiveBreak,
            isEnabled: true,
          },
        });

        if (rule) {
          await this.prisma.anomalyEvent.create({
            data: {
              userId,
              ruleId: rule.id,
              type: AnomalyType.ExcessiveBreak,
              severity: rule.severity,
              status: AnomalyStatus.Open,
              title: 'Excessive Break Time',
              description: `Break time exceeded policy limit: ${totalBreakMinutes} minutes (limit: ${maxBreakMinutes} minutes)`,
              data: {
                totalBreakMinutes,
                policyLimitMinutes: maxBreakMinutes,
                date: day.date.toISOString(),
              },
            },
          });
        }
      }
    }
  }
}
