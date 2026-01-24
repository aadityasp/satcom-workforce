'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MapPin, Shield, Save, Loader2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface WorkPolicy {
  standardWorkMinutes: number;
  graceMinutes: number;
  maxOvertimeMinutes: number;
  maxBreakMinutes: number;
}

interface GeofencePolicy {
  enabled: boolean;
  radiusMeters: number;
  strictMode: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [workPolicy, setWorkPolicy] = useState<WorkPolicy>({
    standardWorkMinutes: 480,
    graceMinutes: 15,
    maxOvertimeMinutes: 180,
    maxBreakMinutes: 60,
  });

  const [geofencePolicy, setGeofencePolicy] = useState<GeofencePolicy>({
    enabled: true,
    radiusMeters: 100,
    strictMode: false,
  });

  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isSuperAdmin]);

  useEffect(() => {
    const fetchPolicies = async () => {
      setIsLoading(true);
      try {
        const [workRes, geofenceRes] = await Promise.all([
          api.get<WorkPolicy>('/admin/policies/work'),
          api.get<GeofencePolicy>('/admin/policies/geofence'),
        ]);

        if (workRes.success && workRes.data) {
          setWorkPolicy(workRes.data);
        }
        if (geofenceRes.success && geofenceRes.data) {
          setGeofencePolicy(geofenceRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch policies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isSuperAdmin) {
      fetchPolicies();
    }
  }, [user, isSuperAdmin]);

  const handleSaveWorkPolicy = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.patch('/admin/policies/work', workPolicy);
      if (response.success) {
        setSuccess('Work policy saved successfully');
      } else {
        setError(response.error?.message || 'Failed to save work policy');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeofencePolicy = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.patch('/admin/policies/geofence', geofencePolicy);
      if (response.success) {
        setSuccess('Geofence policy saved successfully');
      } else {
        setError(response.error?.message || 'Failed to save geofence policy');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-silver-100 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-navy-900">Policy Settings</h1>
            </div>
            <button
              onClick={() => router.push('/admin/audit')}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText size={16} />
              View Audit Logs
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-error-light border border-error/20 text-error rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-success-light border border-success/20 text-success rounded-lg px-4 py-3">
            {success}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Work Hours Policy */}
            <div className="bg-white rounded-xl border border-silver-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-navy-900">Work Hours Policy</h2>
                    <p className="text-sm text-silver-500">Configure standard work hours and limits</p>
                  </div>
                </div>
                <button
                  onClick={handleSaveWorkPolicy}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Standard Work Hours
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.floor(workPolicy.standardWorkMinutes / 60)}
                      onChange={(e) => setWorkPolicy({ ...workPolicy, standardWorkMinutes: parseInt(e.target.value) * 60 })}
                      className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-silver-500 text-sm">hours</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Grace Period
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={workPolicy.graceMinutes}
                      onChange={(e) => setWorkPolicy({ ...workPolicy, graceMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-silver-500 text-sm">mins</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Max Overtime
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.floor(workPolicy.maxOvertimeMinutes / 60)}
                      onChange={(e) => setWorkPolicy({ ...workPolicy, maxOvertimeMinutes: parseInt(e.target.value) * 60 })}
                      className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-silver-500 text-sm">hours</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Max Break Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={workPolicy.maxBreakMinutes}
                      onChange={(e) => setWorkPolicy({ ...workPolicy, maxBreakMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-silver-500 text-sm">mins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Geofence Policy */}
            <div className="bg-white rounded-xl border border-silver-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-navy-900">Geofence Settings</h2>
                    <p className="text-sm text-silver-500">Configure location verification for office check-ins</p>
                  </div>
                </div>
                <button
                  onClick={handleSaveGeofencePolicy}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Geofence Enabled
                  </label>
                  <select
                    value={geofencePolicy.enabled ? 'true' : 'false'}
                    onChange={(e) => setGeofencePolicy({ ...geofencePolicy, enabled: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Office Radius
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={geofencePolicy.radiusMeters}
                      onChange={(e) => setGeofencePolicy({ ...geofencePolicy, radiusMeters: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-silver-500 text-sm">meters</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">
                    Strict Mode
                  </label>
                  <select
                    value={geofencePolicy.strictMode ? 'true' : 'false'}
                    onChange={(e) => setGeofencePolicy({ ...geofencePolicy, strictMode: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-silver-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Yes (Block check-in outside radius)</option>
                    <option value="false">No (Allow but flag as anomaly)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Shield size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Policy Changes are Audited</p>
                  <p className="text-sm text-blue-700 mt-1">
                    All changes to policies are logged in the audit trail. You can view the history in the Audit Logs section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
