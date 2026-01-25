/**
 * Location Utilities
 *
 * Provides location permission management and GPS utilities for the mobile app.
 * Used for attendance check-in, heartbeat tracking, and location verification.
 *
 * @module location
 *
 * Accuracy Guidelines:
 * - Use `Accuracy.High` for check-in (one-time, precise measurement)
 * - Use `Accuracy.Balanced` for heartbeats (battery-efficient, periodic updates)
 */

import * as Location from 'expo-location';

/**
 * Re-export Location.Accuracy for convenience
 * Allows consumers to import accuracy levels without importing expo-location directly
 */
export const LocationAccuracy = Location.Accuracy;

/**
 * Permission status result type
 */
export interface LocationPermissionStatus {
  /** Whether foreground location permission is granted */
  foreground: boolean;
  /** Whether background location permission is granted */
  background: boolean;
}

/**
 * Coordinate result from GPS
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions from the user
 *
 * First requests foreground permission (required).
 * If foreground is granted, optionally requests background permission
 * for tracking while app is minimized.
 *
 * @returns Permission status with foreground and background granted flags
 *
 * @example
 * ```ts
 * const { foreground, background } = await requestLocationPermission();
 * if (foreground) {
 *   // Can get location while app is active
 * }
 * if (background) {
 *   // Can track location even when app is in background
 * }
 * ```
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    // Request foreground permission first (required for any location access)
    const foregroundResult = await Location.requestForegroundPermissionsAsync();
    const foreground = foregroundResult.status === 'granted';

    // Only request background if foreground was granted
    let background = false;
    if (foreground) {
      try {
        const backgroundResult = await Location.requestBackgroundPermissionsAsync();
        background = backgroundResult.status === 'granted';
      } catch {
        // Background permission may not be available on all platforms
        console.log('Background location permission not available');
      }
    }

    return { foreground, background };
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return { foreground: false, background: false };
  }
}

/**
 * Check current location permission status without prompting the user
 *
 * Use this to check permissions before performing location-dependent operations.
 * Does NOT prompt the user - use requestLocationPermission() to request.
 *
 * @returns Current permission status for foreground and background
 *
 * @example
 * ```ts
 * const { foreground } = await checkLocationPermission();
 * if (!foreground) {
 *   // Show UI to request permission
 *   await requestLocationPermission();
 * }
 * ```
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    const [foregroundResult, backgroundResult] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' })),
    ]);

    return {
      foreground: foregroundResult.status === 'granted',
      background: backgroundResult.status === 'granted',
    };
  } catch (error) {
    console.error('Failed to check location permission:', error);
    return { foreground: false, background: false };
  }
}

/**
 * Get the current device location
 *
 * Returns the device's current GPS coordinates at the specified accuracy level.
 * Returns null if location cannot be obtained (permission denied, GPS unavailable, etc.)
 *
 * @param accuracy - Location accuracy level (default: High for check-in precision)
 *   - `Accuracy.High` - Best accuracy, higher battery usage (for check-in)
 *   - `Accuracy.Balanced` - Balanced accuracy/battery (for heartbeats)
 *   - `Accuracy.Low` - Lower accuracy, minimal battery impact
 *
 * @returns Coordinates object with latitude/longitude, or null on error
 *
 * @example
 * ```ts
 * // High accuracy for check-in
 * const checkInLocation = await getCurrentLocation(LocationAccuracy.High);
 *
 * // Balanced accuracy for periodic heartbeat
 * const heartbeatLocation = await getCurrentLocation(LocationAccuracy.Balanced);
 *
 * if (checkInLocation) {
 *   console.log(`Lat: ${checkInLocation.latitude}, Lng: ${checkInLocation.longitude}`);
 * }
 * ```
 */
export async function getCurrentLocation(
  accuracy: Location.Accuracy = Location.Accuracy.High
): Promise<Coordinates | null> {
  try {
    // Check permission first
    const { foreground } = await checkLocationPermission();
    if (!foreground) {
      console.warn('Location permission not granted');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
}

/**
 * Watch location with continuous updates
 *
 * Sets up a location watcher that calls the callback whenever location changes.
 * Returns a function to stop watching.
 *
 * @param callback - Function called with new coordinates
 * @param accuracy - Location accuracy level
 * @returns Cleanup function to stop watching
 *
 * @example
 * ```ts
 * const stopWatching = await watchLocation(
 *   (coords) => console.log(coords),
 *   LocationAccuracy.Balanced
 * );
 *
 * // Later: stop watching
 * stopWatching();
 * ```
 */
export async function watchLocation(
  callback: (coords: Coordinates) => void,
  accuracy: Location.Accuracy = Location.Accuracy.Balanced
): Promise<() => void> {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 10, // 10 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error('Failed to watch location:', error);
    return () => {}; // No-op cleanup
  }
}
