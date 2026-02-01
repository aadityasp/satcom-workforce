/**
 * Leave Stack Layout
 */

import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function LeaveLayout() {
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
          title: 'Leave',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
