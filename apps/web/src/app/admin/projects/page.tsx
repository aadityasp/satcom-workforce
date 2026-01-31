'use client';

/**
 * Admin Projects Page
 *
 * SuperAdmin-only page for managing projects and tasks.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FolderOpen, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Task {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  tasks: Task[];
  manager?: {
    profile: { firstName: string; lastName: string };
  };
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'SuperAdmin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Project[]>(`/admin/projects?includeInactive=${showInactive}`);
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (confirm('Deactivate this project? It will be hidden from timesheet selection.')) {
      await api.delete(`/admin/projects/${projectId}`);
      fetchProjects();
    }
  }, [fetchProjects]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (confirm('Deactivate this task?')) {
      await api.delete(`/admin/projects/tasks/${taskId}`);
      fetchProjects();
    }
  }, [fetchProjects]);

  if (user?.role !== 'SuperAdmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Manage Projects</h1>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-silver-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-silver-300"
            />
            Show inactive
          </label>
        </div>

        {/* Projects list */}
        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-silver-200 p-4 animate-pulse">
                <div className="h-5 bg-silver-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-silver-100 rounded w-1/4" />
              </div>
            ))
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-silver-200 p-8 text-center">
              <FolderOpen size={32} className="mx-auto text-silver-300 mb-2" />
              <p className="text-silver-500">No projects yet</p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`bg-white rounded-xl border border-silver-200 overflow-hidden ${
                  !project.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Project header */}
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {expandedProject === project.id ? (
                      <ChevronDown size={20} className="text-silver-400" />
                    ) : (
                      <ChevronRight size={20} className="text-silver-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy-900">{project.name}</span>
                        <span className="text-xs text-silver-500 bg-silver-100 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                        {!project.isActive && (
                          <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-silver-500">
                        {project.tasks.filter((t) => t.isActive).length} active tasks
                        {project.manager && ` • ${project.manager.profile.firstName} ${project.manager.profile.lastName}`}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-silver-100 rounded-lg text-silver-500">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Tasks list (expanded) */}
                {expandedProject === project.id && (
                  <div className="border-t border-silver-100 bg-silver-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-silver-600">Tasks</h4>
                      <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Plus size={14} /> Add Task
                      </button>
                    </div>
                    {project.tasks.length === 0 ? (
                      <p className="text-sm text-silver-400 text-center py-4">No tasks defined</p>
                    ) : (
                      <div className="space-y-2">
                        {project.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between p-3 bg-white rounded-lg ${
                              !task.isActive ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-navy-900">{task.name}</span>
                              <span className="text-xs text-silver-500">{task.code}</span>
                              {!task.isActive && (
                                <span className="text-xs text-red-500">Inactive</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 hover:bg-silver-100 rounded text-silver-500">
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
