/**
 * Anomaly Detection Service - Rules engine for detecting attendance anomalies
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnomalyType, AnomalySeverity, AnomalyStatus, AttendanceEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomalyDetectionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Daily batch detection job - runs at 11:30 PM
   */
  @Cron('30 23 * * *')
  async runDailyDetection() {
    console.log('Running daily anomaly detection...');
    const companies = await this.prisma.company.findMany();

    for (const company of companies) {
      const rules = await this.prisma.anomalyRule.findMany({
        where: { companyId: company.id, isEnabled: true },
      });

      for (const rule of rules) {
        await this.evaluateRule(company.id, rule);
      }
    }
  }

  /**
   * Check for missing check-outs at end of day
   */
  async checkMissingCheckouts(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rule = await this.prisma.anomalyRule.findFirst({
      where: { companyId, type: AnomalyType.MissingCheckOut, isEnabled: true },
    });

    if (!rule) return;

    const incompletedays = await this.prisma.attendanceDay.findMany({
      where: {
        user: { companyId },
        date: today,
        isComplete: false,
        events: { some: { type: AttendanceEventType.CheckIn } },
      },
      include: { user: true },
    });

    for (const day of incompletedays) {
      await this.createAnomaly({
        userId: day.userId,
        ruleId: rule.id,
        type: AnomalyType.MissingCheckOut,
        severity: rule.severity,
        title: 'Missing Check-Out',
        description: `No checkout recorded for ${day.date.toDateString()}`,
        data: { date: day.date },
      });
    }
  }

  /**
   * Evaluate a specific rule
   */
  private async evaluateRule(companyId: string, rule: any) {
    switch (rule.type) {
      case AnomalyType.RepeatedLateCheckIn:
        await this.checkLateCheckIns(companyId, rule);
        break;
      case AnomalyType.MissingCheckOut:
        await this.checkMissingCheckouts(companyId);
        break;
      case AnomalyType.ExcessiveBreak:
        await this.checkExcessiveBreaks(companyId, rule);
        break;
      case AnomalyType.TimesheetMismatch:
        await this.checkTimesheetMismatch(companyId, rule);
        break;
    }
  }

  private async checkLateCheckIns(companyId: string, rule: any) {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - rule.windowDays);

    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: {
        attendanceDays: {
          where: { date: { gte: windowStart } },
          include: { events: true },
        },
      },
    });

    const workPolicy = await this.prisma.workPolicy.findUnique({
      where: { companyId },
    });

    const graceMinutes = workPolicy?.graceMinutesLate || 15;
    const workStartHour = 9; // 9 AM

    for (const user of users) {
      let lateCount = 0;

      for (const day of user.attendanceDays) {
        const checkIn = day.events.find(e => e.type === AttendanceEventType.CheckIn);
        if (checkIn) {
          const checkInTime = checkIn.timestamp.getHours() * 60 + checkIn.timestamp.getMinutes();
          const expectedTime = workStartHour * 60;

          if (checkInTime > expectedTime + graceMinutes) {
            lateCount++;
          }
        }
      }

      if (lateCount >= rule.threshold) {
        await this.createAnomaly({
          userId: user.id,
          ruleId: rule.id,
          type: AnomalyType.RepeatedLateCheckIn,
          severity: rule.severity,
          title: 'Repeated Late Check-Ins',
          description: `${lateCount} late arrivals in the last ${rule.windowDays} days`,
          data: { lateCount, windowDays: rule.windowDays },
        });
      }
    }
  }

  private async checkExcessiveBreaks(companyId: string, rule: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workPolicy = await this.prisma.workPolicy.findUnique({
      where: { companyId },
    });

    const standardBreak = workPolicy?.breakDurationMinutes || 15;
    const threshold = standardBreak * (rule.threshold / 100);

    const breaks = await this.prisma.breakSegment.findMany({
      where: {
        attendanceDay: { user: { companyId }, date: today },
        durationMinutes: { gt: threshold },
      },
      include: { attendanceDay: { include: { user: true } } },
    });

    for (const b of breaks) {
      await this.createAnomaly({
        userId: b.attendanceDay.userId,
        ruleId: rule.id,
        type: AnomalyType.ExcessiveBreak,
        severity: rule.severity,
        title: 'Excessive Break Time',
        description: `Break duration of ${b.durationMinutes} minutes exceeds limit`,
        data: { durationMinutes: b.durationMinutes, breakId: b.id },
      });
    }
  }

  private async checkTimesheetMismatch(companyId: string, rule: any) {
    // Compare attendance hours with timesheet hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: {
        attendanceDays: { where: { date: yesterday } },
        timesheetEntries: { where: { date: yesterday } },
      },
    });

    for (const user of users) {
      const attendanceMinutes = user.attendanceDays[0]?.totalWorkMinutes || 0;
      const timesheetMinutes = user.timesheetEntries.reduce((sum, e) => sum + e.minutes, 0);

      if (attendanceMinutes > 0) {
        const variance = Math.abs(attendanceMinutes - timesheetMinutes) / attendanceMinutes;
        if (variance > rule.threshold / 100) {
          await this.createAnomaly({
            userId: user.id,
            ruleId: rule.id,
            type: AnomalyType.TimesheetMismatch,
            severity: rule.severity,
            title: 'Timesheet Mismatch',
            description: `Attendance: ${Math.round(attendanceMinutes/60)}h, Timesheet: ${Math.round(timesheetMinutes/60)}h`,
            data: { attendanceMinutes, timesheetMinutes, variance },
          });
        }
      }
    }
  }

  private async createAnomaly(data: {
    userId: string;
    ruleId: string;
    type: AnomalyType;
    severity: AnomalySeverity;
    title: string;
    description: string;
    data: any;
  }) {
    // Check for duplicate open anomaly
    const existing = await this.prisma.anomalyEvent.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        status: AnomalyStatus.Open,
      },
    });

    if (existing) return;

    await this.prisma.anomalyEvent.create({
      data: {
        userId: data.userId,
        ruleId: data.ruleId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        data: data.data,
        detectedAt: new Date(),
      },
    });
  }
}
