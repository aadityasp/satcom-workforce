'use client';

/**
 * Timesheets Page
 *
 * Full timesheet management page with weekly summary, history table, and entry modal.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, RefreshCw } from 'lucide-react';
import { useTimesheets } from '@/hooks/useTimesheets';
import { TimesheetEntryModal } from '@/components/timesheets/TimesheetEntryModal';
import { TimesheetHistoryTable } from '@/components/timesheets/TimesheetHistoryTable';
import { WeeklySummary } from '@/components/timesheets/WeeklySummary';
import type { TimesheetEntry, CreateTimesheetDto } from '@/hooks/useTimesheets';

export default function TimesheetsPage() {
  const router = useRouter();
  const {
    entries,
    projects,
    summary,
    isLoading,
    isActionLoading,
    error,
    fetchEntries,
    fetchSummary,
    createEntry,
    deleteEntry,
    getUploadUrl,
    clearError,
  } = useTimesheets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimesheetEntry | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  // Load entries and summary on mount and date change
  useEffect(() => {
    fetchEntries(dateRange.start, dateRange.end);
    fetchSummary(dateRange.start, dateRange.end);
  }, [dateRange, fetchEntries, fetchSummary]);

  const handleCreateEntry = useCallback(async (data: CreateTimesheetDto) => {
    const success = await createEntry(data);
    if (success) {
      // Refresh data
      fetchEntries(dateRange.start, dateRange.end);
      fetchSummary(dateRange.start, dateRange.end);
    }
    return success;
  }, [createEntry, fetchEntries, fetchSummary, dateRange]);

  const handleEdit = useCallback((entry: TimesheetEntry) => {
    setEditEntry(entry);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      const success = await deleteEntry(id);
      if (success) {
        fetchEntries(dateRange.start, dateRange.end);
        fetchSummary(dateRange.start, dateRange.end);
      }
    }
  }, [deleteEntry, fetchEntries, fetchSummary, dateRange]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditEntry(null);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchEntries(dateRange.start, dateRange.end);
    fetchSummary(dateRange.start, dateRange.end);
  }, [fetchEntries, fetchSummary, dateRange]);

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
              <h1 className="text-lg font-semibold text-navy-900">Timesheets</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-silver-100 rounded-lg text-silver-600"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Log Time
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Weekly summary */}
          <WeeklySummary summary={summary} isLoading={isLoading} />

          {/* Date filter */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-silver-200">
            <Calendar size={20} className="text-silver-400" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1.5 border border-silver-200 rounded-lg text-sm"
              />
              <span className="text-silver-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1.5 border border-silver-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* History table */}
          <div>
            <h2 className="text-lg font-semibold text-navy-900 mb-4">History</h2>
            <TimesheetHistoryTable
              entries={entries}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </main>

      {/* Entry modal */}
      <TimesheetEntryModal
        isOpen={isModalOpen}
        isLoading={isActionLoading}
        projects={projects}
        editEntry={editEntry || undefined}
        onClose={handleModalClose}
        onSubmit={handleCreateEntry}
        getUploadUrl={getUploadUrl}
      />
    </div>
  );
}
