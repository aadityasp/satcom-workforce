/**
 * Mobile Theme Configuration
 *
 * Extends the shared design tokens for React Native usage.
 * Includes scaled values for mobile screens.
 */

import { colors, spacing } from '@satcom/shared';

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

// Re-export shared tokens
export { colors, spacing };

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
