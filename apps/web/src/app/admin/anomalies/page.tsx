'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Filter, Loader2, XCircle, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  status: string;
  detectedAt: string;
  resolvedAt?: string;
  notes?: string;
  user: {
    id: string;
    profile: { firstName: string; lastName: string };
  };
}

interface AnomalyResponse {
  data: Anomaly[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AnomaliesPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Open');
  const [severityFilter, setSeverityFilter] = useState<string>('');
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
    const fetchAnomalies = async () => {
      setIsLoading(true);
      try {
        let url = '/anomalies?limit=50';
        if (statusFilter) url += `&status=${statusFilter}`;
        if (severityFilter) url += `&severity=${severityFilter}`;

        const response = await api.get<any>(url);
        if (response.success) {
          setAnomalies(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch anomalies:', error);
        setError('Failed to load anomalies');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchAnomalies();
    }
  }, [user, isAdmin, statusFilter, severityFilter]);

  const handleAcknowledge = async (anomalyId: string) => {
    setIsActionLoading(anomalyId);
    setError(null);
    try {
      const response = await api.post(`/anomalies/${anomalyId}/acknowledge`, {});
      if (response.success) {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === anomalyId ? { ...a, status: 'Acknowledged' } : a))
        );
      } else {
        setError(response.error?.message || 'Failed to acknowledge');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleResolve = async (anomalyId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;

    setIsActionLoading(anomalyId);
    setError(null);
    try {
      const response = await api.post(`/anomalies/${anomalyId}/resolve`, { notes });
      if (response.success) {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === anomalyId ? { ...a, status: 'Resolved' } : a))
        );
      } else {
        setError(response.error?.message || 'Failed to resolve');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDismiss = async (anomalyId: string) => {
    const reason = prompt('Enter dismissal reason:');
    if (!reason) return;

    setIsActionLoading(anomalyId);
    setError(null);
    try {
      const response = await api.post(`/anomalies/${anomalyId}/dismiss`, { reason });
      if (response.success) {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === anomalyId ? { ...a, status: 'Dismissed' } : a))
        );
      } else {
        setError(response.error?.message || 'Failed to dismiss');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'bg-error-light text-error';
      case 'Medium':
        return 'bg-warning-light text-warning';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle size={16} className="text-success" />;
      case 'Acknowledged':
        return <Clock size={16} className="text-warning" />;
      case 'Dismissed':
        return <XCircle size={16} className="text-silver-500" />;
      default:
        return <AlertTriangle size={16} className="text-error" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-success-light';
      case 'Acknowledged':
        return 'bg-warning-light';
      case 'Dismissed':
        return 'bg-silver-100';
      default:
        return 'bg-error-light';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-navy-900">Anomaly Review</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-silver-500" />
            <span className="text-sm text-silver-600">Status:</span>
            {['Open', 'Acknowledged', 'Resolved', 'Dismissed', ''].map((status) => (
              <button
                key={status || 'all'}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-silver-600 hover:bg-silver-100 border border-silver-200'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-silver-600">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 border border-silver-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-light border border-error/20 text-error rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Anomalies List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : anomalies.length === 0 ? (
          <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
            <Shield size={48} className="mx-auto text-silver-300 mb-4" />
            <p className="text-silver-500">No anomalies found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="bg-white rounded-xl border border-silver-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getStatusBg(anomaly.status)}`}>
                      {getStatusIcon(anomaly.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-900">{anomaly.type}</h3>
                      <p className="text-sm text-silver-500 mt-1">
                        {anomaly.user.profile.firstName} {anomaly.user.profile.lastName}
                      </p>
                      <p className="text-xs text-silver-400 mt-1">{formatDate(anomaly.detectedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                    <span className="text-sm text-silver-600 capitalize">{anomaly.status}</span>
                  </div>
                </div>

                {anomaly.status === 'Open' && (
                  <div className="mt-4 pt-4 border-t border-silver-100 flex gap-3">
                    <button
                      onClick={() => handleAcknowledge(anomaly.id)}
                      disabled={isActionLoading === anomaly.id}
                      className="px-4 py-2 border border-warning text-warning rounded-lg hover:bg-warning-light transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isActionLoading === anomaly.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Clock size={16} />
                      )}
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleResolve(anomaly.id)}
                      disabled={isActionLoading === anomaly.id}
                      className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isActionLoading === anomaly.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Resolve
                    </button>
                    <button
                      onClick={() => handleDismiss(anomaly.id)}
                      disabled={isActionLoading === anomaly.id}
                      className="px-4 py-2 border border-silver-300 text-silver-600 rounded-lg hover:bg-silver-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isActionLoading === anomaly.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <XCircle size={16} />
                      )}
                      Dismiss
                    </button>
                  </div>
                )}

                {anomaly.status === 'Acknowledged' && (
                  <div className="mt-4 pt-4 border-t border-silver-100 flex gap-3">
                    <button
                      onClick={() => handleResolve(anomaly.id)}
                      disabled={isActionLoading === anomaly.id}
                      className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isActionLoading === anomaly.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Mark Resolved
                    </button>
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
