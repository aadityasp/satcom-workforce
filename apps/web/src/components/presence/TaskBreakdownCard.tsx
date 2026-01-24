'use client';

import { useState, useEffect } from 'react';
import { Clock, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

interface TaskBreakdown {
  detailed: Array<{
    id: string;
    project: { id: string; name: string; code: string } | null;
    task: { id: string; name: string; code: string } | null;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number;
  }>;
  summary: Array<{
    project: { id: string; name: string; code: string };
    totalMinutes: number;
    tasks: Array<{ taskId: string; minutes: number }>;
  }>;
}

interface TaskBreakdownCardProps {
  period?: 'today' | 'week';
}

export function TaskBreakdownCard({ period = 'today' }: TaskBreakdownCardProps) {
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchBreakdown();
  }, [period]);

  const fetchBreakdown = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (period === 'today') {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
      } else {
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      }

      const response = await api.get<TaskBreakdown>(
        `/presence/task-breakdown?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (response.success && response.data) {
        setBreakdown(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch task breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const totalMinutes = breakdown?.summary.reduce((sum, p) => sum + p.totalMinutes, 0) || 0;

  return (
    <div className="bg-white rounded-xl border border-silver-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-navy-600" />
          <h3 className="font-medium text-navy-900">
            {period === 'today' ? "Today's Activity" : 'This Week'}
          </h3>
        </div>
        <span className="text-sm font-semibold text-navy-900">
          {formatMinutes(totalMinutes)}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock size={24} className="animate-spin text-silver-400" />
        </div>
      ) : !breakdown || breakdown.summary.length === 0 ? (
        <div className="text-center py-6 text-silver-500">
          <Briefcase size={32} className="mx-auto mb-2 text-silver-300" />
          <p className="text-sm">No activity tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {breakdown.summary.map((project) => {
            const percentage = Math.round((project.totalMinutes / totalMinutes) * 100);

            return (
              <div key={project.project.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-navy-900 truncate">
                    {project.project.name}
                  </span>
                  <span className="text-silver-600 ml-2">
                    {formatMinutes(project.totalMinutes)} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-silver-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Expand/collapse for detailed view */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
              {breakdown.detailed.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs bg-silver-50 rounded px-2 py-1"
                >
                  <div className="truncate">
                    <span className="text-navy-900">
                      {entry.project?.name || 'Unknown'}
                    </span>
                    {entry.task && (
                      <span className="text-silver-500"> / {entry.task.name}</span>
                    )}
                  </div>
                  <span className="text-silver-600 ml-2 whitespace-nowrap">
                    {format(new Date(entry.startedAt), 'HH:mm')} -{' '}
                    {entry.endedAt
                      ? format(new Date(entry.endedAt), 'HH:mm')
                      : 'now'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
