'use client';

/**
 * Admin Projects Page
 *
 * SuperAdmin-only page for managing projects and tasks.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FolderOpen, Edit2, Trash2, ChevronDown, ChevronRight, X, Loader2 } from 'lucide-react';
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

interface ProjectFormData {
  name: string;
  code: string;
  description: string;
}

interface TaskFormData {
  projectId: string;
  name: string;
  code: string;
  description: string;
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormData>({ name: '', code: '', description: '' });
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskParentProjectId, setTaskParentProjectId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>({ projectId: '', name: '', code: '', description: '' });
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);

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

  // --- Project modal handlers ---

  const openCreateProjectModal = () => {
    setEditingProject(null);
    setProjectForm({ name: '', code: '', description: '' });
    setProjectFormError(null);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setProjectForm({ name: project.name, code: project.code, description: project.description || '' });
    setProjectFormError(null);
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectFormError(null);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectFormError(null);

    if (!projectForm.name.trim() || !projectForm.code.trim()) {
      setProjectFormError('Name and code are required.');
      return;
    }
    if (projectForm.name.trim().length < 3) {
      setProjectFormError('Project name must be at least 3 characters.');
      return;
    }
    if (projectForm.code.trim().length < 2) {
      setProjectFormError('Project code must be at least 2 characters.');
      return;
    }

    setIsProjectSubmitting(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        code: projectForm.code.trim(),
        description: projectForm.description.trim() || undefined,
      };

      let response;
      if (editingProject) {
        response = await api.patch(`/admin/projects/${editingProject.id}`, payload);
      } else {
        response = await api.post('/admin/projects', payload);
      }

      if (response.success) {
        closeProjectModal();
        fetchProjects();
      } else {
        setProjectFormError(response.error?.message || 'Failed to save project.');
      }
    } catch {
      setProjectFormError('Network error. Please try again.');
    } finally {
      setIsProjectSubmitting(false);
    }
  };

  // --- Task modal handlers ---

  const openCreateTaskModal = (projectId: string) => {
    setEditingTask(null);
    setTaskParentProjectId(projectId);
    setTaskForm({ projectId, name: '', code: '', description: '' });
    setTaskFormError(null);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task, projectId: string) => {
    setEditingTask(task);
    setTaskParentProjectId(projectId);
    setTaskForm({ projectId, name: task.name, code: task.code, description: task.description || '' });
    setTaskFormError(null);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTaskParentProjectId(null);
    setTaskFormError(null);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError(null);

    if (!taskForm.name.trim() || !taskForm.code.trim()) {
      setTaskFormError('Name and code are required.');
      return;
    }
    if (taskForm.name.trim().length < 3) {
      setTaskFormError('Task name must be at least 3 characters.');
      return;
    }
    if (taskForm.code.trim().length < 2) {
      setTaskFormError('Task code must be at least 2 characters.');
      return;
    }

    setIsTaskSubmitting(true);
    try {
      let response;
      if (editingTask) {
        response = await api.patch(`/admin/projects/tasks/${editingTask.id}`, {
          name: taskForm.name.trim(),
          code: taskForm.code.trim(),
          description: taskForm.description.trim() || undefined,
        });
      } else {
        response = await api.post('/admin/projects/tasks', {
          projectId: taskForm.projectId,
          name: taskForm.name.trim(),
          code: taskForm.code.trim(),
          description: taskForm.description.trim() || undefined,
        });
      }

      if (response.success) {
        closeTaskModal();
        fetchProjects();
      } else {
        setTaskFormError(response.error?.message || 'Failed to save task.');
      }
    } catch {
      setTaskFormError('Network error. Please try again.');
    } finally {
      setIsTaskSubmitting(false);
    }
  };

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
            <button
              onClick={openCreateProjectModal}
              className="btn-primary flex items-center gap-2"
            >
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
                    <button
                      onClick={() => openEditProjectModal(project)}
                      className="p-2 hover:bg-silver-100 rounded-lg text-silver-500"
                      title="Edit project"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                      title="Deactivate project"
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
                      <button
                        onClick={() => openCreateTaskModal(project.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
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
                              <button
                                onClick={() => openEditTaskModal(task, project.id)}
                                className="p-1.5 hover:bg-silver-100 rounded text-silver-500"
                                title="Edit task"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                title="Deactivate task"
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

      {/* Create/Edit Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeProjectModal} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              {projectFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {projectFormError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Satellite Operations"
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  Project Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectForm.code}
                  onChange={(e) => setProjectForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SAT-OPS"
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional project description"
                  rows={3}
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeProjectModal}
                  className="px-4 py-2 text-sm font-medium text-silver-600 bg-white border border-silver-300 rounded-lg hover:bg-silver-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProjectSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProjectSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={closeTaskModal} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              {taskFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {taskFormError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Development"
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">
                  Task Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.code}
                  onChange={(e) => setTaskForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., DEV"
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional task description"
                  rows={3}
                  className="w-full px-3 py-2 border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="px-4 py-2 text-sm font-medium text-silver-600 bg-white border border-silver-300 rounded-lg hover:bg-silver-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTaskSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isTaskSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
