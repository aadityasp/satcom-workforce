/**
 * useTimesheets Hook
 *
 * Manages timesheet entries: fetching, creating, and calculating totals.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { api } from '../lib/api';

/**
 * Project info embedded in timesheet entry
 */
export interface TimesheetProject {
  id: string;
  name: string;
  code: string;
}

/**
 * Task info embedded in timesheet entry
 */
export interface TimesheetTask {
  id: string;
  name: string;
  code: string;
}

/**
 * Timesheet entry from API
 */
export interface TimesheetEntry {
  id: string;
  date: string;
  projectId: string;
  taskId?: string;
  minutes: number;
  notes?: string;
  project: TimesheetProject;
  task?: TimesheetTask;
  createdAt: string;
}

/**
 * Input for creating a timesheet entry
 */
export interface CreateTimesheetInput {
  date: string;
  projectId: string;
  taskId: string;
  hours: number;
  minutes: number;
  notes?: string;
}

/**
 * Time total as hours and minutes
 */
export interface TimeTotal {
  hours: number;
  minutes: number;
}

/**
 * Return type for useTimesheets hook
 */
export interface UseTimesheetsReturn {
  entries: TimesheetEntry[];
  dayTotal: TimeTotal;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Return type for useCreateTimesheet hook
 */
export interface UseCreateTimesheetReturn {
  create: (input: CreateTimesheetInput) => Promise<boolean>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Convert total minutes to hours and minutes
 */
function minutesToTime(totalMinutes: number): TimeTotal {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Hook for fetching timesheet entries for a specific date
 *
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 */
export function useTimesheets(date?: string): UseTimesheetsReturn {
  const targetDate = date || getTodayDate();

  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch entries for the single date (startDate = endDate)
      const response = await api.get<{ data: TimesheetEntry[]; meta: unknown }>(
        `/timesheets?startDate=${targetDate}&endDate=${targetDate}`
      );

      if (response.success && response.data) {
        setEntries(response.data.data || []);
      } else {
        setError(response.error?.message || 'Failed to load entries');
        setEntries([]);
      }
    } catch (err) {
      setError('Network error loading entries');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate]);

  // Fetch when date changes
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Calculate day total from entries
  const dayTotal = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    return minutesToTime(totalMinutes);
  }, [entries]);

  return {
    entries,
    dayTotal,
    isLoading,
    error,
    refresh: fetchEntries,
  };
}

/**
 * Hook for creating new timesheet entries
 */
export function useCreateTimesheet(): UseCreateTimesheetReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const create = useCallback(async (input: CreateTimesheetInput): Promise<boolean> => {
    setIsCreating(true);
    setError(null);

    try {
      // Convert hours/minutes to start/end times for the API
      // The API expects startTime and endTime as ISO datetime strings
      const totalMinutes = input.hours * 60 + input.minutes;

      // Use a fixed start time (9:00 AM) and calculate end time
      const baseDate = new Date(input.date);
      const startTime = new Date(baseDate);
      startTime.setHours(9, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + totalMinutes);

      const payload = {
        date: input.date,
        projectId: input.projectId,
        taskId: input.taskId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: input.notes,
      };

      const response = await api.post('/timesheets', payload);

      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to create entry');
        return false;
      }
    } catch (err) {
      setError('Network error creating entry');
      return false;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    create,
    isCreating,
    error,
    clearError,
  };
}

