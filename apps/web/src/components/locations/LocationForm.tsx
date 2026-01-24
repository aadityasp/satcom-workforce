'use client';

/**
 * LocationForm Component
 *
 * Form for creating and editing office locations with validation.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Loader2 } from 'lucide-react';
import type { OfficeLocation, CreateLocationInput } from '@/hooks/useLocations';

interface LocationFormProps {
  mode: 'create' | 'edit';
  initialData?: OfficeLocation;
  isLoading: boolean;
  onSubmit: (data: CreateLocationInput) => Promise<boolean>;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  radiusMeters?: string;
}

export function LocationForm({
  mode,
  initialData,
  isLoading,
  onSubmit,
  onCancel,
}: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || '');
  const [radiusMeters, setRadiusMeters] = useState(initialData?.radiusMeters?.toString() || '200');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAddress(initialData.address);
      setLatitude(initialData.latitude.toString());
      setLongitude(initialData.longitude.toString());
      setRadiusMeters(initialData.radiusMeters.toString());
      setErrors({});
      setTouched(new Set());
    }
  }, [initialData]);

  const validate = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    // Name validation: 2-100 characters
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Name must be at most 100 characters';
    }

    // Address validation: 5-500 characters
    if (!address.trim()) {
      newErrors.address = 'Address is required';
    } else if (address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    } else if (address.trim().length > 500) {
      newErrors.address = 'Address must be at most 500 characters';
    }

    // Latitude validation: -90 to 90
    const lat = parseFloat(latitude);
    if (!latitude.trim()) {
      newErrors.latitude = 'Latitude is required';
    } else if (isNaN(lat)) {
      newErrors.latitude = 'Latitude must be a valid number';
    } else if (lat < -90 || lat > 90) {
      newErrors.latitude = 'Latitude must be between -90 and 90';
    }

    // Longitude validation: -180 to 180
    const lon = parseFloat(longitude);
    if (!longitude.trim()) {
      newErrors.longitude = 'Longitude is required';
    } else if (isNaN(lon)) {
      newErrors.longitude = 'Longitude must be a valid number';
    } else if (lon < -180 || lon > 180) {
      newErrors.longitude = 'Longitude must be between -180 and 180';
    }

    // Radius validation: 50 to 5000 meters
    const radius = parseInt(radiusMeters, 10);
    if (!radiusMeters.trim()) {
      newErrors.radiusMeters = 'Radius is required';
    } else if (isNaN(radius)) {
      newErrors.radiusMeters = 'Radius must be a valid number';
    } else if (radius < 50) {
      newErrors.radiusMeters = 'Radius must be at least 50 meters';
    } else if (radius > 5000) {
      newErrors.radiusMeters = 'Radius must be at most 5000 meters';
    }

    return newErrors;
  }, [name, address, latitude, longitude, radiusMeters]);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
    setErrors(validate());
  }, [validate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(new Set(['name', 'address', 'latitude', 'longitude', 'radiusMeters']));

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const data: CreateLocationInput = {
      name: name.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusMeters: parseInt(radiusMeters, 10),
    };

    const success = await onSubmit(data);
    if (success) {
      // Reset form on successful create
      if (mode === 'create') {
        setName('');
        setAddress('');
        setLatitude('');
        setLongitude('');
        setRadiusMeters('200');
        setErrors({});
        setTouched(new Set());
      }
    }
  }, [name, address, latitude, longitude, radiusMeters, validate, onSubmit, mode]);

  const showError = (field: keyof FormErrors) => touched.has(field) && errors[field];

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
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-silver-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-navy-900">
              {mode === 'create' ? 'Add Office Location' : 'Edit Office Location'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-silver-500 hover:text-navy-900 transition-colors rounded-lg hover:bg-silver-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="e.g., Main Office, Branch Jakarta"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                showError('name') ? 'border-red-500' : 'border-silver-200'
              }`}
            />
            {showError('name') && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1">
              Address *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => handleBlur('address')}
              placeholder="Full street address"
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                showError('address') ? 'border-red-500' : 'border-silver-200'
              }`}
            />
            {showError('address') && (
              <p className="text-sm text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                onBlur={() => handleBlur('latitude')}
                placeholder="-6.2088"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  showError('latitude') ? 'border-red-500' : 'border-silver-200'
                }`}
              />
              {showError('latitude') && (
                <p className="text-sm text-red-500 mt-1">{errors.latitude}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                onBlur={() => handleBlur('longitude')}
                placeholder="106.8456"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  showError('longitude') ? 'border-red-500' : 'border-silver-200'
                }`}
              />
              {showError('longitude') && (
                <p className="text-sm text-red-500 mt-1">{errors.longitude}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-silver-500 -mt-2">
            Get coordinates from Google Maps by right-clicking on a location
          </p>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1">
              Geofence Radius *
            </label>
            <div className="relative">
              <input
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                onBlur={() => handleBlur('radiusMeters')}
                placeholder="200"
                min={50}
                max={5000}
                className={`w-full px-3 py-2 pr-16 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  showError('radiusMeters') ? 'border-red-500' : 'border-silver-200'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-silver-500">
                meters
              </span>
            </div>
            {showError('radiusMeters') && (
              <p className="text-sm text-red-500 mt-1">{errors.radiusMeters}</p>
            )}
            <p className="text-xs text-silver-500 mt-1">
              Minimum 50m, maximum 5000m. Typical office: 100-300m.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-silver-100">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-silver-600 bg-white border border-silver-200 rounded-lg hover:bg-silver-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Add Location' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
