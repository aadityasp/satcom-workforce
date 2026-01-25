/**
 * Offline Support Utilities
 *
 * Provides network status detection and offline queue management
 * for the mobile app. Enables offline-first functionality.
 *
 * @module offline
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage key for offline queue
 */
const OFFLINE_QUEUE_KEY = 'satcom-offline-queue';

/**
 * Network status result type
 */
export interface NetworkStatus {
  /** Whether the device is connected to the internet */
  isConnected: boolean;
  /** Whether the connection is reachable (can actually reach the network) */
  isInternetReachable: boolean | null;
  /** Connection type (wifi, cellular, etc.) */
  type: string;
}

/**
 * Queued action for offline processing
 */
export interface QueuedAction {
  /** Unique ID for the action */
  id: string;
  /** Timestamp when action was queued */
  timestamp: number;
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Request body (for POST/PATCH) */
  body?: unknown;
  /** Number of retry attempts */
  retryCount: number;
}

/**
 * Custom hook for monitoring network connectivity
 *
 * Returns real-time network status that updates automatically
 * when connectivity changes.
 *
 * @returns Network status with isConnected, isInternetReachable, and type
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected } = useNetworkStatus();
 *
 *   return (
 *     <View>
 *       <Text>{isConnected ? 'Online' : 'Offline'}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
  });

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}

/**
 * Check current network status (one-time check)
 *
 * Use this for imperative checks. For reactive updates, use useNetworkStatus hook.
 *
 * @returns Promise resolving to current network status
 */
export async function checkNetworkStatus(): Promise<NetworkStatus> {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}

/**
 * Offline Queue Manager
 *
 * Manages a persistent queue of actions to be processed when back online.
 * Uses AsyncStorage for persistence across app restarts.
 */
class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isInitialized = false;
  private listeners: Set<() => void> = new Set();

  /**
   * Initialize the queue from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
      this.queue = [];
      this.isInitialized = true;
    }
  }

  /**
   * Add an action to the queue
   */
  async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    await this.initialize();

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const queuedAction: QueuedAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.persist();
    this.notifyListeners();

    return id;
  }

  /**
   * Remove an action from the queue
   */
  async remove(id: string): Promise<void> {
    await this.initialize();

    this.queue = this.queue.filter((action) => action.id !== id);
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    await this.initialize();
    return [...this.queue];
  }

  /**
   * Get the number of queued actions
   */
  async getCount(): Promise<number> {
    await this.initialize();
    return this.queue.length;
  }

  /**
   * Clear all queued actions
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Increment retry count for an action
   */
  async incrementRetry(id: string): Promise<number> {
    await this.initialize();

    const action = this.queue.find((a) => a.id === id);
    if (action) {
      action.retryCount += 1;
      await this.persist();
    }

    return action?.retryCount ?? 0;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Persist queue to storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * Singleton offline queue instance
 */
export const offlineQueue = new OfflineQueue();

/**
 * Hook to use the offline queue with reactive updates
 *
 * @returns Queue state and methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { count, addToQueue } = useOfflineQueue();
 *
 *   const handleAction = async () => {
 *     await addToQueue({
 *       endpoint: '/attendance/check-in',
 *       method: 'POST',
 *       body: { location: { lat: 0, lng: 0 } },
 *     });
 *   };
 *
 *   return <Text>Pending: {count}</Text>;
 * }
 * ```
 */
/**
 * Simple boolean hook for checking online status
 *
 * Returns true when connected and internet is reachable.
 * More convenient than useNetworkStatus when you only need a boolean.
 *
 * @returns Boolean indicating if device is online
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useIsOnline();
 *
 *   if (!isOnline) {
 *     return <Text>You are offline</Text>;
 *   }
 *
 *   return <Text>Connected!</Text>;
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  return isConnected && isInternetReachable !== false;
}

export function useOfflineQueue() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Get initial count
    offlineQueue.getCount().then(setCount);

    // Subscribe to changes
    const unsubscribe = offlineQueue.subscribe(async () => {
      const newCount = await offlineQueue.getCount();
      setCount(newCount);
    });

    return unsubscribe;
  }, []);

  const addToQueue = useCallback(
    async (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
      return offlineQueue.add(action);
    },
    []
  );

  const removeFromQueue = useCallback(async (id: string) => {
    return offlineQueue.remove(id);
  }, []);

  const getQueuedActions = useCallback(async () => {
    return offlineQueue.getAll();
  }, []);

  const clearQueue = useCallback(async () => {
    return offlineQueue.clear();
  }, []);

  return {
    count,
    addToQueue,
    removeFromQueue,
    getQueuedActions,
    clearQueue,
  };
}
