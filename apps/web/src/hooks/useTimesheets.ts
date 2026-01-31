'use client';

/**
 * useTimesheets Hook
 *
 * Manages timesheet state and API calls for timesheet operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// Types
export interface Project {
  id: string;
  name: string;
  code: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  code: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface TimesheetEntry {
  id: string;
  date: string;
  projectId: string;
  taskId?: string;
  minutes: number;
  notes?: string;
  project: Project;
  task?: Task;
  attachments: Attachment[];
  createdAt: string;
}

export interface CreateTimesheetDto {
  date: string;
  projectId: string;
  taskId?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  attachmentKeys?: string[];
}

export interface TimesheetSummary {
  totalMinutes: number;
  byProject: { projectId: string; projectName: string; minutes: number }[];
  byDate: { date: string; minutes: number }[];
}

interface UseTimesheetsReturn {
  // State
  entries: TimesheetEntry[];
  projects: Project[];
  summary: TimesheetSummary | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;

  // Actions
  fetchEntries: (startDate: string, endDate: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchSummary: (startDate: string, endDate: string) => Promise<void>;
  createEntry: (data: CreateTimesheetDto) => Promise<boolean>;
  updateEntry: (id: string, data: Partial<CreateTimesheetDto>) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  getUploadUrl: (fileName: string, contentType: string) => Promise<{ uploadUrl: string; objectKey: string } | null>;
  clearError: () => void;
}

export function useTimesheets(): UseTimesheetsReturn {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get<Project[]>('/timesheets/projects');
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err) {
      setError('Failed to load projects');
    }
  }, []);

  const fetchEntries = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const response = await api.get<{ data: TimesheetEntry[] }>(
        `/timesheets?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.success && response.data) {
        setEntries(response.data.data);
      }
    } catch (err) {
      setError('Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (startDate: string, endDate: string) => {
    try {
      const response = await api.get<TimesheetSummary>(
        `/timesheets/summary?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err) {
      setError('Failed to load summary');
    }
  }, []);

  const createEntry = useCallback(async (data: CreateTimesheetDto): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.post('/timesheets', data);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to create entry');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const updateEntry = useCallback(async (id: string, data: Partial<CreateTimesheetDto>): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.patch(`/timesheets/${id}`, data);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to update entry');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    setIsActionLoading(true);
    setError(null);
    try {
      const response = await api.delete(`/timesheets/${id}`);
      if (response.success) {
        return true;
      } else {
        setError(response.error?.message || 'Failed to delete entry');
        return false;
      }
    } catch (err) {
      setError('Network error');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const getUploadUrl = useCallback(async (fileName: string, contentType: string) => {
    try {
      const response = await api.get<{ uploadUrl: string; objectKey: string }>(
        `/storage/upload-url?folder=timesheets&fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      setError('Failed to get upload URL');
      return null;
    }
  }, []);

  // Initial load of projects
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    entries,
    projects,
    summary,
    isLoading,
    isActionLoading,
    error,
    fetchEntries,
    fetchProjects,
    fetchSummary,
    createEntry,
    updateEntry,
    deleteEntry,
    getUploadUrl,
    clearError,
  };
}
