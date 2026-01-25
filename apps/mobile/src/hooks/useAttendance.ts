/**
 * useAttendance Hook (Mobile)
 *
 * Manages attendance state and API calls for attendance operations.
 * Mirrors the web hook interface but uses the mobile API client
 * (SecureStore auth) for authentication.
 *
 * @module hooks/useAttendance
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Types matching the API response (mirrored from web)
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

/**
 * Attendance management hook
 *
 * Provides all attendance operations with real-time state updates
 * and error handling. Mirrors the web hook interface.
 *
 * @returns Attendance state and action methods
 *
 * @example
 * ```tsx
 * const { attendance, checkIn, checkOut, startBreak, endBreak } = useAttendance();
 *
 * // Check in with GPS coordinates
 * const success = await checkIn('Office', 1.234, 103.456);
 *
 * // Start a break
 * await startBreak('Lunch');
 *
 * // Check out and get summary
 * const summary = await checkOut(1.234, 103.456);
 * ```
 */
export function useAttendance(): UseAttendanceReturn {
  const [attendance, setAttendance] = useState<AttendanceDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Fetch today's attendance from API
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<AttendanceDay>('/attendance/today');

      if (response.success && response.data) {
        setAttendance(response.data);
        setError(null);
      } else {
        setError(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check in with work mode and optional GPS coordinates
   */
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

  /**
   * Check out with optional GPS coordinates
   * Returns checkout summary with work/break time
   */
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

  /**
   * Start a break (Break or Lunch)
   */
  const startBreak = useCallback(
    async (type: BreakType): Promise<boolean> => {
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
    },
    [refresh]
  );

  /**
   * End the current active break
   */
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

  // Initial fetch on mount
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
