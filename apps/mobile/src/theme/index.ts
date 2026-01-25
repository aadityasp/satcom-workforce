/**
 * Mobile Theme Configuration
 *
 * Extends the shared design tokens for React Native usage.
 * Includes scaled values for mobile screens.
 */

import { colors } from '@satcom/shared';

/**
 * Typography configuration for React Native
 * Uses system fonts with fallbacks
 */
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/**
 * Shadow presets for React Native
 * iOS uses shadow properties, Android uses elevation
 */
export const shadows = {
  sm: {
    shadowColor: colors.navy[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.navy[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.navy[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },
};

/**
 * Border radius values scaled for mobile
 */
export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

/**
 * Animation timing configuration for React Native Reanimated
 */
export const animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
};

/**
 * Mobile-specific spacing (numeric values for React Native)
 * Matches the shared spacing scale but in pixels
 */
export const spacing = {
  0: 0,
  0.5: 2,    // 2px
  1: 4,      // 4px
  1.5: 6,    // 6px
  2: 8,      // 8px
  2.5: 10,   // 10px
  3: 12,     // 12px
  3.5: 14,   // 14px
  4: 16,     // 16px
  5: 20,     // 20px
  6: 24,     // 24px
  7: 28,     // 28px
  8: 32,     // 32px
  9: 36,     // 36px
  10: 40,    // 40px
  11: 44,    // 44px
  12: 48,    // 48px
  14: 56,    // 56px
  16: 64,    // 64px
  20: 80,    // 80px
  24: 96,    // 96px
} as const;

// Re-export colors from shared (colors work in both web and RN)
export { colors };

/**
 * Theme object combining all tokens
 */
export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  animation,
};

export default theme;
