/**
 * Satcom Technologies Design System
 *
 * This module exports all theme tokens for consistent styling
 * across web (Next.js) and mobile (Expo React Native) applications.
 *
 * Usage:
 *   import { colors, typography, spacing } from '@satcom/shared/theme';
 *
 *   // In Tailwind config:
 *   theme: { extend: { colors: colors.navy } }
 *
 *   // In React Native:
 *   const styles = { color: colors.primary }
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './motion';

import { colors, type Colors } from './colors';
import { typography, type Typography } from './typography';
import { spacing, borderRadius, shadows, zIndex, breakpoints, containers } from './spacing';
import { motion, type Motion } from './motion';

/**
 * Complete theme object
 * Provides all design tokens in a single import
 */
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  containers,
  motion,
} as const;

export type Theme = {
  colors: Colors;
  typography: Typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  zIndex: typeof zIndex;
  breakpoints: typeof breakpoints;
  containers: typeof containers;
  motion: Motion;
};

export default theme;
