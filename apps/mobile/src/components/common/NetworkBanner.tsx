/**
 * Network Banner Component
 *
 * Displays a banner at the top of the screen when the device is offline.
 * Automatically shows/hides based on network connectivity.
 *
 * Uses animated transitions for smooth appearance/disappearance.
 */

import { Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme';
import { useIsOnline } from '../../lib/offline';

/**
 * Banner that appears when device loses internet connectivity
 *
 * Place at the top of your app layout to show offline status.
 *
 * @example
 * ```tsx
 * <GestureHandlerRootView style={{ flex: 1 }}>
 *   <NetworkBanner />
 *   <Stack>...</Stack>
 * </GestureHandlerRootView>
 * ```
 */
export function NetworkBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={styles.banner}
    >
      <WifiOff size={16} color="#FFFFFF" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.semantic.warning.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
});
