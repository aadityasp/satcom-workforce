/**
 * Dashboard Response DTOs
 * Role-specific dashboard data structures
 */

// Common types
export interface AttendanceSummaryDto {
  date: string;
  checkedIn: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface TimesheetSummaryDto {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  entryCount: number;
}

export interface TeamMemberStatusDto {
  userId: string;
  userName: string;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: string;
  isLate: boolean;
  isAbsent: boolean;
  currentProject?: string;
}

// Manager Dashboard Response
export interface ManagerDashboardDto {
  teamSize: number;
  todayStats: {
    checkedIn: number;
    late: number;
    absent: number;
    onLeave: number;
  };
  weeklyAttendance: AttendanceSummaryDto[];
  weeklyTimesheet: TimesheetSummaryDto[];
  teamStatus: TeamMemberStatusDto[];
  openAnomalies: number;
}

// HR Dashboard Response
export interface HRDashboardDto {
  orgSize: number;
  todayStats: {
    checkedIn: number;
    late: number;
    absent: number;
    onLeave: number;
    attendanceRate: number;
  };
  weeklyAttendance: AttendanceSummaryDto[];
  departmentBreakdown: {
    department: string;
    checkedIn: number;
    total: number;
  }[];
  anomalySummary: {
    open: number;
    acknowledged: number;
    byType: { type: string; count: number }[];
    bySeverity: { severity: string; count: number }[];
  };
  complianceMetrics: {
    avgCheckInTime: string | null;
    latePercentage: number;
    breakPolicyViolations: number;
  };
}
