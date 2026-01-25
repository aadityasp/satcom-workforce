'use client';

/**
 * useReports Hook
 *
 * Data fetching hooks for Manager and HR dashboards.
 * Uses single API call per dashboard for consistent data.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// Types matching backend DTOs
export interface AttendanceSummary {
  date: string;
  checkedIn: number;
  late: number;
  absent: number;
  onLeave: number;
}

export interface TimesheetSummary {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  entryCount: number;
}

export interface TeamMemberStatus {
  userId: string;
  userName: string;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: string;
  isLate: boolean;
  isAbsent: boolean;
  currentProject?: string;
}

export interface ManagerDashboard {
  teamSize: number;
  todayStats: {
    checkedIn: number;
    late: number;
    absent: number;
    onLeave: number;
  };
  weeklyAttendance: AttendanceSummary[];
  weeklyTimesheet: TimesheetSummary[];
  teamStatus: TeamMemberStatus[];
  openAnomalies: number;
}

export interface HRDashboard {
  orgSize: number;
  todayStats: {
    checkedIn: number;
    late: number;
    absent: number;
    onLeave: number;
    attendanceRate: number;
  };
  weeklyAttendance: AttendanceSummary[];
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

/**
 * Hook for Manager Dashboard
 */
export function useManagerDashboard() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<ManagerDashboard>('/reports/dashboard/manager');
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Manager dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, isLoading, error, refetch: fetchDashboard };
}

/**
 * Hook for HR Dashboard
 */
export function useHRDashboard() {
  const [data, setData] = useState<HRDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<HRDashboard>('/reports/dashboard/hr');
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('HR dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, isLoading, error, refetch: fetchDashboard };
}
