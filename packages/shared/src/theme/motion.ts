/**
 * Satcom Technologies Motion System
 *
 * Animation and transition tokens for consistent, performant animations
 * across web (Framer Motion) and mobile (React Native Reanimated).
 */

/**
 * Duration scale in milliseconds
 * Short durations for micro-interactions, longer for page transitions
 */
export const duration = {
  instant: 0,
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,

  // Named durations for specific use cases
  microInteraction: 100,
  buttonPress: 150,
  fadeIn: 200,
  slideIn: 300,
  modalOpen: 300,
  pageTransition: 400,
} as const;

/**
 * Easing functions
 * Match CSS timing functions and Reanimated easing
 */
export const easing = {
  // Standard easings
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Custom easings for specific feels
  snappy: 'cubic-bezier(0.2, 0, 0, 1)',
  bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',

  // Spring-like easings (for CSS, actual springs in Reanimated)
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Spring configuration for React Native Reanimated
 * These create natural, physics-based animations
 */
export const springConfig = {
  /** Fast, snappy interactions like button presses */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  /** Default spring for most animations */
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** Smooth, gentle animations for larger elements */
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  /** Bouncy animations for playful interactions */
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 1,
  },
  /** Modal/overlay animations */
  modal: {
    damping: 25,
    stiffness: 200,
    mass: 1,
  },
} as const;

/**
 * Framer Motion transition presets
 * Ready-to-use transition configs for web
 */
export const transitions = {
  /** Quick micro-interactions */
  fast: {
    duration: 0.15,
    ease: [0.2, 0, 0, 1],
  },
  /** Default transition */
  default: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1],
  },
  /** Smooth transitions for larger elements */
  smooth: {
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1],
  },
  /** Spring animation */
  spring: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300,
  },
  /** Modal enter/exit */
  modal: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 200,
  },
} as const;

/**
 * Animation variants for common patterns
 * Use with Framer Motion's variants prop
 */
export const animationVariants = {
  /** Fade in/out */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /** Slide up from bottom */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  /** Slide in from right */
  slideRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  /** Scale up (for modals, popovers) */
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /** List item stagger */
  listItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
} as const;

/**
 * Complete motion export
 */
export const motion = {
  duration,
  easing,
  springConfig,
  transitions,
  animationVariants,
} as const;

export type Motion = typeof motion;
