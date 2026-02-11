/**
 * API Client
 *
 * Typed fetch wrapper for API calls with auth handling.
 */

import { useAuthStore } from '@/store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1';

// Auth API types
export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
    profile?: {
      firstName: string;
      lastName: string;
      designation?: string;
      avatarUrl?: string;
    };
  };
  requiresOtp?: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Auth API functions
export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Login failed');
  }

  return result.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`,
    },
    credentials: 'include',
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error('Token refresh failed');
  }

  return result.data;
}

export async function logoutApi(refreshToken?: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;

  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include',
  });
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(res: Response, method: string, endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    if (res.status === 401 && !this.isRefreshing) {
      // Try to refresh the token once
      this.isRefreshing = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const refreshData = await refreshAccessToken(refreshToken);
          // Update store with new tokens
          useAuthStore.setState({
            accessToken: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
          });

          // Retry the original request with new token
          const retryHeaders: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshData.accessToken}`,
          };
          const retryRes = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: retryHeaders,
            body: data ? JSON.stringify(data) : undefined,
          });

          this.isRefreshing = false;
          return retryRes.json();
        }
      } catch {
        // Refresh failed - clear auth and redirect to login
      }

      this.isRefreshing = false;
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return res.json();
    }

    // For other non-ok responses, still return the JSON (error will be in the response body)
    return res.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(res, 'GET', endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(res, 'POST', endpoint, data);
  }

  async patch<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(res, 'PATCH', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(res, 'DELETE', endpoint);
  }
}

export const api = new ApiClient(API_URL);
