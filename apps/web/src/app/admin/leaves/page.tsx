'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, Filter, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  createdAt: string;
  leaveType: { name: string };
  user: { id: string; profile: { firstName: string; lastName: string } };
}

export default function AdminLeavesPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('Pending');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'HR';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isAdmin]);

  useEffect(() => {
    const fetchLeaves = async () => {
      setIsLoading(true);
      try {
        if (filter === 'Pending') {
          const response = await api.get<LeaveRequest[]>('/leaves/requests/pending');
          if (response.success && response.data) {
            setLeaves(Array.isArray(response.data) ? response.data : []);
          }
        } else {
          // No admin-level endpoint for approved/rejected/all leaves yet.
          // Set leaves to empty and let the UI show a "coming soon" placeholder.
          setLeaves([]);
        }
      } catch (error) {
        console.error('Failed to fetch leaves:', error);
        setError('Failed to load leave requests');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchLeaves();
    }
  }, [user, isAdmin, filter]);

  const handleApprove = async (leaveId: string) => {
    setIsActionLoading(leaveId);
    setError(null);
    try {
      const response = await api.post(`/leaves/requests/${leaveId}/approve`, {});
      if (response.success) {
        setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      } else {
        setError(response.error?.message || 'Failed to approve leave');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setIsActionLoading(leaveId);
    setError(null);
    try {
      const response = await api.post(`/leaves/requests/${leaveId}/reject`, { reason });
      if (response.success) {
        setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      } else {
        setError(response.error?.message || 'Failed to reject leave');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle };
      case 'Rejected':
        return { bg: 'bg-error-light', text: 'text-error', icon: XCircle };
      default:
        return { bg: 'bg-warning-light', text: 'text-warning', icon: Clock };
    }
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Leave Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <Filter size={18} className="text-silver-500" />
          {['Pending', 'Approved', 'Rejected', 'All'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-silver-600 hover:bg-silver-100 border border-silver-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-error-light border border-error/20 text-error rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Leaves List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filter !== 'Pending' ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <Clock size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-navy-900 font-medium mb-1">Coming Soon</p>
            <p className="text-silver-500 text-sm">
              Viewing {filter.toLowerCase()} leave requests will be available in a future update.
              <br />
              Use the <button onClick={() => setFilter('Pending')} className="text-blue-600 hover:underline font-medium">Pending</button> tab to manage requests awaiting approval.
            </p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <Calendar size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-silver-500">No pending leave requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map((leave) => {
              const style = getStatusStyle(leave.status);
              const StatusIcon = style.icon;

              return (
                <div
                  key={leave.id}
                  className="bg-white rounded-xl border border-silver-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 font-medium">
                          {leave.user.profile.firstName[0]}{leave.user.profile.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy-900">
                          {leave.user.profile.firstName} {leave.user.profile.lastName}
                        </h3>
                        <p className="text-silver-500 text-sm mt-1">
                          {leave.leaveType.name} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </p>
                        <p className="text-silver-600 text-sm mt-2">
                          <span className="font-medium">Reason:</span> {leave.reason}
                        </p>
                        <p className="text-silver-400 text-xs mt-2">
                          Requested on {formatDate(leave.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-navy-900">{leave.totalDays}</span>
                        <span className="text-silver-500 text-sm">day{leave.totalDays > 1 ? 's' : ''}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${style.bg} ${style.text}`}>
                        <StatusIcon size={14} />
                        {leave.status}
                      </span>
                    </div>
                  </div>

                  {leave.status === 'Pending' && (
                    <div className="mt-4 pt-4 border-t border-silver-100 flex justify-end gap-3">
                      <button
                        onClick={() => handleReject(leave.id)}
                        disabled={isActionLoading === leave.id}
                        className="px-4 py-2 border border-error text-error rounded-lg hover:bg-error-light transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isActionLoading === leave.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(leave.id)}
                        disabled={isActionLoading === leave.id}
                        className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isActionLoading === leave.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
