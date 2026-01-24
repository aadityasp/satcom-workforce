'use client';

/**
 * Admin Locations Page
 *
 * SuperAdmin-only page for managing office locations (geofence centers).
 * Supports CRUD operations for office locations.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, MapPin, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useLocations, OfficeLocation, CreateLocationInput, UpdateLocationInput } from '@/hooks';
import { LocationTable } from '@/components/locations/LocationTable';
import { LocationForm } from '@/components/locations/LocationForm';

type FormMode = 'create' | 'edit' | null;

export default function AdminLocationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    locations,
    isLoading,
    isActionLoading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    clearError,
  } = useLocations();

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editLocation, setEditLocation] = useState<OfficeLocation | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'SuperAdmin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch locations on mount and when filter changes
  useEffect(() => {
    fetchLocations(showInactive);
  }, [fetchLocations, showInactive]);

  // Clear error when opening form
  useEffect(() => {
    if (formMode) {
      clearError();
    }
  }, [formMode, clearError]);

  const handleOpenCreate = useCallback(() => {
    setEditLocation(null);
    setFormMode('create');
  }, []);

  const handleOpenEdit = useCallback((location: OfficeLocation) => {
    setEditLocation(location);
    setFormMode('edit');
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormMode(null);
    setEditLocation(null);
  }, []);

  const handleSubmit = useCallback(async (data: CreateLocationInput): Promise<boolean> => {
    let success = false;

    if (formMode === 'create') {
      success = await createLocation(data);
    } else if (formMode === 'edit' && editLocation) {
      const updateData: UpdateLocationInput = data;
      success = await updateLocation(editLocation.id, updateData);
    }

    if (success) {
      handleCloseForm();
      await fetchLocations(showInactive);
    }

    return success;
  }, [formMode, editLocation, createLocation, updateLocation, fetchLocations, showInactive, handleCloseForm]);

  const handleDelete = useCallback(async (location: OfficeLocation) => {
    const success = await deleteLocation(location.id);
    if (success) {
      await fetchLocations(showInactive);
    }
  }, [deleteLocation, fetchLocations, showInactive]);

  // Don't render for non-SuperAdmin
  if (user?.role !== 'SuperAdmin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Header */}
      <header className="bg-white border-b border-silver-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-silver-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <MapPin size={20} className="text-blue-600" />
                </div>
                <h1 className="text-lg font-semibold text-navy-900">Office Locations</h1>
              </div>
            </div>
            <button
              onClick={handleOpenCreate}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Location
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error banner */}
        {error && !formMode && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters and stats */}
        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-silver-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-silver-300 text-blue-600 focus:ring-blue-500"
            />
            Show inactive locations
          </label>
          <p className="text-sm text-silver-500">
            {locations.filter((l) => l.isActive).length} active locations
            {showInactive && locations.some((l) => !l.isActive) && (
              <span> ({locations.filter((l) => !l.isActive).length} inactive)</span>
            )}
          </p>
        </div>

        {/* Locations table */}
        <LocationTable
          locations={locations}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />

        {/* Info card */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-medium text-blue-900 mb-2">About Office Locations</h3>
          <p className="text-sm text-blue-700">
            Office locations define the valid check-in zones for employees working in office mode.
            When an employee checks in, their GPS coordinates are compared against the geofence
            radius of active office locations. If they&apos;re outside all valid zones, the system
            flags the check-in for review.
          </p>
        </div>
      </main>

      {/* Location Form Modal */}
      <AnimatePresence>
        {formMode && (
          <LocationForm
            mode={formMode}
            initialData={editLocation || undefined}
            isLoading={isActionLoading}
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
