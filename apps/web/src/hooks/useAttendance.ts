'use client';

/**
 * useAttendance Hook
 *
 * Manages attendance state and API calls for attendance operations.
 * Provides real-time state updates and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// Types matching the API response
export type AttendanceStatus = 'not_checked_in' | 'working' | 'on_break' | 'checked_out';

export type WorkMode = 'Office' | 'Remote' | 'CustomerSite' | 'FieldVisit' | 'Travel';

export type BreakType = 'Break' | 'Lunch';

export interface AttendanceEvent {
  id: string;
  type: 'CheckIn' | 'CheckOut';
  timestamp: string;
  workMode: WorkMode;
  latitude?: number;
  longitude?: number;
  verificationStatus: string;
  notes?: string;
  isOverride: boolean;
}

export interface BreakSegment {
  id: string;
  type: BreakType;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface CurrentBreak {
  id: string;
  type: BreakType;
  startTime: string;
}

export interface WorkPolicy {
  breakDurationMinutes: number;
  lunchDurationMinutes: number;
  overtimeThresholdMinutes: number;
  maxOvertimeMinutes: number;
  standardWorkHours: number;
}

export interface AttendanceDay {
  id?: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  workMode?: WorkMode;
  currentBreak?: CurrentBreak;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalLunchMinutes: number;
  overtimeMinutes: number;
  events: AttendanceEvent[];
  breaks: BreakSegment[];
  policy: WorkPolicy;
}

export interface CheckOutSummary {
  workedMinutes: number;
  breakMinutes: number;
  overtime: number;
}

interface UseAttendanceReturn {
  // State
  attendance: AttendanceDay | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  checkIn: (workMode: WorkMode, latitude?: number, longitude?: number) => Promise<boolean>;
  checkOut: (latitude?: number, longitude?: number) => Promise<CheckOutSummary | null>;
  startBreak: (type: BreakType) => Promise<boolean>;
  endBreak: () => Promise<boolean>;
  clearError: () => void;
}

export function useAttendance(): UseAttendanceReturn {
  const [attendance, setAttendance] = useState<AttendanceDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<AttendanceDay>('/attendance/today');

      if (response.success && response.data) {
        setAttendance(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkIn = useCallback(
    async (workMode: WorkMode, latitude?: number, longitude?: number): Promise<boolean> => {
      setIsActionLoading(true);
      setError(null);
      try {
        const response = await api.post<{ event: AttendanceEvent; attendanceDay: AttendanceDay }>(
          '/attendance/check-in',
          { workMode, latitude: latitude || 0, longitude: longitude || 0 }
        );

        if (response.success && response.data) {
          setAttendance(response.data.attendanceDay);
          return true;
        } else {
          setError(response.error?.message || 'Check-in failed');
          return false;
        }
      } catch (err) {
        setError('Network error. Please try again.');
        return false;
      } finally {
        setIsActionLoading(false);
      }
    },
    []
  );

  const checkOut = useCallback(
    async (latitude?: number, longitude?: number): Promise<CheckOutSummary | null> => {
      setIsActionLoading(true);
      setError(null);
      try {
        const response = await api.post<{
          event: AttendanceEvent;
          attendanceDay: AttendanceDay;
          summary: CheckOutSummary;
        }>('/attendance/check-out', { latitude: latitude || 0, longitude: longitude || 0 });

        if (response.success && response.data) {
          setAttendance(response.data.attendanceDay);
          return response.data.summary;
        } else {
          setError(response.error?.message || 'Check-out failed');
          return null;
        }
      } catch (err) {
        setError('Network error. Please try again.');
        return null;
      } finally {
        setIsActionLoading(false);
      }
    },
    []
  );

  const startBreak = useCallback(async (type: BreakType): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.post<BreakSegment>('/attendance/break/start', { type });

      if (response.success) {
        await refresh();
        return true;
      } else {
        setError(response.error?.message || 'Failed to start break');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, [refresh]);

  const endBreak = useCallback(async (): Promise<boolean> => {
    if (!attendance?.currentBreak?.id) {
      setError('No active break to end');
      return false;
    }

    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.post(`/attendance/break/${attendance.currentBreak.id}/end`, {});

      if (response.success) {
        await refresh();
        return true;
      } else {
        setError(response.error?.message || 'Failed to end break');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, [attendance?.currentBreak?.id, refresh]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    attendance,
    isLoading,
    isActionLoading,
    error,
    refresh,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
    clearError,
  };
}
