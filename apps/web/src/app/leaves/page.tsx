'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface LeaveBalance {
  type: string;
  used: number;
  total: number;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
}

export default function LeavesPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    }
  }, [user, router, _hasHydrated]);

  const fetchLeaveData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceRes, requestsRes] = await Promise.all([
        api.get<any>('/leaves/balance'),
        api.get<any>('/leaves/requests'),
      ]);

      if (balanceRes.success && balanceRes.data) {
        const balData = balanceRes.data;
        // Handle both array format and object format from the API
        if (Array.isArray(balData)) {
          setBalances(balData.map((b: any) => ({
            type: b.type || b.leaveType || 'Leave',
            used: b.used ?? b.usedDays ?? 0,
            total: b.total ?? b.totalDays ?? b.entitled ?? 0,
          })));
        } else if (balData.balances) {
          setBalances(balData.balances.map((b: any) => ({
            type: b.type || b.leaveType || 'Leave',
            used: b.used ?? b.usedDays ?? 0,
            total: b.total ?? b.totalDays ?? b.entitled ?? 0,
          })));
        } else {
          // Object with leave type keys e.g. { annual: { used: 5, total: 20 }, ... }
          const mapped = Object.entries(balData).map(([key, val]: [string, any]) => ({
            type: key.charAt(0).toUpperCase() + key.slice(1),
            used: val.used ?? val.usedDays ?? 0,
            total: val.total ?? val.totalDays ?? val.entitled ?? 0,
          }));
          if (mapped.length > 0 && typeof mapped[0].total === 'number') {
            setBalances(mapped);
          }
        }
      }

      if (requestsRes.success && requestsRes.data) {
        const reqData = Array.isArray(requestsRes.data) ? requestsRes.data : (requestsRes.data?.items || requestsRes.data?.requests || []);
        setLeaves(reqData.map((r: any) => ({
          id: r.id,
          type: r.type || r.leaveType || 'Leave',
          startDate: r.startDate || r.from || r.fromDate,
          endDate: r.endDate || r.to || r.toDate,
          days: r.days || r.numberOfDays || r.totalDays || 1,
          status: r.status || 'Pending',
          reason: r.reason,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeaveData();
    }
  }, [user, fetchLeaveData]);

  const handleRequestLeave = async () => {
    setFormError('');
    if (!formData.startDate || !formData.endDate) {
      setFormError('Start date and end date are required.');
      return;
    }
    if (!formData.reason.trim()) {
      setFormError('Please provide a reason for your leave request.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post<any>('/leaves/request', {
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      if (res.success) {
        setShowRequestModal(false);
        setFormData({ type: 'Annual', startDate: '', endDate: '', reason: '' });
        fetchLeaveData();
      } else {
        setFormError(res.error?.message || 'Failed to submit leave request');
      }
    } catch (error: any) {
      setFormError(error?.message || 'Failed to submit leave request');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') return { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle };
    if (s === 'rejected' || s === 'denied') return { bg: 'bg-error-light', text: 'text-error', icon: XCircle };
    return { bg: 'bg-warning-light', text: 'text-warning', icon: Clock };
  };

  if (!_hasHydrated || !user) {
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
            <button
              onClick={() => { setFormError(''); setShowRequestModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Request Leave
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Leave Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {balances.length > 0 ? balances.map((bal) => (
                <div key={bal.type} className="bg-white rounded-xl border border-silver-200 p-4">
                  <p className="text-sm text-silver-500">{bal.type} Leave</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-2xl font-bold text-navy-900">{bal.total - bal.used}</span>
                    <span className="text-silver-500 mb-1">/ {bal.total} days</span>
                  </div>
                  <div className="mt-2 h-2 bg-silver-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${bal.total > 0 ? ((bal.total - bal.used) / bal.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="col-span-3 bg-white rounded-xl border border-silver-200 p-8 text-center text-silver-500">
                  <p className="text-sm">No leave balance data available</p>
                </div>
              )}
            </div>

            {/* Leave Requests */}
            <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
              <div className="p-4 border-b border-silver-100">
                <h2 className="font-semibold text-navy-900">Leave Requests</h2>
              </div>
              <div className="divide-y divide-silver-100">
                {leaves.length === 0 ? (
                  <div className="p-8 text-center text-silver-500">
                    <Calendar size={48} className="mx-auto mb-3 text-silver-300" />
                    <p className="text-sm">No leave requests yet</p>
                  </div>
                ) : (
                  leaves.map((leave) => {
                    const style = getStatusStyle(leave.status);
                    const StatusIcon = style.icon;
                    return (
                      <div key={leave.id} className="p-4 hover:bg-silver-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Calendar size={20} className="text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-navy-900">{leave.type}</h3>
                            <p className="text-sm text-silver-500">
                              {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.days} day{leave.days !== 1 ? 's' : ''})
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${style.bg} ${style.text}`}>
                          <StatusIcon size={14} />
                          {leave.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Request Leave Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-silver-200">
              <h2 className="text-lg font-semibold text-navy-900">Request Leave</h2>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-silver-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Leave Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="WFH">Work From Home</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Please provide a reason for your leave..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-silver-200">
              <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm border border-silver-200 rounded-lg hover:bg-silver-50">
                Cancel
              </button>
              <button onClick={handleRequestLeave} disabled={formLoading} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                {formLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
