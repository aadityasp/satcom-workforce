'use client';

/**
 * TimesheetEntryModal Component
 *
 * Two-step modal for creating/editing timesheet entries.
 * Step 1: Select project
 * Step 2: Fill in time details, notes, and attachments
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, FolderOpen, Loader2 } from 'lucide-react';
import type { Project, Task, CreateTimesheetDto, TimesheetEntry } from '@/hooks/useTimesheets';
import { TimePresetButtons } from './TimePresetButtons';
import { FileUpload, UploadedFile } from './FileUpload';

type Step = 'project' | 'form';

interface TimesheetEntryModalProps {
  isOpen: boolean;
  isLoading: boolean;
  projects: Project[];
  editEntry?: TimesheetEntry;
  onClose: () => void;
  onSubmit: (data: CreateTimesheetDto) => Promise<boolean>;
  getUploadUrl: (fileName: string, contentType: string) => Promise<{ uploadUrl: string; objectKey: string } | null>;
}

export function TimesheetEntryModal({
  isOpen,
  isLoading,
  projects,
  editEntry,
  onClose,
  onSubmit,
  getUploadUrl,
}: TimesheetEntryModalProps) {
  const [step, setStep] = useState<Step>('project');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Initialize form when editing
  useEffect(() => {
    if (editEntry && isOpen) {
      const project = projects.find(p => p.id === editEntry.projectId);
      setSelectedProject(project || null);
      setSelectedTask(editEntry.task || null);
      setNotes(editEntry.notes || '');
      setStep('form');
    } else if (isOpen) {
      setStep('project');
    }
  }, [editEntry, isOpen, projects]);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [startTime, endTime]);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
    setSelectedTask(null);
    setStep('form');
  }, []);

  const handlePresetSelect = useCallback((minutes: number) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const totalMinutes = sh * 60 + sm + minutes;
    const eh = Math.floor(totalMinutes / 60);
    const em = totalMinutes % 60;
    setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
  }, [startTime]);

  const handleSubmit = useCallback(async () => {
    if (!selectedProject || duration <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const data: CreateTimesheetDto = {
      date: today,
      projectId: selectedProject.id,
      taskId: selectedTask?.id,
      startTime: `${today}T${startTime}:00`,
      endTime: `${today}T${endTime}:00`,
      notes: notes || undefined,
      attachmentKeys: files.filter(f => f.objectKey).map(f => f.objectKey!),
    };

    const success = await onSubmit(data);
    if (success) {
      // Reset form
      setStep('project');
      setSelectedProject(null);
      setSelectedTask(null);
      setStartTime('09:00');
      setEndTime('17:00');
      setNotes('');
      setFiles([]);
      onClose();
    }
  }, [selectedProject, selectedTask, startTime, endTime, notes, files, duration, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    setStep('project');
    setSelectedProject(null);
    setSelectedTask(null);
    setNotes('');
    setFiles([]);
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-silver-100">
                {step === 'form' && (
                  <button onClick={() => setStep('project')} className="p-2 -ml-2 hover:bg-silver-50 rounded-lg">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-navy-900 flex-1">
                  {step === 'project' ? 'Select Project' : 'Log Time'}
                </h2>
                <button onClick={handleClose} className="p-2 text-silver-500 hover:text-navy-900 transition-colors rounded-lg hover:bg-silver-50">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {step === 'project' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project)}
                        className="p-4 border border-silver-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FolderOpen size={16} className="text-blue-500" />
                          <span className="text-xs text-silver-500">{project.code}</span>
                        </div>
                        <p className="font-medium text-navy-900">{project.name}</p>
                        <p className="text-xs text-silver-500 mt-1">{project.tasks?.length || 0} tasks</p>
                      </button>
                    ))}
                    {projects.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-silver-500">
                        No projects available
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected project display */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">{selectedProject?.name}</p>
                    </div>

                    {/* Task selection (optional) */}
                    {selectedProject && selectedProject.tasks && selectedProject.tasks.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-2">Task (optional)</label>
                        <select
                          value={selectedTask?.id || ''}
                          onChange={(e) => setSelectedTask(selectedProject.tasks.find(t => t.id === e.target.value) || null)}
                          className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">No task</option>
                          {selectedProject.tasks.map((task) => (
                            <option key={task.id} value={task.id}>{task.name} ({task.code})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-900 mb-2">End Time</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Duration display */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-silver-600">Duration: {Math.floor(duration / 60)}h {duration % 60}m</span>
                      <TimePresetButtons onSelect={handlePresetSelect} selectedMinutes={duration > 0 ? duration : undefined} />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="What did you work on?"
                        className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* File upload */}
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-2">Attachments (optional)</label>
                      <FileUpload files={files} onFilesChange={setFiles} getUploadUrl={getUploadUrl} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === 'form' && (
                <div className="flex gap-3 p-4 border-t border-silver-100 bg-silver-50">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 text-silver-600 bg-white border border-silver-200 rounded-lg hover:bg-silver-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedProject || duration <= 0 || isLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Entry'
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
