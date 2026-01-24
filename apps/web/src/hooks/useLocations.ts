'use client';

/**
 * useLocations Hook
 *
 * Manages office location state and API calls for admin location management.
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

// Types
export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {
  isActive?: boolean;
}

interface UseLocationsReturn {
  // State
  locations: OfficeLocation[];
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;

  // Actions
  fetchLocations: (includeInactive?: boolean) => Promise<void>;
  createLocation: (data: CreateLocationInput) => Promise<boolean>;
  updateLocation: (id: string, data: UpdateLocationInput) => Promise<boolean>;
  deleteLocation: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useLocations(): UseLocationsReturn {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchLocations = useCallback(async (includeInactive = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<OfficeLocation[]>(
        `/locations?includeInactive=${includeInactive}`
      );
      if (response.success && response.data) {
        setLocations(response.data);
      } else {
        setError(response.error?.message || 'Failed to load locations');
      }
    } catch (err) {
      setError('Network error while loading locations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLocation = useCallback(async (data: CreateLocationInput): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.post('/locations', data);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to create location');
        return false;
      }
    } catch (err) {
      setError('Network error while creating location');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const updateLocation = useCallback(async (id: string, data: UpdateLocationInput): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.patch(`/locations/${id}`, data);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to update location');
        return false;
      }
    } catch (err) {
      setError('Network error while updating location');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const deleteLocation = useCallback(async (id: string): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.delete(`/locations/${id}`);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to deactivate location');
        return false;
      }
    } catch (err) {
      setError('Network error while deactivating location');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  return {
    locations,
    isLoading,
    isActionLoading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    clearError,
  };
}
