'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Filter, RefreshCw } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { TeamListCard, PresenceIndicator } from '@/components/presence';
import { PresenceStatus } from '@/store/presence';

const statusOptions: { value: PresenceStatus | null; label: string }[] = [
  { value: null, label: 'All Statuses' },
  { value: 'Online', label: 'Online' },
  { value: 'Away', label: 'Away' },
  { value: 'Offline', label: 'Offline' },
];

export default function TeamPage() {
  const router = useRouter();
  const {
    isConnected,
    filteredMembers,
    departments,
    isLoading,
    statusFilter,
    departmentFilter,
    setStatusFilter,
    setDepartmentFilter,
    refresh,
  } = usePresence();

  // Count by status
  const onlineCount = filteredMembers.filter((m) => m.status === 'Online').length;
  const awayCount = filteredMembers.filter((m) => m.status === 'Away').length;
  const offlineCount = filteredMembers.filter((m) => m.status === 'Offline').length;

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
              <h1 className="text-lg font-semibold text-navy-900">Team</h1>
            </div>

            {/* Connection indicator */}
            <div className="ml-auto flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1 text-xs text-success">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-silver-400">
                  <span className="w-2 h-2 bg-silver-400 rounded-full" />
                  Connecting...
                </span>
              )}

              <button
                onClick={refresh}
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
        {/* Status summary */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-silver-200">
            <PresenceIndicator status="Online" size="sm" />
            <span className="text-sm font-medium">{onlineCount} Online</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-silver-200">
            <PresenceIndicator status="Away" size="sm" />
            <span className="text-sm font-medium">{awayCount} Away</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-silver-200">
            <PresenceIndicator status="Offline" size="sm" />
            <span className="text-sm font-medium">{offlineCount} Offline</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-silver-400" />
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter((e.target.value || null) as PresenceStatus | null)}
              className="px-3 py-2 border border-silver-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.label} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={departmentFilter || ''}
              onChange={(e) => setDepartmentFilter(e.target.value || null)}
              className="px-3 py-2 border border-silver-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team grid */}
        {isLoading && filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-silver-400" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-silver-500">
            <Users size={48} className="mx-auto mb-4 text-silver-300" />
            <p>No team members found</p>
            {(statusFilter || departmentFilter) && (
              <button
                onClick={() => {
                  setStatusFilter(null);
                  setDepartmentFilter(null);
                }}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <TeamListCard key={member.userId} member={member} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
