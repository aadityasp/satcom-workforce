'use client';

/**
 * WeeklySummary Component
 *
 * Displays weekly timesheet summary with daily breakdown and project totals.
 */

import type { TimesheetSummary } from '@/hooks/useTimesheets';

interface WeeklySummaryProps {
  summary: TimesheetSummary | null;
  isLoading: boolean;
}

export function WeeklySummary({ summary, isLoading }: WeeklySummaryProps) {
  if (isLoading || !summary) {
    return (
      <div className="bg-white rounded-xl border border-silver-200 p-4 animate-pulse">
        <div className="h-4 bg-silver-200 rounded w-24 mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 bg-silver-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const totalHours = Math.floor(summary.totalMinutes / 60);
  const totalMins = summary.totalMinutes % 60;

  // Create day map
  const dayMap = summary.byDate.reduce((acc, d) => {
    acc[d.date] = d.minutes;
    return acc;
  }, {} as Record<string, number>);

  // Get last 7 days
  const days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl border border-silver-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-navy-900">This Week</h3>
        <span className="text-2xl font-bold text-navy-900">
          {totalHours}h {totalMins}m
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const minutes = dayMap[date] || 0;
          const hours = Math.floor(minutes / 60);
          const dayOfWeek = new Date(date).getDay();
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <div
              key={date}
              className={`flex flex-col items-center p-2 rounded-lg ${
                isToday ? 'bg-blue-50 border border-blue-200' : 'bg-silver-50'
              }`}
            >
              <span className="text-xs text-silver-500">{dayNames[dayOfWeek]}</span>
              <span className={`text-lg font-semibold ${minutes > 0 ? 'text-navy-900' : 'text-silver-400'}`}>
                {hours}h
              </span>
            </div>
          );
        })}
      </div>

      {/* Project breakdown */}
      {summary.byProject.length > 0 && (
        <div className="mt-4 pt-4 border-t border-silver-100">
          <h4 className="text-sm font-medium text-silver-600 mb-2">By Project</h4>
          <div className="space-y-1">
            {summary.byProject.map((p) => (
              <div key={p.projectId} className="flex items-center justify-between text-sm">
                <span className="text-navy-900">{p.projectName}</span>
                <span className="text-silver-600">{Math.floor(p.minutes / 60)}h {p.minutes % 60}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
