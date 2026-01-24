'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Filter, FileText, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string };
  };
}

interface AuditResponse {
  data: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isSuperAdmin]);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        let url = `/admin/audit-logs?page=${page}&limit=20`;
        if (actionFilter) url += `&action=${actionFilter}`;
        if (entityFilter) url += `&entityType=${entityFilter}`;

        const response = await api.get<AuditResponse>(url);
        if (response.success && response.data) {
          setLogs(response.data.data || []);
          setTotalPages(response.data.meta?.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isSuperAdmin) {
      fetchLogs();
    }
  }, [user, isSuperAdmin, page, actionFilter, entityFilter]);

  const getActionColor = (action: string) => {
    if (action.includes('Created') || action.includes('Added')) return 'bg-success-light text-success';
    if (action.includes('Updated') || action.includes('Modified')) return 'bg-blue-100 text-blue-600';
    if (action.includes('Deleted') || action.includes('Removed')) return 'bg-error-light text-error';
    if (action.includes('Approved')) return 'bg-success-light text-success';
    if (action.includes('Rejected')) return 'bg-error-light text-error';
    return 'bg-silver-100 text-silver-600';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!_hasHydrated || !user || !isSuperAdmin) {
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
            <h1 className="text-lg font-semibold text-navy-900">Audit Logs</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-silver-500" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="PolicyUpdated">Policy Updated</option>
              <option value="GeofenceUpdated">Geofence Updated</option>
              <option value="AnomalyRuleUpdated">Anomaly Rule Updated</option>
              <option value="UserCreated">User Created</option>
              <option value="UserUpdated">User Updated</option>
              <option value="LeaveApproved">Leave Approved</option>
              <option value="LeaveRejected">Leave Rejected</option>
            </select>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="WorkPolicy">Work Policy</option>
              <option value="GeofencePolicy">Geofence Policy</option>
              <option value="AnomalyRule">Anomaly Rule</option>
              <option value="User">User</option>
              <option value="LeaveRequest">Leave Request</option>
              <option value="OfficeLocation">Office Location</option>
            </select>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-silver-500">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-silver-50 border-b border-silver-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Timestamp</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Actor</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Action</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Entity</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-silver-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-silver-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-silver-50">
                        <td className="px-6 py-4 text-sm text-silver-600 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User size={14} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-navy-900">
                                {log.actor.profile
                                  ? `${log.actor.profile.firstName} ${log.actor.profile.lastName}`
                                  : log.actor.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-navy-700">
                          {log.entityType}
                        </td>
                        <td className="px-6 py-4 text-sm text-silver-500">
                          {log.entityId.substring(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-silver-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-silver-200 rounded-lg hover:bg-silver-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
