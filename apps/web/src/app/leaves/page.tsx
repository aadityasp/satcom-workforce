'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Calendar, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
}

interface LeaveBalance {
  id: string;
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
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
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
      const [typesRes, balanceRes, requestsRes] = await Promise.all([
        api.get<any>('/leaves/types'),
        api.get<any>('/leaves/balance'),
        api.get<any>('/leaves/requests'),
      ]);

      // Parse leave types
      if (typesRes.success && typesRes.data) {
        const types = Array.isArray(typesRes.data) ? typesRes.data : [];
        setLeaveTypes(types);
        // Set default selected type
        if (types.length > 0 && !formData.leaveTypeId) {
          setFormData(prev => ({ ...prev, leaveTypeId: types[0].id }));
        }
      }

      // Parse leave balances
      // Backend returns: { success: true, data: { balances: [...] } }
      // Each balance has: { id, allocated (Decimal), used (Decimal), pending (Decimal), leaveType: { id, name, code } }
      if (balanceRes.success && balanceRes.data) {
        const balData = balanceRes.data;
        const rawBalances = Array.isArray(balData) ? balData : (balData.balances || []);
        setBalances(rawBalances.map((b: any) => ({
          id: b.id,
          type: typeof b.leaveType === 'object' ? (b.leaveType?.name || 'Leave') : (b.leaveType || b.type || 'Leave'),
          used: Number(b.used ?? 0),
          total: Number(b.allocated ?? b.total ?? 0),
        })));
      }

      // Parse leave requests
      // Backend returns: { success: true, data: [...], meta: {...} }
      // Each request has: { id, startDate, endDate, totalDays, reason, status, leaveType: { id, name } }
      if (requestsRes.success && requestsRes.data) {
        const reqData = Array.isArray(requestsRes.data) ? requestsRes.data : (requestsRes.data?.data || []);
        setLeaves(reqData.map((r: any) => ({
          id: r.id,
          type: typeof r.leaveType === 'object' ? (r.leaveType?.name || 'Leave') : (r.leaveType || r.type || 'Leave'),
          startDate: r.startDate,
          endDate: r.endDate,
          days: Number(r.totalDays || r.days || 1),
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
    if (!formData.leaveTypeId) {
      setFormError('Please select a leave type.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError('Start date and end date are required.');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError('End date must be on or after start date.');
      return;
    }
    if (!formData.reason.trim()) {
      setFormError('Please provide a reason for your leave request.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post<any>('/leaves/request', {
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      if (res.success) {
        setShowRequestModal(false);
        setFormData(prev => ({ ...prev, startDate: '', endDate: '', reason: '' }));
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
                <div key={bal.id || bal.type} className="bg-white rounded-xl border border-silver-200 p-4">
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
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {leaveTypes.length > 0 ? (
                    leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="">No leave types configured</option>
                    </>
                  )}
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
                    min={formData.startDate || undefined}
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
              <button onClick={handleRequestLeave} disabled={formLoading || !formData.leaveTypeId} className="btn-primary text-sm px-6 py-2 disabled:opacity-50">
                {formLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
