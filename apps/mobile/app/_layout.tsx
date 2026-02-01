/**
 * Root Layout
 *
 * Sets up global providers, fonts, and splash screen handling.
 * Entry point for the Expo Router navigation.
 *
 * Configures React Query with AsyncStorage persistence for offline-first support.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/auth';
import { NetworkBanner } from '../src/components/common/NetworkBanner';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create React Query client with offline-first defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // Consider data stale after 5 minutes
      staleTime: 1000 * 60 * 5,
      // Offline-first: use cache immediately, fetch in background
      networkMode: 'offlineFirst',
      // Prevent duplicate calls when app returns to foreground
      refetchOnWindowFocus: false,
      // Retry failed requests twice
      retry: 2,
    },
    mutations: {
      // Offline-first for mutations too
      networkMode: 'offlineFirst',
      retry: 2,
    },
  },
});

// Create AsyncStorage persister for React Query cache
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'satcom-mobile-cache',
});

/**
 * Root layout component
 */
export default function RootLayout() {
  const { initialize, isInitialized } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    const init = async () => {
      await initialize();
      await SplashScreen.hideAsync();
    };
    init();
  }, [initialize]);

  // Wait for auth initialization
  if (!isInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <NetworkBanner />
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="leave" options={{ headerShown: false }} />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
