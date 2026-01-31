/**
 * Scheduling Service
 *
 * Core scheduling logic with AI-powered optimization,
 * conflict detection, and automated shift assignments.
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AISchedulingService } from './ai-scheduling.service';
import { CoverageOptimizerService } from './coverage-optimizer.service';
import { AvailabilityService } from './availability.service';
import { 
  ShiftStatus, 
  ShiftSwapStatus, 
  UserRole, 
  NotificationType,
  AnomalyType,
  AnomalySeverity,
} from '@prisma/client';
import { 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isBefore, 
  isAfter,
  parseISO,
  differenceInMinutes,
} from 'date-fns';

export interface CreateShiftDto {
  userId: string;
  startTime: Date;
  endTime: Date;
  locationId?: string;
  notes?: string;
  breakDuration?: number;
  departmentId?: string;
}

export interface ShiftTemplateDto {
  name: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  breakDuration: number;
  departmentId?: string;
  locationId?: string;
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
}

export interface ShiftSwapRequestDto {
  shiftId: string;
  requestedToUserId: string;
  reason?: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isPreferred: boolean;
  isAvailable: boolean;
}

@Injectable()
export class SchedulingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private aiScheduling: AISchedulingService,
    private coverageOptimizer: CoverageOptimizerService,
    private availabilityService: AvailabilityService,
  ) {}

  /**
   * Create a new shift
   */
  async createShift(companyId: string, actorId: string, dto: CreateShiftDto) {
    // Validate user belongs to company
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate times
    if (isBefore(dto.endTime, dto.startTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for conflicts
    const conflicts = await this.findShiftConflicts(dto.userId, dto.startTime, dto.endTime);
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Shift conflicts with existing shifts: ${conflicts.map(s => format(s.startTime, 'MMM d, h:mm a')).join(', ')}`
      );
    }

    // Check availability
    const isAvailable = await this.availabilityService.isUserAvailable(
      dto.userId,
      dto.startTime,
      dto.endTime
    );
    if (!isAvailable) {
      throw new BadRequestException('User is not available during this time period');
    }

    // Check for labor law compliance
    await this.validateLaborCompliance(dto.userId, dto.startTime, dto.endTime);

    const shift = await this.prisma.shift.create({
      data: {
        userId: dto.userId,
        companyId,
        startTime: dto.startTime,
        endTime: dto.endTime,
        locationId: dto.locationId,
        notes: dto.notes,
        breakDuration: dto.breakDuration || 0,
        departmentId: dto.departmentId,
        status: ShiftStatus.Scheduled,
      },
      include: {
        user: { include: { profile: true } },
        location: true,
        department: true,
      },
    });

    // Notify user
    await this.notifications.sendToUser(dto.userId, {
      type: NotificationType.ShiftAssigned,
      title: 'New Shift Assigned',
      body: `You have a new shift on ${format(dto.startTime, 'MMM d')} from ${format(dto.startTime, 'h:mm a')} to ${format(dto.endTime, 'h:mm a')}`,
      data: { shiftId: shift.id },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ShiftCreated',
        entityType: 'Shift',
        entityId: shift.id,
        after: dto as any,
      },
    });

    return shift;
  }

  /**
   * Create shifts from template
   */
  async createShiftsFromTemplate(
    companyId: string,
    actorId: string,
    templateId: string,
    startDate: Date,
    endDate: Date,
    userIds: string[]
  ) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id: templateId, companyId },
    });
    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    const shifts = [];
    const currentDate = new Date(startDate);

    while (isBefore(currentDate, endDate)) {
      const dayOfWeek = currentDate.getDay();
      
      if (template.daysOfWeek.includes(dayOfWeek)) {
        for (const userId of userIds) {
          const [startHour, startMinute] = template.startTime.split(':').map(Number);
          const [endHour, endMinute] = template.endTime.split(':').map(Number);

          const shiftStart = new Date(currentDate);
          shiftStart.setHours(startHour, startMinute, 0, 0);

          const shiftEnd = new Date(currentDate);
          shiftEnd.setHours(endHour, endMinute, 0, 0);

          // Handle overnight shifts
          if (isBefore(shiftEnd, shiftStart)) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }

          try {
            const shift = await this.createShift(companyId, actorId, {
              userId,
              startTime: shiftStart,
              endTime: shiftEnd,
              locationId: template.locationId ?? undefined,
              breakDuration: template.breakDuration,
              departmentId: template.departmentId ?? undefined,
            });
            shifts.push(shift);
          } catch (error) {
            // Log conflict but continue with other shifts
            console.warn(`Failed to create shift for user ${userId} on ${format(currentDate, 'yyyy-MM-dd')}: ${error.message}`);
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      template,
      shiftsCreated: shifts.length,
      shifts,
    };
  }

  /**
   * AI-powered auto-scheduling
   */
  async autoSchedule(
    companyId: string,
    actorId: string,
    startDate: Date,
    endDate: Date,
    requirements: {
      departmentId?: string;
      locationId?: string;
      minStaffCount: number;
      maxStaffCount: number;
      shiftDuration: number; // minutes
      breakDuration: number; // minutes
      optimizeFor?: 'cost' | 'preference' | 'coverage' | 'balanced';
    }
  ) {
    return this.aiScheduling.generateOptimalSchedule(
      companyId,
      startDate,
      endDate,
      requirements
    );
  }

  /**
   * Find shift conflicts for a user
   */
  async findShiftConflicts(userId: string, startTime: Date, endTime: Date, excludeShiftId?: string) {
    return this.prisma.shift.findMany({
      where: {
        userId,
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.InProgress] },
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
        OR: [
          {
            // New shift starts during existing shift
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            // New shift ends during existing shift
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            // New shift completely contains existing shift
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });
  }

  /**
   * Validate labor law compliance
   */
  private async validateLaborCompliance(userId: string, startTime: Date, endTime: Date) {
    // Get work policy
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: { include: { workPolicy: true } } },
    });

    if (!user?.company?.workPolicy) {
      return; // No policy to enforce
    }

    const policy = user.company.workPolicy;
    const shiftDuration = differenceInMinutes(endTime, startTime);

    // Check max shift duration (use maxWorkHours converted to minutes, or default 12h)
    const maxShiftDuration = policy.maxWorkHours ? policy.maxWorkHours * 60 : 720;
    if (shiftDuration > maxShiftDuration) {
      throw new BadRequestException(
        `Shift exceeds maximum duration of ${maxShiftDuration} minutes`
      );
    }

    // Check weekly hours
    const weekStart = startOfWeek(startTime);
    const weekEnd = endOfWeek(startTime);
    
    const weekShifts = await this.prisma.shift.findMany({
      where: {
        userId,
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.Completed] },
        startTime: { gte: weekStart, lte: weekEnd },
      },
    });

    const weeklyMinutes = weekShifts.reduce((sum, shift) => {
      return sum + differenceInMinutes(shift.endTime, shift.startTime);
    }, shiftDuration);

    const maxWeeklyHours = policy.maxWorkHours || 48;
    if (weeklyMinutes > maxWeeklyHours * 60) {
      throw new BadRequestException(
        `This shift would exceed the maximum weekly hours of ${maxWeeklyHours}`
      );
    }

    // Check for minimum rest period between shifts
    const lastShift = await this.prisma.shift.findFirst({
      where: {
        userId,
        endTime: { lt: startTime },
        status: { in: [ShiftStatus.Scheduled, ShiftStatus.Completed] },
      },
      orderBy: { endTime: 'desc' },
    });

    // Default minimum rest between shifts: 480 minutes (8 hours)
    const minRestBetweenShifts = 480;
    if (lastShift) {
      const restMinutes = differenceInMinutes(startTime, lastShift.endTime);
      if (restMinutes < minRestBetweenShifts) {
        throw new BadRequestException(
          `Minimum rest period of ${minRestBetweenShifts} minutes required between shifts`
        );
      }
    }
  }

  /**
   * Get shift by ID
   */
  async getShift(shiftId: string, companyId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, companyId },
      include: {
        user: { include: { profile: true } },
        location: true,
        department: true,
        swapRequests: {
          include: {
            requestedTo: { include: { profile: true } },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  /**
   * Get shifts for a date range
   */
  async getShifts(
    companyId: string,
    options: {
      startDate: Date;
      endDate: Date;
      userId?: string;
      departmentId?: string;
      locationId?: string;
      status?: ShiftStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const { 
      startDate, 
      endDate, 
      userId, 
      departmentId, 
      locationId, 
      status,
      page = 1, 
      limit = 50 
    } = options;

    const where: any = {
      companyId,
      OR: [
        {
          startTime: { gte: startDate, lte: endDate },
        },
        {
          endTime: { gte: startDate, lte: endDate },
        },
        {
          startTime: { lte: startDate },
          endTime: { gte: endDate },
        },
      ],
    };

    if (userId) where.userId = userId;
    if (departmentId) where.departmentId = departmentId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          location: true,
          department: true,
        },
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shift.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update shift
   */
  async updateShift(
    shiftId: string,
    companyId: string,
    actorId: string,
    updates: Partial<CreateShiftDto>
  ) {
    const shift = await this.getShift(shiftId, companyId);

    // Cannot update completed or cancelled shifts
    if (shift.status === ShiftStatus.Completed || shift.status === ShiftStatus.Cancelled) {
      throw new BadRequestException('Cannot update completed or cancelled shifts');
    }

    // Check for conflicts if times are changing
    if (updates.startTime || updates.endTime) {
      const newStart = updates.startTime || shift.startTime;
      const newEnd = updates.endTime || shift.endTime;
      
      const conflicts = await this.findShiftConflicts(
        updates.userId || shift.userId,
        newStart,
        newEnd,
        shiftId
      );
      
      if (conflicts.length > 0) {
        throw new BadRequestException('Updated shift conflicts with existing shifts');
      }
    }

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        ...updates,
      },
      include: {
        user: { include: { profile: true } },
        location: true,
      },
    });

    // Notify user of changes
    await this.notifications.sendToUser(updated.userId, {
      type: NotificationType.ShiftUpdated,
      title: 'Shift Updated',
      body: `Your shift on ${format(updated.startTime, 'MMM d')} has been updated`,
      data: { shiftId: updated.id },
    });

    return updated;
  }

  /**
   * Cancel shift
   */
  async cancelShift(shiftId: string, companyId: string, actorId: string, reason?: string) {
    const shift = await this.getShift(shiftId, companyId);

    if (shift.status === ShiftStatus.Completed) {
      throw new BadRequestException('Cannot cancel a completed shift');
    }

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.Cancelled,
        notes: reason,
      },
    });

    // Notify user
    await this.notifications.sendToUser(shift.userId, {
      type: NotificationType.ShiftCancelled,
      title: 'Shift Cancelled',
      body: `Your shift on ${format(shift.startTime, 'MMM d')} has been cancelled`,
      data: { shiftId, reason },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ShiftCancelled',
        entityType: 'Shift',
        entityId: shiftId,
        reason,
      },
    });

    return updated;
  }

  /**
   * Clock in for shift
   */
  async clockIn(shiftId: string, userId: string, location?: { lat: number; lng: number }) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, userId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.Scheduled) {
      throw new BadRequestException('Shift is not in scheduled status');
    }

    const now = new Date();
    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.InProgress,
      },
    });

    // Check for late arrival anomaly
    const scheduledStart = new Date(shift.startTime);
    const lateThresholdMinutes = 15;
    if (differenceInMinutes(now, scheduledStart) > lateThresholdMinutes) {
      await this.createAnomaly(userId, shift.companyId, AnomalyType.RepeatedLateCheckIn, {
        shiftId,
        scheduledStart: scheduledStart.toISOString(),
        actualStart: now.toISOString(),
        minutesLate: differenceInMinutes(now, scheduledStart),
      });
    }

    return updated;
  }

  /**
   * Clock out for shift
   */
  async clockOut(shiftId: string, userId: string, location?: { lat: number; lng: number }) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, userId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.InProgress) {
      throw new BadRequestException('Shift is not in progress');
    }

    const now = new Date();
    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.Completed,
      },
    });

    return updated;
  }

  /**
   * Create anomaly event
   */
  private async createAnomaly(
    userId: string,
    companyId: string,
    type: AnomalyType,
    data: any
  ) {
    const rule = await this.prisma.anomalyRule.findFirst({
      where: { companyId, type, isEnabled: true },
    });

    if (!rule) return;

    await this.prisma.anomalyEvent.create({
      data: {
        userId,
        ruleId: rule.id,
        type,
        severity: rule.severity,
        status: 'Open',
        title: this.getAnomalyTitle(type),
        description: this.getAnomalyDescription(type, data),
        data,
      },
    });
  }

  private getAnomalyTitle(type: AnomalyType): string {
    const titles: Record<string, string> = {
      RepeatedLateCheckIn: 'Late Shift Check-in',
      MissingCheckOut: 'Missing Shift Check-out',
      ExcessiveBreak: 'Excessive Break Time',
      OvertimeSpike: 'Overtime Alert',
      TimesheetMismatch: 'Timesheet Mismatch',
      GeofenceFailure: 'Geofence Violation',
      UnusualPattern: 'Unusual Activity Pattern',
    };
    return titles[type] || 'Anomaly Detected';
  }

  private getAnomalyDescription(type: AnomalyType, data: any): string {
    switch (type) {
      case AnomalyType.RepeatedLateCheckIn:
        return `Employee checked in ${data.minutesLate} minutes late for scheduled shift`;
      case AnomalyType.MissingCheckOut:
        return 'Employee did not check out for their shift';
      default:
        return 'An unusual pattern has been detected';
    }
  }

  /**
   * Get scheduling analytics
   */
  async getAnalytics(companyId: string, startDate: Date, endDate: Date) {
    const shifts = await this.prisma.shift.findMany({
      where: {
        companyId,
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    const totalShifts = shifts.length;
    const completedShifts = shifts.filter(s => s.status === ShiftStatus.Completed).length;
    const cancelledShifts = shifts.filter(s => s.status === ShiftStatus.Cancelled).length;
    const noShowShifts = shifts.filter(s => 
      s.status === ShiftStatus.Scheduled && isBefore(s.endTime, new Date())
    ).length;

    // Calculate total scheduled hours
    const totalScheduledMinutes = shifts.reduce((sum, shift) => {
      return sum + differenceInMinutes(shift.endTime, shift.startTime);
    }, 0);

    // Calculate actual worked hours (use scheduled times for completed shifts)
    const totalWorkedMinutes = shifts
      .filter(s => s.status === ShiftStatus.Completed)
      .reduce((sum, shift) => {
        return sum + differenceInMinutes(
          new Date(shift.endTime),
          new Date(shift.startTime)
        );
      }, 0);

    // Coverage by day of week
    const coverageByDay = [0, 1, 2, 3, 4, 5, 6].map(day => {
      const dayShifts = shifts.filter(s => new Date(s.startTime).getDay() === day);
      return {
        day,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
        shiftCount: dayShifts.length,
        totalHours: dayShifts.reduce((sum, s) => 
          sum + differenceInMinutes(s.endTime, s.startTime) / 60, 0
        ),
      };
    });

    // Top employees by hours
    const employeeHours = shifts.reduce((acc, shift) => {
      const userId = shift.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          name: shift.user.profile 
            ? `${shift.user.profile.firstName} ${shift.user.profile.lastName}`
            : shift.user.email,
          totalMinutes: 0,
          shiftCount: 0,
        };
      }
      acc[userId].totalMinutes += differenceInMinutes(shift.endTime, shift.startTime);
      acc[userId].shiftCount += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      summary: {
        totalShifts,
        completedShifts,
        cancelledShifts,
        noShowShifts,
        completionRate: totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0,
        totalScheduledHours: Math.round(totalScheduledMinutes / 60 * 10) / 10,
        totalWorkedHours: Math.round(totalWorkedMinutes / 60 * 10) / 10,
      },
      coverageByDay,
      topEmployees: Object.values(employeeHours)
        .sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)
        .slice(0, 10),
    };
  }

  /**
   * Auto-complete expired shifts (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteExpiredShifts() {
    const now = new Date();
    
    const expiredShifts = await this.prisma.shift.findMany({
      where: {
        status: ShiftStatus.Scheduled,
        endTime: { lt: now },
      },
    });

    for (const shift of expiredShifts) {
      // Mark as no-show
      await this.prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: ShiftStatus.Cancelled,
        },
      });

      // Create anomaly
      await this.createAnomaly(shift.userId, shift.companyId, AnomalyType.MissingCheckOut, {
        shiftId: shift.id,
        scheduledStart: shift.startTime.toISOString(),
        scheduledEnd: shift.endTime.toISOString(),
      });
    }

    console.log(`Auto-completed ${expiredShifts.length} expired shifts`);
  }
}
