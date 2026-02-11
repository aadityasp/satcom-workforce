'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter, Clock, MapPin, Coffee, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface PresenceUser {
  id: string;
  status: string;
  lastSeen?: string;
  currentWorkMode?: string;
  currentProject?: { id: string; name: string; code: string } | null;
  currentTask?: { id: string; name: string; code: string } | null;
  profile: { firstName: string; lastName: string; designation?: string };
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [employees, setEmployees] = useState<PresenceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'HR';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isAdmin]);

  useEffect(() => {
    const fetchPresence = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<{ users: PresenceUser[] }>('/presence/list');
        if (response.success && response.data?.users) {
          setEmployees(response.data.users);
        }
      } catch (error) {
        console.error('Failed to fetch presence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchPresence();
    }
  }, [user, isAdmin]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online':
        return 'bg-success';
      case 'Away':
        return 'bg-warning';
      case 'Busy':
        return 'bg-blue-500';
      default:
        return 'bg-silver-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Online':
        return 'bg-success-light text-success';
      case 'Away':
        return 'bg-warning-light text-warning';
      case 'Busy':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-silver-100 text-silver-600';
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Online' && emp.status === 'Online') ||
      (filter === 'Away' && emp.status === 'Away') ||
      (filter === 'Offline' && emp.status === 'Offline') ||
      (filter === 'Busy' && emp.status === 'Busy');

    const matchesSearch =
      search === '' ||
      `${emp.profile.firstName} ${emp.profile.lastName}`.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: employees.length,
    online: employees.filter((e) => e.status === 'Online').length,
    away: employees.filter((e) => e.status === 'Away').length,
    offline: employees.filter((e) => e.status === 'Offline').length,
    busy: employees.filter((e) => e.status === 'Busy').length,
  };

  if (!_hasHydrated || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50">
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-navy-900">Attendance Overview</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <p className="text-sm text-silver-500">Total Employees</p>
            <p className="text-2xl font-bold text-navy-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <p className="text-sm text-silver-500">Online</p>
            </div>
            <p className="text-2xl font-bold text-success mt-1">{stats.online}</p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <p className="text-sm text-silver-500">Away</p>
            </div>
            <p className="text-2xl font-bold text-warning mt-1">{stats.away}</p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-sm text-silver-500">Busy</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.busy}</p>
          </div>
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-silver-400" />
              <p className="text-sm text-silver-500">Offline</p>
            </div>
            <p className="text-2xl font-bold text-silver-600 mt-1">{stats.offline}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-silver-500" />
            {['All', 'Online', 'Away', 'Busy', 'Offline'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-silver-600 hover:bg-silver-100 border border-silver-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <Clock size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-silver-500">No employees found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-silver-50 border-b border-silver-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Working On</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Work Mode</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-silver-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {employee.profile.firstName[0]}{employee.profile.lastName[0]}
                              </span>
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(employee.status)} border-2 border-white rounded-full`} />
                          </div>
                          <div>
                            <p className="font-medium text-navy-900">
                              {employee.profile.firstName} {employee.profile.lastName}
                            </p>
                            <p className="text-sm text-silver-500">{employee.profile.designation || 'Employee'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBgColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {employee.currentProject ? (
                          <div>
                            <p className="text-sm font-medium text-navy-900">{employee.currentProject.name}</p>
                            {employee.currentTask && (
                              <p className="text-xs text-silver-500">{employee.currentTask.name}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-silver-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-navy-700">
                          <MapPin size={14} className="text-silver-400" />
                          {employee.currentWorkMode || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-silver-500">
                        {employee.lastSeen
                          ? new Date(employee.lastSeen).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
