/**
 * Auth Store
 *
 * Manages authentication state using Zustand.
 * Sets cookies for middleware access during SSR.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginApi, logoutApi, refreshAccessToken } from '@/lib/api';
import { getDashboardRoute } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  role: string;
  profile?: {
    firstName: string;
    lastName: string;
    designation: string;
    avatarUrl?: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<string | false>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  setError: (error: string | null) => void;
  setHasHydrated: (state: boolean) => void;
  clearAuth: () => void;
}

/**
 * Set auth cookies for middleware access
 */
function setAuthCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  // Access token cookie - short lived
  document.cookie = `access_token=${accessToken}; path=/; max-age=${expiresIn}; SameSite=Lax`;
  // Refresh token cookie - 7 days
  document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/**
 * Clear auth cookies
 */
function clearAuthCookies() {
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'refresh_token=; path=/; max-age=0';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const data = await loginApi({ email, password });

          // Set cookies for middleware
          setAuthCookies(data.accessToken, data.refreshToken, data.expiresIn);

          set({
            user: data.user as User,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
            error: null,
          });

          // Return the dashboard route for this role
          return getDashboardRoute(data.user.role);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network error. Please try again.';
          set({ isLoading: false, error: message });
          return false;
        }
      },

      logout: async () => {
        const { refreshToken } = get();

        try {
          await logoutApi(refreshToken || undefined);
        } catch {
          // Ignore logout errors - clear state anyway
        }

        clearAuthCookies();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const data = await refreshAccessToken(refreshToken);

          // Update cookies and state
          setAuthCookies(data.accessToken, data.refreshToken, data.expiresIn);

          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });

          return true;
        } catch {
          // Refresh failed - clear auth
          clearAuthCookies();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
          });
          return false;
        }
      },

      clearAuth: () => {
        clearAuthCookies();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      setError: (error) => set({ error }),
    }),
    {
      name: 'satcom-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Sync cookies on hydration (in case localStorage has tokens but cookies don't)
        if (state?.accessToken && state?.refreshToken) {
          setAuthCookies(state.accessToken, state.refreshToken, 900); // 15min default
        }
      },
    }
  )
);
