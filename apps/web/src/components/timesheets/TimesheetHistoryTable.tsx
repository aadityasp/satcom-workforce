'use client';

/**
 * TimesheetHistoryTable Component
 *
 * Displays timesheet history in table format with edit/delete for today's entries.
 */

import { useState } from 'react';
import { Clock, Paperclip, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { TimesheetEntry } from '@/hooks/useTimesheets';

interface TimesheetHistoryTableProps {
  entries: TimesheetEntry[];
  isLoading: boolean;
  onEdit: (entry: TimesheetEntry) => void;
  onDelete: (id: string) => void;
}

export function TimesheetHistoryTable({ entries, isLoading, onEdit, onDelete }: TimesheetHistoryTableProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border-b border-silver-100 animate-pulse">
            <div className="h-4 bg-silver-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-silver-100 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-silver-200 p-8 text-center">
        <Clock size={32} className="mx-auto text-silver-300 mb-2" />
        <p className="text-silver-500">No timesheet entries yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-silver-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-silver-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-silver-500 uppercase">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-silver-500 uppercase">Task</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-silver-500 uppercase">Hours</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-silver-500 uppercase">Notes</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-silver-500 uppercase"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-100">
          {entries.map((entry) => {
            const entryDate = entry.date.split('T')[0];
            const isEditable = entryDate === today;

            return (
              <tr key={entry.id} className="hover:bg-silver-50">
                <td className="px-4 py-3 text-sm text-navy-900">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-navy-900">{entry.project.name}</span>
                  <span className="ml-2 text-xs text-silver-500">{entry.project.code}</span>
                </td>
                <td className="px-4 py-3 text-sm text-silver-600">
                  {entry.task?.name || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-navy-900">
                  {Math.floor(entry.minutes / 60)}h {entry.minutes % 60}m
                </td>
                <td className="px-4 py-3 text-sm text-silver-600 max-w-xs truncate">
                  <div className="flex items-center gap-2">
                    {entry.notes || '—'}
                    {entry.attachments && entry.attachments.length > 0 && (
                      <Paperclip size={14} className="text-silver-400" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {isEditable && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === entry.id ? null : entry.id)}
                        className="p-1 hover:bg-silver-100 rounded"
                      >
                        <MoreVertical size={16} className="text-silver-500" />
                      </button>
                      {menuOpen === entry.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-silver-200 z-10">
                          <button
                            onClick={() => { onEdit(entry); setMenuOpen(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-navy-900 hover:bg-silver-50 flex items-center gap-2"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => { onDelete(entry.id); setMenuOpen(null); }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
