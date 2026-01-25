/**
 * Mobile API Client
 *
 * Typed fetch wrapper for API calls with automatic auth handling,
 * token refresh on 401 responses, and offline-aware error handling.
 *
 * @module api
 */

import { useAuthStore } from '../store/auth';
import type { ApiResponse } from '@satcom/shared';

/**
 * API base URL from environment or default to localhost
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Network error response for offline scenarios
 */
function createNetworkErrorResponse<T>(): ApiResponse<T> {
  return {
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
    },
  };
}

/**
 * API Client class with automatic auth handling and offline awareness
 *
 * Features:
 * - Automatic token attachment from SecureStore via auth store
 * - Token refresh on 401 responses
 * - Graceful network error handling for offline scenarios
 * - FormData support for file uploads
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the current access token from SecureStore
   * Used by external consumers to check auth state
   */
  async getToken(): Promise<string | null> {
    return useAuthStore.getState().accessToken;
  }

  /**
   * Get headers with authorization token
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle response and check for auth errors
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (refreshed) {
        // Retry would need the original request info
        // For simplicity, we just return the error
      }
    }

    return response.json();
  }

  /**
   * Generic request method with offline error handling
   */
  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options?.headers,
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // Handle network errors gracefully (offline scenario)
      if (error instanceof TypeError && error.message.includes('Network')) {
        return createNetworkErrorResponse<T>();
      }
      // Generic error fallback
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // Handle network errors gracefully (offline scenario)
      if (error instanceof TypeError) {
        return createNetworkErrorResponse<T>();
      }
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof TypeError) {
        return createNetworkErrorResponse<T>();
      }
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof TypeError) {
        return createNetworkErrorResponse<T>();
      }
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof TypeError) {
        return createNetworkErrorResponse<T>();
      }
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof TypeError) {
        return createNetworkErrorResponse<T>();
      }
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient(API_URL);

/**
 * Default export alias for convenience
 */
export const api = apiClient;

// Re-export ApiResponse type for convenience
export type { ApiResponse };
