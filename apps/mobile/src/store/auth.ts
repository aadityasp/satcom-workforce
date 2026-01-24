/**
 * Mobile Auth Store
 *
 * Manages authentication state using Zustand with secure storage.
 * Persists tokens using expo-secure-store for security.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@satcom/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Keys for secure storage
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'satcom_access_token',
  REFRESH_TOKEN: 'satcom_refresh_token',
  USER: 'satcom_user',
} as const;

/**
 * Auth store state interface
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
  refreshAccessToken: () => Promise<boolean>;
}

/**
 * Helper to safely get from secure store
 */
async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

/**
 * Helper to safely set in secure store
 */
async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Failed to store ${key}:`, error);
  }
}

/**
 * Helper to safely delete from secure store
 */
async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
  }
}

/**
 * Auth store with secure persistence
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  /**
   * Initialize auth state from secure storage
   * Called on app startup to restore session
   */
  initialize: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        getSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
        getSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
        getSecureItem(STORAGE_KEYS.USER),
      ]);

      const user = userJson ? JSON.parse(userJson) : null;

      set({
        accessToken,
        refreshToken,
        user,
        isInitialized: true,
      });

      // If we have a refresh token, try to refresh the access token
      if (refreshToken && !accessToken) {
        await get().refreshAccessToken();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true });
    }
  },

  /**
   * Login with email and password
   * Stores tokens securely on success
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        set({
          isLoading: false,
          error: data.error?.message || 'Login failed',
        });
        return false;
      }

      // Store tokens securely
      await Promise.all([
        setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken),
        setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken),
        setSecureItem(STORAGE_KEYS.USER, JSON.stringify(data.data.user)),
      ]);

      set({
        user: data.data.user,
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: 'Network error. Please check your connection.',
      });
      return false;
    }
  },

  /**
   * Logout and clear all stored data
   */
  logout: async () => {
    // Clear secure storage
    await Promise.all([
      deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
      deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
      deleteSecureItem(STORAGE_KEYS.USER),
    ]);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  },

  /**
   * Set error message
   */
  setError: (error) => set({ error }),

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Refresh failed, logout user
        await get().logout();
        return false;
      }

      // Store new access token
      await setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);

      set({ accessToken: data.data.accessToken });
      return true;
    } catch {
      return false;
    }
  },
}));
