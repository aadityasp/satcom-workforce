/**
 * useLocation Hook
 *
 * Manages location permissions with user-friendly explanations.
 * Shows an explanation alert before requesting permission to comply with
 * best practices and improve permission acceptance rates.
 *
 * Addresses MOBL-06: "App explains why location needed before requesting"
 *
 * @module hooks/useLocation
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  type Coordinates,
} from '../lib/location';

/**
 * Return type for useLocation hook
 */
export interface UseLocationReturn {
  /** Whether foreground location permission is granted (null = not yet checked) */
  hasPermission: boolean | null;
  /** Whether a permission request is in progress */
  isRequesting: boolean;
  /** Request location permission with explanation dialog */
  requestPermission: () => Promise<boolean>;
  /** Get current GPS coordinates (requests permission if needed) */
  getCurrentPosition: () => Promise<Coordinates | null>;
}

/**
 * Location permission hook with user-friendly explanation
 *
 * Shows an explanation alert before requesting location permission,
 * informing users why location is needed and how it will be used.
 *
 * @returns Location permission state and methods
 *
 * @example
 * ```tsx
 * const { hasPermission, requestPermission, getCurrentPosition } = useLocation();
 *
 * const handleCheckIn = async () => {
 *   const coords = await getCurrentPosition();
 *   if (coords) {
 *     // Use coordinates for check-in
 *   }
 * };
 * ```
 */
export function useLocation(): UseLocationReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * Check permission status on mount (without prompting)
   */
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkLocationPermission();
      setHasPermission(status.foreground);
    };
    checkStatus();
  }, []);

  /**
   * Request location permission with explanation dialog
   *
   * Shows an alert explaining why location is needed before requesting.
   * Returns whether permission was granted.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check current status first
    const currentStatus = await checkLocationPermission();
    if (currentStatus.foreground) {
      setHasPermission(true);
      return true;
    }

    setIsRequesting(true);

    return new Promise((resolve) => {
      Alert.alert(
        'Location Required',
        'Satcom Workforce needs your location to verify your check-in at office locations. Your location is only captured during check-in/out and is not tracked continuously.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsRequesting(false);
              setHasPermission(false);
              resolve(false);
            },
          },
          {
            text: 'Allow',
            onPress: async () => {
              const result = await requestLocationPermission();
              setHasPermission(result.foreground);
              setIsRequesting(false);
              resolve(result.foreground);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }, []);

  /**
   * Get current GPS position
   *
   * Requests permission if not already granted.
   * Returns null if permission denied or location unavailable.
   */
  const getCurrentPosition = useCallback(async (): Promise<Coordinates | null> => {
    // If no permission, request it first
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return null;
      }
    }

    // Get current location
    return getCurrentLocation();
  }, [hasPermission, requestPermission]);

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    getCurrentPosition,
  };
}
