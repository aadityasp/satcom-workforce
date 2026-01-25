# Phase 8: Mobile App - Research

**Researched:** 2026-01-24
**Domain:** React Native / Expo mobile development with real-time features
**Confidence:** HIGH

## Summary

This phase involves building a full-featured mobile application for iOS and Android using the existing Expo SDK 52 foundation already scaffolded in `apps/mobile`. The app needs to support authentication with session persistence, location-aware attendance tracking (check-in/out), timesheet entry, real-time team presence/availability, and chat functionality (1:1 and groups). Offline capabilities for viewing and draft entry are also required.

The mobile app already has a solid foundation with Expo Router v4, Zustand state management, React Query for data fetching, and expo-secure-store for token storage. The patterns established in the web app (stores for chat/presence, hooks for data operations) should be mirrored in mobile with platform-specific adaptations for location permissions and background tracking.

**Primary recommendation:** Leverage the existing `apps/mobile` scaffold with Expo SDK 52, mirror web patterns for hooks/stores, use expo-location for GPS with proper permission flows, and integrate Socket.IO for real-time chat/presence using the same WebSocket infrastructure as web.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ~52.0.0 | Framework | Official React Native toolchain with managed workflow |
| expo-router | ~4.0.0 | Navigation | File-based routing matching Next.js patterns |
| expo-location | ~18.0.0 | GPS/Location | First-party Expo module with background tracking |
| expo-secure-store | ~14.0.0 | Token storage | Secure keychain/keystore integration |
| zustand | ^4.5.2 | State management | Matches web app, simple and lightweight |
| @tanstack/react-query | ^5.40.0 | Data fetching | Matches web app, built-in caching |
| socket.io-client | ^4.7.5 | Real-time | Same as web for chat/presence |
| react-native-reanimated | ~3.16.0 | Animations | 60fps native-driver animations |

### Supporting (To Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-task-manager | ~12.0.0 | Background tasks | Background location tracking |
| @react-native-community/netinfo | ^11.4.0 | Network detection | Offline mode detection |
| @react-native-async-storage/async-storage | ^2.1.0 | Offline cache | Query persistence, drafts |
| @tanstack/query-async-storage-persister | ^5.40.0 | Query persistence | Offline-first caching |
| @tanstack/react-query-persist-client | ^5.40.0 | Persistence provider | Wrap query client |
| date-fns | ^3.2.0 | Date formatting | Matches web app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-location | react-native-background-geolocation | More features but requires license ($299/year), overkill for check-in use case |
| AsyncStorage | react-native-mmkv | 10x faster but adds native dependency, not needed at our scale |
| react-native-gifted-chat | Custom chat UI | Gifted Chat is feature-rich but custom matches web design |

**Installation:**
```bash
cd apps/mobile
npx expo install expo-task-manager @react-native-community/netinfo @react-native-async-storage/async-storage
npm install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
apps/mobile/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Auth redirect
│   ├── login.tsx                # Login screen
│   ├── (tabs)/                  # Main tab navigation
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── index.tsx            # Dashboard/Home
│   │   ├── attendance.tsx       # Check-in/out
│   │   ├── timesheet.tsx        # Timesheet entry
│   │   ├── team.tsx             # Team presence
│   │   └── profile.tsx          # User profile
│   └── chat/                    # Chat screens
│       ├── _layout.tsx          # Stack for chat
│       ├── index.tsx            # Conversations list
│       └── [threadId].tsx       # Chat thread
├── src/
│   ├── components/              # Reusable components
│   │   ├── attendance/          # Attendance-specific
│   │   ├── chat/                # Chat components
│   │   ├── common/              # Buttons, cards, inputs
│   │   └── team/                # Team presence components
│   ├── hooks/                   # Custom hooks (mirror web)
│   │   ├── useAttendance.ts
│   │   ├── useTimesheets.ts
│   │   ├── useChat.ts
│   │   ├── usePresence.ts
│   │   └── useLocation.ts       # Mobile-specific
│   ├── store/                   # Zustand stores
│   │   ├── auth.ts              # (exists)
│   │   ├── chat.ts              # Mirror web
│   │   └── presence.ts          # Mirror web
│   ├── lib/                     # Utilities
│   │   ├── api.ts               # (exists)
│   │   ├── location.ts          # Location helpers
│   │   └── offline.ts           # Offline queue
│   └── theme/                   # (exists)
│       └── index.ts
└── app.json                     # Expo configuration
```

### Pattern 1: Expo Router Protected Routes
**What:** Use Stack.Protected with auth guard for navigation protection
**When to use:** Prevent unauthenticated access to main app screens
**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/authentication/
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;

  return (
    <Stack>
      <Stack.Screen name="login" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" />
      </Stack.Protected>
    </Stack>
  );
}
```

### Pattern 2: Location Permission Flow (iOS/Android)
**What:** Request foreground first, then background if needed
**When to use:** Before check-in with GPS capture
**Example:**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/location/
import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<{
  granted: boolean;
  background: boolean;
}> {
  // Step 1: Request foreground permission
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== 'granted') {
    return { granted: false, background: false };
  }

  // Step 2: Request background permission (optional, for tracking)
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

  return {
    granted: true,
    background: backgroundStatus === 'granted',
  };
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
```

### Pattern 3: Socket.IO Mobile Reconnection
**What:** Configure Socket.IO for mobile network volatility
**When to use:** Chat and presence WebSocket connections
**Example:**
```typescript
// Source: Based on existing web patterns + mobile best practices
import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export function createMobileSocket(url: string, token: string): Socket {
  const socket = io(url, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,       // More attempts for mobile
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,    // Longer max for cellular
    timeout: 20000,                 // Longer timeout for slow networks
  });

  // Handle app state changes
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active' && !socket.connected) {
      socket.connect();
    }
  });

  // Handle network changes
  NetInfo.addEventListener((state) => {
    if (state.isConnected && !socket.connected) {
      socket.connect();
    }
  });

  return socket;
}
```

### Pattern 4: Offline-First with React Query
**What:** Persist queries and mutations for offline support
**When to use:** Enable viewing data offline and queuing actions
**Example:**
```typescript
// Source: https://tanstack.com/query/v5/docs/react/plugins/persistQueryClient
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5,    // 5 minutes
      networkMode: 'offlineFirst',
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'satcom-query-cache',
});

// In _layout.tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister: asyncStoragePersister }}
>
  {children}
</PersistQueryClientProvider>
```

### Anti-Patterns to Avoid
- **Polling in background:** Use expo-task-manager with proper intervals, not setInterval
- **Blocking main thread:** Never do heavy computation or storage on JS thread
- **Ignoring platform differences:** Test on both iOS and Android; behavior differs
- **Hard-coded API URLs:** Use environment variables (EXPO_PUBLIC_API_URL)
- **Storing tokens in AsyncStorage:** Always use expo-secure-store for sensitive data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token storage | Custom encrypted storage | expo-secure-store | Keychain/Keystore integration, tested security |
| Location permissions | Manual permission checks | expo-location permission methods | Handles iOS/Android differences |
| Network detection | AppState + manual checks | @react-native-community/netinfo | Reliable, handles edge cases |
| Background tasks | setInterval hacks | expo-task-manager | OS-native scheduling, battery efficient |
| Offline data | Custom SQLite wrapper | React Query + AsyncStorage persister | Built-in cache invalidation |
| Chat UI | Custom message components | Match web patterns | Consistency across platforms |
| Pull-to-refresh | Custom scroll handlers | RefreshControl component | Native feel, performance |

**Key insight:** Mobile has many platform-specific edge cases (permissions, background execution, network state). Expo's first-party modules handle these comprehensively. Custom solutions often break on specific OS versions or devices.

## Common Pitfalls

### Pitfall 1: Background Location Not Working in Expo Go
**What goes wrong:** Background location tracking silently fails in development
**Why it happens:** Expo Go doesn't support background location on Android; limited on iOS
**How to avoid:** Use development builds (`npx expo prebuild && npx expo run:ios`)
**Warning signs:** Location only updates when app is in foreground

### Pitfall 2: iOS "Allow Once" Permission Edge Case
**What goes wrong:** User selects "Allow Once", background permission request returns denied
**Why it happens:** iOS doesn't distinguish "Allow Once" from "When In Use" programmatically
**How to avoid:** Always check permission status before each location request; show UI explaining why Always permission is needed
**Warning signs:** Background permission works on first launch but not subsequently

### Pitfall 3: Socket Disconnects When App Backgrounds
**What goes wrong:** Chat messages missed, presence shows offline incorrectly
**Why it happens:** iOS suspends network connections when app is backgrounded
**How to avoid:** Reconnect on AppState change to 'active'; fetch missed messages on reconnect
**Warning signs:** Inconsistent message delivery, delayed notifications

### Pitfall 4: AsyncStorage 6MB Limit on Android
**What goes wrong:** Offline cache stops working after accumulating data
**Why it happens:** Default Android AsyncStorage SQLite limit is 6MB
**How to avoid:** Implement cache eviction strategy; monitor storage size; use pagination
**Warning signs:** App slows down, storage operations fail silently

### Pitfall 5: Duplicate API Calls on Tab Focus
**What goes wrong:** Same data fetched multiple times, poor performance
**Why it happens:** React Query refetches on window focus; tabs trigger focus events
**How to avoid:** Configure `refetchOnWindowFocus: false` for mobile; use staleTime
**Warning signs:** Network waterfall on every tab switch

### Pitfall 6: Location Accuracy Drains Battery
**What goes wrong:** Users complain about battery drain
**Why it happens:** Using Accuracy.BestForNavigation continuously
**How to avoid:** Use Accuracy.High for check-in (one-time), Accuracy.Balanced for heartbeats
**Warning signs:** High battery usage in device settings

## Code Examples

Verified patterns from official sources and existing codebase:

### Attendance Check-In with Location
```typescript
// Source: Based on existing useAttendance.ts + expo-location docs
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/auth';

export async function checkInWithLocation(workMode: WorkMode): Promise<boolean> {
  // Request permission if needed
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Location Required',
      'Location permission is required for check-in. Please enable it in Settings.',
      [{ text: 'OK' }]
    );
    return false;
  }

  // Get current location
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  // Call API
  const response = await api.post('/attendance/check-in', {
    workMode,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });

  return response.success;
}
```

### Chat Store (Mobile Version)
```typescript
// Source: Based on existing web chat.ts store
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Same interface as web
interface ChatState {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  messages: Map<string, ChatMessage[]>;
  // ... same as web

  connect: (token: string) => void;
  disconnect: () => void;
  // ... same methods as web
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state matches web

  connect: (token: string) => {
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,  // More for mobile
      reconnectionDelayMax: 10000,
    });

    // Same event handlers as web...

    // Mobile-specific: reconnect on app foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !socket.connected) {
        socket.connect();
      }
    });

    // Mobile-specific: reconnect on network restore
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !socket.connected) {
        socket.connect();
      }
    });

    set({ socket });
  },

  // ... rest matches web implementation
}));
```

### Secure Token Refresh
```typescript
// Source: Existing mobile auth.ts + expo-secure-store docs
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'satcom_access_token',
  REFRESH_TOKEN: 'satcom_refresh_token',
};

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, data.data.accessToken);
      if (data.data.refreshToken) {
        await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-permissions | Module-specific permission methods | Expo SDK 41 | Use Location.requestForegroundPermissionsAsync() |
| AsyncStorage from RN core | @react-native-async-storage/async-storage | 2020 | Community package is maintained |
| Manual navigation | Expo Router file-based | Expo SDK 49+ | Simpler, matches web patterns |
| Redux for state | Zustand | 2022-2023 | Less boilerplate, easier persistence |
| Class components | Functional + hooks | 2019+ | Better patterns, cleaner code |

**Deprecated/outdated:**
- `expo-permissions`: Removed in SDK 48+, use module-specific methods
- `AsyncStorage` from 'react-native': Use community package
- `react-navigation` manual setup: Use expo-router instead

## Open Questions

Things that couldn't be fully resolved:

1. **Push Notifications**
   - What we know: Not in explicit requirements but typical for chat/presence apps
   - What's unclear: Whether MOBL-05 (chat) implies push notification support
   - Recommendation: Defer to Phase 9 or future enhancement; current scope is app features

2. **Biometric Authentication**
   - What we know: expo-secure-store supports biometric-protected entries
   - What's unclear: Whether MOBL-01 (login) should support Face ID/fingerprint
   - Recommendation: Nice-to-have; implement basic login first, add biometric later

3. **Deep Linking**
   - What we know: Expo Router supports universal links
   - What's unclear: Whether chat messages should deep link
   - Recommendation: Configure basic deep linking; extend for chat if needed

## Sources

### Primary (HIGH confidence)
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/) - Permission flow, background tracking
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/) - Token storage API
- [Expo Router Authentication](https://docs.expo.dev/router/advanced/authentication/) - Protected routes pattern
- [Expo TaskManager Documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/) - Background task execution
- Existing codebase: `apps/mobile/src/store/auth.ts`, `apps/web/src/store/chat.ts`

### Secondary (MEDIUM confidence)
- [TanStack Query Persistence](https://tanstack.com/query/v5/docs/react/plugins/persistQueryClient) - Offline caching
- [Expo Local-First Guide](https://docs.expo.dev/guides/local-first/) - Offline architecture
- [Building Location-Based Features with Expo](https://coffey.codes/articles/building-location-based-features-using-expo-location) - Community patterns

### Tertiary (LOW confidence)
- WebSearch results for React Native mobile patterns 2026 - General best practices
- [React Native Background Geolocation 2026](https://dev.to/sherry_walker_bba406fb339/react-native-background-geolocation-for-mobile-apps-2026-2ibd) - Battery optimization tips

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already established in apps/mobile, official Expo docs
- Architecture: HIGH - Mirrors existing web patterns, official Expo Router docs
- Pitfalls: MEDIUM - Mix of official docs and community experience

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - Expo SDK stable, patterns established)
