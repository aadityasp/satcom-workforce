/**
 * Satcom Technologies Color Palette
 * Extracted from https://satcom-website.vercel.app/
 *
 * These color tokens provide a consistent visual identity across
 * web and mobile applications. All colors are defined in HSL format
 * for better manipulation and accessibility calculations.
 */

/**
 * Navy color scale - Primary brand color
 * Used for headers, navigation, and primary backgrounds
 */
export const navy = {
  50: '#f0f4f8',
  100: '#d9e2ec',
  200: '#bcccdc',
  300: '#9fb3c8',
  400: '#829ab1',
  500: '#627d98',
  600: '#486581',
  700: '#334e68',
  800: '#243b53',
  900: '#102a43',
  950: '#0a1929',
} as const;

/**
 * Blue color scale - Interactive elements
 * Used for buttons, links, and action items
 */
export const blue = {
  50: '#e6f0ff',
  100: '#b3d1ff',
  200: '#80b3ff',
  300: '#4d94ff',
  400: '#1a75ff',
  500: '#0066ff',
  600: '#0052cc',
  700: '#003d99',
  800: '#002966',
  900: '#001433',
} as const;

/**
 * Silver color scale - Neutral tones
 * Used for text, borders, and subtle backgrounds
 */
export const silver = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
} as const;

/**
 * Semantic color tokens
 * These provide meaning-based color choices for consistent UX
 */
export const semantic = {
  success: {
    light: '#dcfce7',
    main: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#e0f2fe',
    main: '#0ea5e9',
    dark: '#0369a1',
  },
} as const;

/**
 * Presence status colors
 * Used for availability indicators across the app
 */
export const presence = {
  online: '#22c55e',
  away: '#f59e0b',
  offline: '#94a3b8',
  busy: '#ef4444',
} as const;

/**
 * Work mode colors
 * Visual distinction for different work contexts
 */
export const workMode = {
  office: '#0052cc',
  remote: '#7c3aed',
  customerSite: '#059669',
  fieldVisit: '#ea580c',
  travel: '#0891b2',
} as const;

/**
 * Complete color palette export
 */
export const colors = {
  navy,
  blue,
  silver,
  semantic,
  presence,
  workMode,

  // Commonly used shortcuts
  primary: blue[600],
  primaryHover: blue[500],
  primaryActive: blue[700],

  background: {
    primary: '#ffffff',
    secondary: silver[50],
    tertiary: silver[100],
    inverse: navy[950],
  },

  text: {
    primary: navy[900],
    secondary: silver[600],
    tertiary: silver[400],
    inverse: '#ffffff',
    link: blue[600],
  },

  border: {
    light: silver[200],
    default: silver[300],
    dark: silver[400],
  },
} as const;

export type Colors = typeof colors;
