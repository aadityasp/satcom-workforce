/**
 * usePresence Hook
 *
 * Manages presence WebSocket connection and team data fetching.
 * Auto-connects on mount when user is authenticated.
 *
 * @module hooks/usePresence
 */

import { useEffect, useCallback } from 'react';
import {
  usePresenceStore,
  useFilteredTeamMembers,
  type PresenceStatus,
  type TeamMember,
} from '../store/presence';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../lib/api';

interface UsePresenceReturn {
  teamMembers: TeamMember[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  statusFilter: PresenceStatus | null;
  setStatusFilter: (status: PresenceStatus | null) => void;
  refresh: () => Promise<void>;
}

interface PresenceListResponse {
  users: TeamMember[];
}

/**
 * Hook for presence management with auto-connect
 *
 * - Connects to WebSocket on mount when authenticated
 * - Fetches initial team data from API
 * - Provides filtered team members based on status
 * - Supports pull-to-refresh for manual data reload
 */
export function usePresence(): UsePresenceReturn {
  const { accessToken } = useAuthStore();
  const connect = usePresenceStore((s) => s.connect);
  const setTeamMembers = usePresenceStore((s) => s.setTeamMembers);
  const setIsLoading = usePresenceStore((s) => s.setIsLoading);
  const isLoading = usePresenceStore((s) => s.isLoading);
  const isConnected = usePresenceStore((s) => s.isConnected);
  const connectionError = usePresenceStore((s) => s.connectionError);
  const statusFilter = usePresenceStore((s) => s.statusFilter);
  const setStatusFilter = usePresenceStore((s) => s.setStatusFilter);

  // Get filtered team members via selector
  const filteredMembers = useFilteredTeamMembers();

  /**
   * Fetch team data from API - uses /presence/list endpoint
   */
  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<PresenceListResponse>('/presence/list');
      if (response.success && response.data) {
        setTeamMembers(response.data.users || []);
      }
    } catch (error) {
      console.error('[usePresence] Failed to fetch team:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setTeamMembers, setIsLoading]);

  /**
   * Connect to WebSocket and fetch initial team data
   */
  useEffect(() => {
    if (accessToken) {
      // Connect to WebSocket
      connect(accessToken);

      // Fetch initial team data
      fetchTeam();
    }
    // Don't disconnect on unmount - keep socket alive for app
    // Cleanup happens in store.disconnect() when needed
  }, [accessToken, connect, fetchTeam]);

  /**
   * Refresh function for pull-to-refresh
   */
  const refresh = useCallback(async () => {
    await fetchTeam();
  }, [fetchTeam]);

  return {
    teamMembers: filteredMembers,
    isLoading,
    isConnected,
    error: connectionError,
    statusFilter,
    setStatusFilter,
    refresh,
  };
}

export default usePresence;
