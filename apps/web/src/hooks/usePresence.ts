'use client';

/**
 * usePresence Hook
 *
 * Manages presence connection and provides team member data.
 * Handles initial data fetch and WebSocket lifecycle.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePresenceStore, useFilteredTeamMembers, useUniqueDepartments, TeamMember, PresenceStatus } from '@/store/presence';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

interface UsePresenceReturn {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Team data
  teamMembers: TeamMember[];
  filteredMembers: TeamMember[];
  departments: string[];
  isLoading: boolean;

  // Filters
  statusFilter: PresenceStatus | null;
  departmentFilter: string | null;
  setStatusFilter: (status: PresenceStatus | null) => void;
  setDepartmentFilter: (department: string | null) => void;

  // Actions
  refresh: () => Promise<void>;
  setActivity: (projectId: string, taskId?: string) => void;
  postStatus: (message: string) => void;
  clearStatus: () => void;
}

export function usePresence(): UsePresenceReturn {
  const { accessToken } = useAuthStore();
  const {
    socket,
    isConnected,
    connectionError,
    teamMembers,
    isLoading,
    statusFilter,
    departmentFilter,
    connect,
    setTeamMembers,
    setStatusFilter,
    setDepartmentFilter,
    setActivity,
    postStatus,
    clearStatus,
  } = usePresenceStore();

  const filteredMembers = useFilteredTeamMembers();
  const departments = useUniqueDepartments();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial team list
  const refresh = useCallback(async () => {
    try {
      usePresenceStore.setState({ isLoading: true });
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await api.get<{ users: TeamMember[] }>(
        `/presence/list${params.toString() ? `?${params.toString()}` : ''}`
      );

      if (response.success && response.data) {
        setTeamMembers(response.data.users);
      }
    } catch (error) {
      console.error('[usePresence] Failed to fetch team list:', error);
    } finally {
      usePresenceStore.setState({ isLoading: false });
    }
  }, [statusFilter, departmentFilter, setTeamMembers]);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (accessToken && !socket) {
      connect(accessToken);
    }

    return () => {
      // Don't disconnect on unmount - let store persist
      // disconnect() would be called here if we want to cleanup
    };
  }, [accessToken, socket, connect]);

  // Fetch initial data when connected, or immediately if not connected (REST fallback)
  useEffect(() => {
    if (isConnected) {
      refresh();
    } else {
      // If WebSocket is not connected, fetch via REST API as fallback
      const timer = setTimeout(() => {
        if (!isConnected) {
          refresh();
        }
      }, 1000); // Wait 1 second for WebSocket to connect, then fallback to REST
      return () => clearTimeout(timer);
    }
  }, [isConnected, refresh]);

  // Heartbeat every 30 seconds (with GPS if available)
  useEffect(() => {
    if (!isConnected) return;

    const sendHeartbeat = () => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            usePresenceStore.getState().sendHeartbeat({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {
            // GPS not available, send heartbeat without location
            usePresenceStore.getState().sendHeartbeat();
          },
          { timeout: 5000, maximumAge: 60000 }
        );
      } else {
        usePresenceStore.getState().sendHeartbeat();
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    heartbeatInterval.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [isConnected]);

  // Refetch when filters change (but not on initial mount)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Always refresh when filters change, regardless of WebSocket connection
    refresh();
  }, [statusFilter, departmentFilter, refresh]);

  return {
    isConnected,
    connectionError,
    teamMembers,
    filteredMembers,
    departments,
    isLoading,
    statusFilter,
    departmentFilter,
    setStatusFilter,
    setDepartmentFilter,
    refresh,
    setActivity,
    postStatus,
    clearStatus,
  };
}
