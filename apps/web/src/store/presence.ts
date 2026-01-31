/**
 * Presence Store
 *
 * Manages real-time presence state using Zustand with Socket.IO integration.
 * Handles WebSocket connection, team member state, and real-time updates.
 */

'use client';

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// Types
export type PresenceStatus = 'Online' | 'Away' | 'Offline' | 'Busy';

export interface TeamMember {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
  currentWorkMode?: string;
  statusMessage?: string;
  statusUpdatedAt?: string;
  currentProject?: {
    id: string;
    name: string;
    code: string;
  } | null;
  currentTask?: {
    id: string;
    name: string;
    code: string;
  } | null;
  profile?: {
    firstName: string;
    lastName: string;
    designation: string;
    department?: string;
    avatarUrl?: string;
  } | null;
}

interface PresenceState {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;

  // Team data
  teamMembers: TeamMember[];
  isLoading: boolean;

  // Filters
  statusFilter: PresenceStatus | null;
  departmentFilter: string | null;

  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setStatusFilter: (status: PresenceStatus | null) => void;
  setDepartmentFilter: (department: string | null) => void;

  // Socket actions
  sendHeartbeat: (data?: { projectId?: string; taskId?: string; latitude?: number; longitude?: number }) => void;
  setActivity: (projectId: string, taskId?: string) => void;
  postStatus: (message: string) => void;
  clearStatus: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Socket.IO needs the base URL without /api/v1 path
const SOCKET_URL = API_URL.replace(/\/api\/v\d+$/, '');

export const usePresenceStore = create<PresenceState>((set, get) => ({
  // Initial state
  socket: null,
  isConnected: false,
  connectionError: null,
  teamMembers: [],
  isLoading: false,
  statusFilter: null,
  departmentFilter: null,

  connect: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      return; // Already connected
    }

    // Disconnect existing socket if any
    existingSocket?.disconnect();

    const socket = io(`${SOCKET_URL}/presence`, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[Presence] Connected to server');
      set({ isConnected: true, connectionError: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Presence] Disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('[Presence] Connection error:', error.message);
      set({ connectionError: error.message, isConnected: false });
    });

    // Presence events
    socket.on('user:online', (data: { userId: string; timestamp: string }) => {
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.userId === data.userId
            ? { ...m, status: 'Online' as PresenceStatus, lastSeenAt: data.timestamp }
            : m
        ),
      }));
    });

    socket.on('user:offline', (data: { userId: string; timestamp: string }) => {
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.userId === data.userId
            ? { ...m, status: 'Offline' as PresenceStatus, lastSeenAt: data.timestamp }
            : m
        ),
      }));
    });

    socket.on('presence:update', (data: {
      userId: string;
      status: PresenceStatus;
      lastSeenAt: string;
      currentProjectId?: string;
      currentTaskId?: string;
    }) => {
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.userId === data.userId
            ? {
                ...m,
                status: data.status,
                lastSeenAt: data.lastSeenAt,
              }
            : m
        ),
      }));
    });

    socket.on('activity:changed', (data: {
      userId: string;
      projectId?: string;
      taskId?: string;
      timestamp: string;
    }) => {
      // Will need to refetch to get project/task names, or store can be updated with IDs
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.userId === data.userId
            ? {
                ...m,
                currentProject: data.projectId ? { id: data.projectId, name: '', code: '' } : null,
                currentTask: data.taskId ? { id: data.taskId, name: '', code: '' } : null,
              }
            : m
        ),
      }));
    });

    socket.on('status:updated', (data: {
      userId: string;
      statusMessage: string | null;
      statusUpdatedAt: string | null;
    }) => {
      set((state) => ({
        teamMembers: state.teamMembers.map((m) =>
          m.userId === data.userId
            ? {
                ...m,
                statusMessage: data.statusMessage || undefined,
                statusUpdatedAt: data.statusUpdatedAt || undefined,
              }
            : m
        ),
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  setTeamMembers: (members: TeamMember[]) => {
    set({ teamMembers: members });
  },

  setStatusFilter: (status: PresenceStatus | null) => {
    set({ statusFilter: status });
  },

  setDepartmentFilter: (department: string | null) => {
    set({ departmentFilter: department });
  },

  // Socket emit actions
  sendHeartbeat: (data = {}) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('presence:heartbeat', data);
    }
  },

  setActivity: (projectId: string, taskId?: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('activity:set', { projectId, taskId });
    }
  },

  postStatus: (message: string) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('status:post', { message });
    }
  },

  clearStatus: () => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('status:clear', {});
    }
  },
}));

// Selector for filtered team members
export const useFilteredTeamMembers = () => {
  return usePresenceStore((state) => {
    let members = state.teamMembers;

    if (state.statusFilter) {
      members = members.filter((m) => m.status === state.statusFilter);
    }

    if (state.departmentFilter) {
      members = members.filter((m) => m.profile?.department === state.departmentFilter);
    }

    return members;
  });
};

// Selector for unique departments
export const useUniqueDepartments = () => {
  return usePresenceStore((state) => {
    const departments = new Set<string>();
    state.teamMembers.forEach((m) => {
      if (m.profile?.department) {
        departments.add(m.profile.department);
      }
    });
    return Array.from(departments).sort();
  });
};
