/**
 * useCheckInLocations Hook
 *
 * React Query hook for fetching check-in locations for map visualization.
 * Used by Super Admin to view employee check-in locations on a map.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CheckInLocation {
  id: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  workMode: string;
  verificationStatus: string;
}

interface UseCheckInLocationsOptions {
  startDate: Date;
  endDate: Date;
}

interface CheckInLocationsResponse {
  success: boolean;
  data?: CheckInLocation[];
}

export function useCheckInLocations(options: UseCheckInLocationsOptions) {
  return useQuery({
    queryKey: [
      'check-in-locations',
      options.startDate.toISOString(),
      options.endDate.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
      });
      const response = await api.get<CheckInLocation[]>(
        `/attendance/locations?${params}`,
      );

      if (!response.success) {
        throw new Error('Failed to fetch check-in locations');
      }

      return response.data || [];
    },
    staleTime: 30000, // 30 seconds
  });
}
