/**
 * Chat Stack Layout
 *
 * Navigation layout for chat screens including conversation list
 * and individual message threads.
 *
 * @module app/chat/_layout
 */

import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { color: colors.navy[900], fontWeight: '600' },
        headerTintColor: colors.blue[600],
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Messages',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[threadId]"
        options={{
          title: 'Chat',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
