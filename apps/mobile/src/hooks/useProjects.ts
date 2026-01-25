/**
 * useProjects Hook
 *
 * Fetches active projects with their tasks for timesheet selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

/**
 * Task within a project
 */
export interface Task {
  id: string;
  name: string;
  code: string;
}

/**
 * Project with associated tasks
 */
export interface Project {
  id: string;
  name: string;
  code: string;
  tasks: Task[];
}

/**
 * Return type for useProjects hook
 */
export interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching active projects with their tasks
 *
 * Fetches from GET /timesheets/projects which returns
 * active projects with active tasks for the user's company.
 */
export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<Project[]>('/timesheets/projects');

      if (response.success && response.data) {
        // Filter to only include projects that have at least one task
        const projectsWithTasks = response.data.filter(
          (project) => project.tasks && project.tasks.length > 0
        );
        setProjects(projectsWithTasks);
      } else {
        setError(response.error?.message || 'Failed to load projects');
      }
    } catch (err) {
      setError('Network error loading projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refresh: fetchProjects,
  };
}
