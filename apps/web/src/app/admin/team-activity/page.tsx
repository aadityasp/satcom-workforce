'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Clock,
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { api } from '@/lib/api';
import { PresenceIndicator } from '@/components/presence';

interface TeamActivity {
  userId: string;
  profile: {
    firstName: string;
    lastName: string;
    designation: string;
    department: string;
  } | null;
  presence: {
    status: 'Online' | 'Away' | 'Offline';
    statusMessage: string | null;
    currentProject: { id: string; name: string; code: string } | null;
    currentTask: { id: string; name: string; code: string } | null;
  } | null;
  activities: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    project: { id: string; name: string; code: string } | null;
    task: { id: string; name: string; code: string } | null;
  }>;
}

export default function TeamActivityPage() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeamActivity = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ activities: TeamActivity[] }>(
        `/presence/team-activity?date=${format(date, 'yyyy-MM-dd')}`
      );

      if (response.success && response.data) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch team activity:', error);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchTeamActivity();
  }, [fetchTeamActivity]);

  const goToPreviousDay = () => setDate(subDays(date, 1));
  const goToNextDay = () => setDate(addDays(date, 1));
  const goToToday = () => setDate(new Date());

  const formatDuration = (startedAt: string, endedAt: string | null): string => {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const minutes = Math.round((end - start) / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-silver-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-navy-600" />
              <h1 className="text-lg font-semibold text-navy-900">Team Activity</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={fetchTeamActivity}
                disabled={isLoading}
                className="p-2 hover:bg-silver-100 rounded-lg disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={`text-silver-500 ${isLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Date navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-silver-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-silver-200">
              <Calendar size={16} className="text-silver-500" />
              <span className="font-medium text-navy-900">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday(date)}
              className="p-2 hover:bg-silver-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {!isToday(date) && (
            <button
              onClick={goToToday}
              className="text-sm text-blue-600 hover:underline"
            >
              Go to today
            </button>
          )}
        </div>

        {/* Team activity list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-silver-400" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-silver-500">
            <Users size={48} className="mx-auto mb-4 text-silver-300" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((member) => (
              <div
                key={member.userId}
                className="bg-white rounded-xl border border-silver-200 p-4"
              >
                {/* Member header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.profile
                          ? `${member.profile.firstName[0]}${member.profile.lastName[0]}`
                          : '??'}
                      </span>
                    </div>
                    {member.presence && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <PresenceIndicator status={member.presence.status} size="md" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-navy-900">
                      {member.profile
                        ? `${member.profile.firstName} ${member.profile.lastName}`
                        : 'Unknown User'}
                    </h3>
                    <p className="text-sm text-silver-500">
                      {member.profile?.designation || 'Employee'}
                      {member.profile?.department && ` - ${member.profile.department}`}
                    </p>

                    {/* Current status message */}
                    {member.presence?.statusMessage && (
                      <p className="text-xs text-blue-600 mt-1 italic">
                        &quot;{member.presence.statusMessage}&quot;
                      </p>
                    )}
                  </div>

                  {/* Activity count */}
                  <div className="text-right">
                    <p className="text-sm text-silver-500">
                      {member.activities.length} activities
                    </p>
                  </div>
                </div>

                {/* Activity timeline */}
                {member.activities.length > 0 ? (
                  <div className="border-t border-silver-100 pt-3 space-y-2">
                    {member.activities.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="w-16 text-xs text-silver-400">
                          {format(new Date(activity.startedAt), 'HH:mm')}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Briefcase size={14} className="text-silver-400" />
                          <span className="text-navy-900">
                            {activity.project?.name || 'Unknown project'}
                          </span>
                          {activity.task && (
                            <span className="text-silver-500">
                              / {activity.task.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-silver-500">
                          <Clock size={12} />
                          {formatDuration(activity.startedAt, activity.endedAt)}
                          {!activity.endedAt && (
                            <span className="text-success"> (active)</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {member.activities.length > 5 && (
                      <p className="text-xs text-silver-400 text-center pt-2">
                        + {member.activities.length - 5} more activities
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-silver-100 pt-3 text-center text-sm text-silver-500">
                    No activity tracked on this day
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
