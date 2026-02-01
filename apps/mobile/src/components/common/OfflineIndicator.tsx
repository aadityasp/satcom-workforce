/**
 * Offline Indicator Component
 *
 * Small indicator that shows online/offline status.
 * Useful for displaying in headers or profile screens.
 */

import { View, Text, StyleSheet } from 'react-native';
import { Cloud, CloudOff } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { useIsOnline } from '../../lib/offline';

interface OfflineIndicatorProps {
  /**
   * Whether to show the indicator when online.
   * By default, only shows when offline.
   */
  showWhenOnline?: boolean;
}

/**
 * Compact indicator for network status
 *
 * Shows cloud icon with status text.
 * By default only visible when offline.
 *
 * @example
 * ```tsx
 * // Show only when offline
 * <OfflineIndicator />
 *
 * // Always show status
 * <OfflineIndicator showWhenOnline />
 * ```
 */
export function OfflineIndicator({ showWhenOnline = false }: OfflineIndicatorProps) {
  const isOnline = useIsOnline();

  if (isOnline && !showWhenOnline) return null;

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      {isOnline ? (
        <Cloud size={14} color={colors.semantic.success.main as string} />
      ) : (
        <CloudOff size={14} color={colors.semantic.warning.main as string} />
      )}
      <Text style={[styles.text, !isOnline && styles.offlineText]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.silver[100],
    marginTop: spacing[3],
  },
  offline: {
    backgroundColor: colors.semantic.warning.light,
  },
  text: {
    fontSize: typography.fontSize.xs,
    color: colors.semantic.success.main,
  },
  offlineText: {
    color: colors.semantic.warning.main,
  },
});
