'use client';

import { useState, useEffect } from 'react';
import { X, Briefcase, CheckSquare, MessageSquare } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  code: string;
  tasks: Array<{ id: string; name: string; code: string }>;
}

interface SetActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetActivityModal({ isOpen, onClose }: SetActivityModalProps) {
  const { setActivity, postStatus, clearStatus } = usePresence();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'status'>('activity');

  // Fetch projects on mount
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    try {
      const response = await api.get<{ projects: Project[] }>('/projects');
      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleSetActivity = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      setActivity(selectedProject, selectedTask || undefined);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostStatus = async () => {
    if (!statusMessage.trim()) return;

    setIsLoading(true);
    try {
      postStatus(statusMessage.trim());
      setStatusMessage('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearStatus = () => {
    clearStatus();
    onClose();
  };

  const selectedProjectObj = projects.find((p) => p.id === selectedProject);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-silver-200">
          <h2 className="text-lg font-semibold text-navy-900">Update Status</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-silver-100 rounded-lg"
          >
            <X size={20} className="text-silver-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-silver-200">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-silver-500 hover:text-navy-900'
            }`}
          >
            <Briefcase size={16} />
            Current Activity
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activeTab === 'status'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-silver-500 hover:text-navy-900'
            }`}
          >
            <MessageSquare size={16} />
            Status Message
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'activity' ? (
            <div className="space-y-4">
              {/* Project select */}
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">
                  <Briefcase size={14} className="inline mr-2" />
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    setSelectedTask('');
                  }}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task select (if project selected) */}
              {selectedProjectObj && selectedProjectObj.tasks?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-navy-900 mb-2">
                    <CheckSquare size={14} className="inline mr-2" />
                    Task (optional)
                  </label>
                  <select
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No specific task</option>
                    {selectedProjectObj.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.code} - {task.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-silver-500">
                Your team will see what project you are currently working on.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">
                  What are you working on?
                </label>
                <textarea
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="e.g., Reviewing quarterly reports..."
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-silver-400 mt-1 text-right">
                  {statusMessage.length}/200
                </p>
              </div>

              <button
                onClick={handleClearStatus}
                className="text-sm text-error hover:underline"
              >
                Clear current status
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-silver-200 bg-silver-50">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'activity' ? handleSetActivity : handlePostStatus}
            disabled={
              isLoading ||
              (activeTab === 'activity' && !selectedProject) ||
              (activeTab === 'status' && !statusMessage.trim())
            }
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
