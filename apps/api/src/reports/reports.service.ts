/**
 * Reports Service
 *
 * Aggregates dashboard data for Manager and HR roles.
 * Manager sees direct reports only, HR sees org-wide data.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ManagerDashboardDto,
  HRDashboardDto,
  AttendanceSummaryDto,
  TimesheetSummaryDto,
  TeamMemberStatusDto,
} from './dto/dashboard-response.dto';
import { AttendanceEventType, AnomalyStatus } from '@prisma/client';
import { subDays, format, eachDayOfInterval, startOfWeek } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get Manager Dashboard - Direct reports only
   * CRITICAL: Filter by managerId to prevent data leakage
   */
  async getManagerDashboard(
    managerId: string,
    companyId: string,
  ): Promise<ManagerDashboardDto> {
    // Get direct reports - MUST filter by managerId
    const directReports = await this.prisma.employeeProfile.findMany({
      where: { managerId },
      select: { userId: true, firstName: true, lastName: true },
    });

    const userIds = directReports.map((u) => u.userId);
    const teamSize = userIds.length;

    if (teamSize === 0) {
      return this.emptyManagerDashboard();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define late threshold: 9:15 AM
    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 15, 0, 0);

    // Parallel queries for performance
    const [todayAttendance, weeklyData, timesheetData, openAnomalies, leaveCount] =
      await Promise.all([
        // Today's attendance
        this.prisma.attendanceDay.findMany({
          where: { userId: { in: userIds }, date: today },
          include: {
            events: true,
            user: { include: { profile: true, presenceSession: true } },
          },
        }),
        // Weekly attendance (last 7 days)
        this.getWeeklyAttendance(userIds, today),
        // Weekly timesheet summary
        this.getWeeklyTimesheet(userIds, today),
        // Open anomalies count
        this.prisma.anomalyEvent.count({
          where: { userId: { in: userIds }, status: AnomalyStatus.Open },
        }),
        // On leave today
        this.prisma.leaveRequest.count({
          where: {
            userId: { in: userIds },
            status: 'Approved',
            startDate: { lte: today },
            endDate: { gte: today },
          },
        }),
      ]);

    // Calculate today's stats
    const checkedInUsers = todayAttendance.filter((d) =>
      d.events.some((e) => e.type === AttendanceEventType.CheckIn),
    );
    const lateUsers = todayAttendance.filter((d) => {
      const checkIn = d.events.find((e) => e.type === AttendanceEventType.CheckIn);
      return checkIn && new Date(checkIn.timestamp) > lateThreshold;
    });

    // Build team status list
    const teamStatus: TeamMemberStatusDto[] = directReports.map((profile) => {
      const attendance = todayAttendance.find((a) => a.userId === profile.userId);
      const checkIn = attendance?.events.find(
        (e) => e.type === AttendanceEventType.CheckIn,
      );
      const checkOut = attendance?.events.find(
        (e) => e.type === AttendanceEventType.CheckOut,
      );
      const isLate = checkIn ? new Date(checkIn.timestamp) > lateThreshold : false;

      return {
        userId: profile.userId,
        userName: `${profile.firstName} ${profile.lastName}`,
        checkInTime: checkIn?.timestamp.toISOString(),
        checkOutTime: checkOut?.timestamp.toISOString(),
        workMode: checkIn?.workMode,
        isLate,
        isAbsent: !checkIn,
        currentProject:
          attendance?.user.presenceSession?.currentProjectId || undefined,
      };
    });

    return {
      teamSize,
      todayStats: {
        checkedIn: checkedInUsers.length,
        late: lateUsers.length,
        absent: teamSize - checkedInUsers.length - leaveCount,
        onLeave: leaveCount,
      },
      weeklyAttendance: weeklyData,
      weeklyTimesheet: timesheetData,
      teamStatus,
      openAnomalies,
    };
  }

  /**
   * Get HR Dashboard - Org-wide data
   */
  async getHRDashboard(companyId: string): Promise<HRDashboardDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active users in company
    const allUsers = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    const userIds = allUsers.map((u) => u.id);
    const orgSize = userIds.length;

    if (orgSize === 0) {
      return this.emptyHRDashboard();
    }

    const lateThreshold = new Date(today);
    lateThreshold.setHours(9, 15, 0, 0);

    // Parallel queries
    const [
      todayAttendance,
      weeklyData,
      anomalySummary,
      leaveCount,
      breakViolations,
      avgCheckInData,
    ] = await Promise.all([
      // Today's attendance
      this.prisma.attendanceDay.findMany({
        where: { userId: { in: userIds }, date: today },
        include: { events: true },
      }),
      // Weekly attendance
      this.getWeeklyAttendance(userIds, today),
      // Anomaly summary
      this.getAnomalySummary(companyId),
      // On leave today
      this.prisma.leaveRequest.count({
        where: {
          userId: { in: userIds },
          status: 'Approved',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      // Break policy violations this week
      this.prisma.anomalyEvent.count({
        where: {
          userId: { in: userIds },
          type: 'ExcessiveBreak',
          detectedAt: { gte: startOfWeek(today) },
        },
      }),
      // Average check-in time this week
      this.getAverageCheckInTime(userIds, today),
    ]);

    // Calculate today's stats
    const checkedIn = todayAttendance.filter((d) =>
      d.events.some((e) => e.type === AttendanceEventType.CheckIn),
    ).length;
    const late = todayAttendance.filter((d) => {
      const checkIn = d.events.find((e) => e.type === AttendanceEventType.CheckIn);
      return checkIn && new Date(checkIn.timestamp) > lateThreshold;
    }).length;

    const absent = orgSize - checkedIn - leaveCount;

    return {
      orgSize,
      todayStats: {
        checkedIn,
        late,
        absent,
        onLeave: leaveCount,
        attendanceRate: Math.round((checkedIn / orgSize) * 100 * 10) / 10,
      },
      weeklyAttendance: weeklyData,
      departmentBreakdown: [], // Can be extended with department data if schema supports it
      anomalySummary,
      complianceMetrics: {
        avgCheckInTime: avgCheckInData,
        latePercentage:
          checkedIn > 0 ? Math.round((late / checkedIn) * 100 * 10) / 10 : 0,
        breakPolicyViolations: breakViolations,
      },
    };
  }

  // Helper methods

  private async getWeeklyAttendance(
    userIds: string[],
    today: Date,
  ): Promise<AttendanceSummaryDto[]> {
    const weekStart = subDays(today, 6);
    const days = eachDayOfInterval({ start: weekStart, end: today });

    const results: AttendanceSummaryDto[] = [];

    for (const day of days) {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);

      const dayLateThreshold = new Date(dayStart);
      dayLateThreshold.setHours(9, 15, 0, 0);

      const [attendance, leaveCount] = await Promise.all([
        this.prisma.attendanceDay.findMany({
          where: { userId: { in: userIds }, date: dayStart },
          include: { events: true },
        }),
        this.prisma.leaveRequest.count({
          where: {
            userId: { in: userIds },
            status: 'Approved',
            startDate: { lte: dayStart },
            endDate: { gte: dayStart },
          },
        }),
      ]);

      const checkedIn = attendance.filter((d) =>
        d.events.some((e) => e.type === AttendanceEventType.CheckIn),
      ).length;

      const late = attendance.filter((d) => {
        const checkIn = d.events.find((e) => e.type === AttendanceEventType.CheckIn);
        return checkIn && new Date(checkIn.timestamp) > dayLateThreshold;
      }).length;

      results.push({
        date: format(day, 'yyyy-MM-dd'),
        checkedIn,
        late,
        absent: userIds.length - checkedIn - leaveCount,
        onLeave: leaveCount,
      });
    }

    return results;
  }

  private async getWeeklyTimesheet(
    userIds: string[],
    today: Date,
  ): Promise<TimesheetSummaryDto[]> {
    const weekStart = subDays(today, 6);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: weekStart, lte: today },
      },
      include: { project: true },
    });

    // Group by project
    const byProject = entries.reduce(
      (acc, e) => {
        if (!acc[e.projectId]) {
          acc[e.projectId] = {
            projectId: e.projectId,
            projectName: e.project.name,
            totalMinutes: 0,
            entryCount: 0,
          };
        }
        acc[e.projectId].totalMinutes += e.minutes;
        acc[e.projectId].entryCount += 1;
        return acc;
      },
      {} as Record<string, TimesheetSummaryDto>,
    );

    return Object.values(byProject).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }

  private async getAnomalySummary(companyId: string) {
    const anomalies = await this.prisma.anomalyEvent.findMany({
      where: { user: { companyId } },
      select: { status: true, type: true, severity: true },
    });

    const open = anomalies.filter((a) => a.status === AnomalyStatus.Open).length;
    const acknowledged = anomalies.filter(
      (a) => a.status === AnomalyStatus.Acknowledged,
    ).length;

    const byType = Object.entries(
      anomalies.reduce(
        (acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([type, count]) => ({ type, count }));

    const bySeverity = Object.entries(
      anomalies.reduce(
        (acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).map(([severity, count]) => ({ severity, count }));

    return { open, acknowledged, byType, bySeverity };
  }

  private async getAverageCheckInTime(
    userIds: string[],
    today: Date,
  ): Promise<string | null> {
    const weekStart = subDays(today, 6);

    const checkIns = await this.prisma.attendanceEvent.findMany({
      where: {
        type: AttendanceEventType.CheckIn,
        attendanceDay: {
          userId: { in: userIds },
          date: { gte: weekStart, lte: today },
        },
      },
      select: { timestamp: true },
    });

    if (checkIns.length === 0) return null;

    const totalMinutes = checkIns.reduce((sum, c) => {
      const d = new Date(c.timestamp);
      return sum + d.getHours() * 60 + d.getMinutes();
    }, 0);

    const avgMinutes = Math.round(totalMinutes / checkIns.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private emptyManagerDashboard(): ManagerDashboardDto {
    return {
      teamSize: 0,
      todayStats: { checkedIn: 0, late: 0, absent: 0, onLeave: 0 },
      weeklyAttendance: [],
      weeklyTimesheet: [],
      teamStatus: [],
      openAnomalies: 0,
    };
  }

  private emptyHRDashboard(): HRDashboardDto {
    return {
      orgSize: 0,
      todayStats: { checkedIn: 0, late: 0, absent: 0, onLeave: 0, attendanceRate: 0 },
      weeklyAttendance: [],
      departmentBreakdown: [],
      anomalySummary: { open: 0, acknowledged: 0, byType: [], bySeverity: [] },
      complianceMetrics: {
        avgCheckInTime: null,
        latePercentage: 0,
        breakPolicyViolations: 0,
      },
    };
  }
}
