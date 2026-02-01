/**
 * useRecentActivity Hook
 *
 * Fetches recent user activity (attendance, timesheets) for the dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { api } from '../lib/api';

export interface ActivityItem {
  id: string;
  type: 'checkin' | 'checkout' | 'break' | 'timesheet' | 'anomaly';
  title: string;
  timestamp: Date;
  color: 'success' | 'info' | 'warning' | 'error';
}

interface AttendanceEvent {
  id: string;
  type: string;
  timestamp: string;
  location?: { name: string } | null;
}

interface UseRecentActivityReturn {
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Map attendance event type to display info
 */
function mapAttendanceEvent(event: AttendanceEvent): ActivityItem {
  const locationName = event.location?.name || 'Office';

  switch (event.type) {
    case 'CHECK_IN':
      return {
        id: event.id,
        type: 'checkin',
        title: `Checked in at ${locationName}`,
        timestamp: new Date(event.timestamp),
        color: 'success',
      };
    case 'CHECK_OUT':
      return {
        id: event.id,
        type: 'checkout',
        title: `Checked out from ${locationName}`,
        timestamp: new Date(event.timestamp),
        color: 'info',
      };
    case 'BREAK_START':
      return {
        id: event.id,
        type: 'break',
        title: 'Started break',
        timestamp: new Date(event.timestamp),
        color: 'info',
      };
    case 'BREAK_END':
      return {
        id: event.id,
        type: 'break',
        title: 'Ended break',
        timestamp: new Date(event.timestamp),
        color: 'info',
      };
    default:
      return {
        id: event.id,
        type: 'checkin',
        title: event.type.replace(/_/g, ' ').toLowerCase(),
        timestamp: new Date(event.timestamp),
        color: 'info',
      };
  }
}

/**
 * Hook for fetching recent activity
 */
export function useRecentActivity(): UseRecentActivityReturn {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const response = await api.get<AttendanceEvent[]>(
        `/attendance?startDate=${startDate}&endDate=${endDate}&limit=10`
      );

      if (response.success && response.data) {
        const rawData = Array.isArray(response.data) ? response.data : [];
        const mapped = rawData
          .map(mapAttendanceEvent)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);
        setActivities(mapped);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setError('Failed to load activity');
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return {
    activities,
    isLoading,
    error,
    refresh: fetchActivity,
  };
}

export default useRecentActivity;
