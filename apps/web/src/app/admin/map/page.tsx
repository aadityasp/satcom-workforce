/**
 * Admin Map Page
 *
 * SuperAdmin-only view showing all users' check-in locations on an interactive map.
 * Displays office geofence circles and provides date filtering.
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, CheckCircle, XCircle, Calendar, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCheckInLocations } from '@/hooks/useCheckInLocations';
import { useLocations } from '@/hooks/useLocations';

// Dynamic import to avoid SSR issues with Leaflet
// Leaflet requires window object which doesn't exist during server-side rendering
const LocationMap = dynamic(
  () => import('@/components/map/LocationMap').then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full bg-silver-100 rounded-lg animate-pulse flex items-center justify-center">
        <MapPin size={32} className="text-silver-400" />
      </div>
    ),
  }
);

type DateFilter = 'today' | '7days' | '30days';

export default function AdminMapPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const isSuperAdmin = user?.role === 'SuperAdmin';

  // Redirect non-SuperAdmin users
  useEffect(() => {
    if (_hasHydrated && !user) {
      router.push('/login');
    } else if (_hasHydrated && user && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, _hasHydrated, isSuperAdmin]);

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();

    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { startDate: start, endDate: end };
  }, [dateFilter]);

  // Fetch check-in locations
  const {
    data: checkIns = [],
    isLoading: checkInsLoading,
    error: checkInsError,
  } = useCheckInLocations(dateRange);

  // Fetch office locations for geofence circles
  const {
    locations: offices,
    isLoading: officesLoading,
    fetchLocations,
  } = useLocations();

  // Fetch locations on mount
  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchLocations();
    }
  }, [user, isSuperAdmin, fetchLocations]);

  const isLoading = checkInsLoading || officesLoading;

  // Calculate statistics
  const stats = useMemo(() => {
    const verified = checkIns.filter(
      (c) => c.verificationStatus === 'GeofencePassed'
    ).length;
    const unverified = checkIns.filter(
      (c) => c.verificationStatus === 'GeofenceFailed'
    ).length;
    const uniqueUsers = new Set(checkIns.map((c) => c.userId)).size;

    return {
      total: checkIns.length,
      verified,
      unverified,
      uniqueUsers,
    };
  }, [checkIns]);

  // Loading state
  if (!_hasHydrated || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-silver-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-silver-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-blue-600" />
                <h1 className="text-lg font-semibold text-navy-900">
                  Check-in Locations
                </h1>
              </div>
            </div>

            {/* Date Filter Buttons */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-silver-500" />
              {(['today', '7days', '30days'] as DateFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-silver-600 hover:bg-silver-100 border border-silver-200'
                  }`}
                >
                  {filter === 'today'
                    ? 'Today'
                    : filter === '7days'
                      ? 'Last 7 Days'
                      : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-silver-400" />
              <p className="text-sm text-silver-500">Total Check-ins</p>
            </div>
            <p className="text-2xl font-bold text-navy-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-sm text-silver-500">Verified</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
          </div>

          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-500" />
              <p className="text-sm text-silver-500">Outside Geofence</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.unverified}</p>
          </div>

          <div className="bg-white rounded-xl border border-silver-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-blue-500" />
              <p className="text-sm text-silver-500">Unique Users</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.uniqueUsers}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 bg-white rounded-lg border border-silver-200 px-4 py-3">
          <span className="text-sm text-silver-600 font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-silver-600">Verified Check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-silver-600">Outside Geofence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-silver-600">Remote/Other</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-100" />
            <span className="text-sm text-silver-600">Office Geofence</span>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
          {checkInsError ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <XCircle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-silver-600">Failed to load check-in locations</p>
                <p className="text-sm text-silver-400 mt-1">
                  Please try again later
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-[500px] flex items-center justify-center bg-silver-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
                <p className="text-silver-600">Loading map data...</p>
              </div>
            </div>
          ) : (
            <LocationMap
              checkIns={checkIns}
              offices={offices.map((o) => ({
                id: o.id,
                name: o.name,
                latitude: Number(o.latitude),
                longitude: Number(o.longitude),
                radiusMeters: o.radiusMeters,
              }))}
            />
          )}
        </div>

        {/* Info Text */}
        <p className="text-sm text-silver-500 text-center">
          Showing {checkIns.length} check-in
          {checkIns.length !== 1 ? 's' : ''} from {stats.uniqueUsers} user
          {stats.uniqueUsers !== 1 ? 's' : ''} and {offices.length} office
          location{offices.length !== 1 ? 's' : ''}
        </p>
      </main>
    </div>
  );
}
