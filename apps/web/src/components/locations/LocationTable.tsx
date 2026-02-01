'use client';

/**
 * LocationTable Component
 *
 * Data table for displaying and managing office locations.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, MapPin, MoreVertical, AlertTriangle } from 'lucide-react';
import type { OfficeLocation } from '@/hooks/useLocations';

interface LocationTableProps {
  locations: OfficeLocation[];
  isLoading: boolean;
  onEdit: (location: OfficeLocation) => void;
  onDelete: (location: OfficeLocation) => void;
}

interface DeleteConfirmModalProps {
  location: OfficeLocation;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ location, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-navy-900">Deactivate Location</h3>
        </div>

        <p className="text-silver-600 mb-6">
          Are you sure you want to deactivate <span className="font-medium text-navy-900">{location.name}</span>?
          This will hide it from the geofence validation. You can reactivate it later.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-silver-600 bg-white border border-silver-200 rounded-lg hover:bg-silver-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Deactivate
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LocationTable({
  locations,
  isLoading,
  onEdit,
  onDelete,
}: LocationTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<OfficeLocation | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleDeleteClick = useCallback((location: OfficeLocation) => {
    setDeleteTarget(location);
    setOpenMenu(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  const formatCoordinates = (lat: number | string, lon: number | string): string => {
    return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
  };

  const truncateAddress = (address: string, maxLength = 40): string => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="border-b border-silver-100 p-4">
            <div className="h-4 bg-silver-200 rounded w-full" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b border-silver-100 last:border-b-0">
              <div className="flex items-center gap-4">
                <div className="h-4 bg-silver-100 rounded w-1/4" />
                <div className="h-4 bg-silver-100 rounded w-1/3" />
                <div className="h-4 bg-silver-100 rounded w-1/6" />
                <div className="h-4 bg-silver-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-silver-200 p-12 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-silver-50 rounded-full mb-4">
          <MapPin size={32} className="text-silver-300" />
        </div>
        <h3 className="text-lg font-medium text-navy-900 mb-2">No Office Locations</h3>
        <p className="text-silver-500">
          Add your first office location to enable geofence verification.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-silver-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-silver-50 border-b border-silver-200 text-sm font-medium text-silver-600">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Address</div>
          <div className="col-span-3">Coordinates</div>
          <div className="col-span-1">Radius</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-silver-100">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-silver-50 transition-colors ${
                !location.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Name */}
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-navy-900 truncate">{location.name}</span>
                </div>
              </div>

              {/* Address */}
              <div className="col-span-3">
                <span
                  className="text-silver-600 text-sm truncate block"
                  title={location.address}
                >
                  {truncateAddress(location.address)}
                </span>
              </div>

              {/* Coordinates */}
              <div className="col-span-3">
                <span className="text-sm text-silver-600 font-mono">
                  {formatCoordinates(location.latitude, location.longitude)}
                </span>
              </div>

              {/* Radius */}
              <div className="col-span-1">
                <span className="text-sm text-silver-600">{location.radiusMeters}m</span>
              </div>

              {/* Status */}
              <div className="col-span-1">
                {location.isActive ? (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700">
                    Inactive
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end relative">
                <button
                  onClick={() => setOpenMenu(openMenu === location.id ? null : location.id)}
                  className="p-2 hover:bg-silver-100 rounded-lg text-silver-500"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {openMenu === location.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-silver-200 py-1 z-10 min-w-[140px]"
                    >
                      <button
                        onClick={() => {
                          onEdit(location);
                          setOpenMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-navy-900 hover:bg-silver-50"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      {location.isActive && (
                        <button
                          onClick={() => handleDeleteClick(location)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Deactivate
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            location={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
