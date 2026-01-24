# Satcom Technologies Brand Guidelines

This document defines the visual identity and design tokens for the Satcom workforce application, extracted from the official Satcom website (https://satcom-website.vercel.app/).

## Color Palette

### Primary Colors - Navy Scale
The primary brand color is a deep navy, conveying professionalism and trust.

| Token | Hex | Usage |
|-------|-----|-------|
| `navy.50` | `#f0f4f8` | Lightest backgrounds |
| `navy.100` | `#d9e2ec` | Subtle backgrounds |
| `navy.200` | `#bcccdc` | Borders, dividers |
| `navy.300` | `#9fb3c8` | Disabled states |
| `navy.400` | `#829ab1` | Placeholder text |
| `navy.500` | `#627d98` | Secondary text |
| `navy.600` | `#486581` | Body text |
| `navy.700` | `#334e68` | Headings |
| `navy.800` | `#243b53` | Primary text |
| `navy.900` | `#102a43` | Darkest text |
| `navy.950` | `#0a1929` | Dark backgrounds |

### Interactive Colors - Blue Scale
Used for buttons, links, and actionable elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `blue.500` | `#0066ff` | Hover states |
| `blue.600` | `#0052cc` | Primary buttons, links |
| `blue.700` | `#003d99` | Active/pressed states |

### Neutral Colors - Silver Scale
For UI chrome, backgrounds, and subtle elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `silver.50` | `#f8fafc` | Page backgrounds |
| `silver.100` | `#f1f5f9` | Card backgrounds |
| `silver.200` | `#e2e8f0` | Borders |
| `silver.300` | `#cbd5e1` | Dividers |
| `silver.400` | `#94a3b8` | Disabled text |
| `silver.500` | `#64748b` | Secondary text |
| `silver.600` | `#475569` | Body text |

### Semantic Colors

| Category | Light | Main | Dark |
|----------|-------|------|------|
| Success | `#dcfce7` | `#22c55e` | `#15803d` |
| Warning | `#fef3c7` | `#f59e0b` | `#b45309` |
| Error | `#fee2e2` | `#ef4444` | `#b91c1c` |
| Info | `#e0f2fe` | `#0ea5e9` | `#0369a1` |

### Presence Status Colors
| Status | Color |
|--------|-------|
| Online | `#22c55e` |
| Away | `#f59e0b` |
| Offline | `#94a3b8` |
| Busy | `#ef4444` |

### Work Mode Colors
| Mode | Color |
|------|-------|
| Office | `#0052cc` |
| Remote | `#7c3aed` |
| Customer Site | `#059669` |
| Field Visit | `#ea580c` |
| Travel | `#0891b2` |

## Typography

### Font Families
- **Primary (Sans)**: Inter, system-ui, -apple-system, sans-serif
- **Display**: Inter, system-ui, sans-serif
- **Monospace**: JetBrains Mono, Fira Code, monospace

### Type Scale
| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| H1 | 36px (2.25rem) | 700 (Bold) | 1.25 | Page titles |
| H2 | 30px (1.875rem) | 600 (Semibold) | 1.25 | Section headings |
| H3 | 24px (1.5rem) | 600 (Semibold) | 1.375 | Card titles |
| H4 | 20px (1.25rem) | 600 (Semibold) | 1.375 | Subsection titles |
| Body | 16px (1rem) | 400 (Regular) | 1.5 | Default text |
| Body Small | 14px (0.875rem) | 400 (Regular) | 1.5 | Secondary text |
| Caption | 12px (0.75rem) | 500 (Medium) | 1.5 | Labels, timestamps |
| Button | 14px (0.875rem) | 500 (Medium) | 1 | Button labels |

## Spacing Scale

Based on a 4px base unit:

| Token | Value | Pixels |
|-------|-------|--------|
| 1 | 0.25rem | 4px |
| 2 | 0.5rem | 8px |
| 3 | 0.75rem | 12px |
| 4 | 1rem | 16px |
| 5 | 1.25rem | 20px |
| 6 | 1.5rem | 24px |
| 8 | 2rem | 32px |
| 10 | 2.5rem | 40px |
| 12 | 3rem | 48px |
| 16 | 4rem | 64px |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 2px | Subtle rounding |
| default | 4px | Inputs, small buttons |
| md | 6px | Cards, modals |
| lg | 8px | Large buttons, panels |
| xl | 12px | Feature cards |
| 2xl | 16px | Large containers |
| full | 9999px | Pills, avatars |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| sm | `0 1px 2px rgb(0 0 0 / 0.05)` | Subtle elevation |
| default | `0 1px 3px rgb(0 0 0 / 0.1)` | Cards |
| md | `0 4px 6px rgb(0 0 0 / 0.1)` | Dropdowns |
| lg | `0 10px 15px rgb(0 0 0 / 0.1)` | Modals |
| xl | `0 20px 25px rgb(0 0 0 / 0.1)` | Dialogs |

## Motion Guidelines

### Duration Scale
| Token | Duration | Usage |
|-------|----------|-------|
| fastest | 50ms | Instant feedback |
| fast | 150ms | Button press, hover |
| normal | 200ms | Default transitions |
| slow | 300ms | Modal open, slide |
| slower | 400ms | Page transitions |

### Easing Functions
| Token | Curve | Usage |
|-------|-------|-------|
| easeOut | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| easeIn | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting |
| easeInOut | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| snappy | `cubic-bezier(0.2, 0, 0, 1)` | Quick, responsive feel |

### Spring Configurations (React Native Reanimated)
| Preset | Damping | Stiffness | Mass | Usage |
|--------|---------|-----------|------|-------|
| snappy | 20 | 300 | 0.8 | Button press |
| default | 15 | 150 | 1 | General animations |
| gentle | 20 | 100 | 1 | Large element moves |
| bouncy | 10 | 180 | 1 | Playful interactions |

## Component States

### Button States
- **Default**: `bg-blue-600 text-white`
- **Hover**: `bg-blue-500` with subtle scale (1.02)
- **Active/Pressed**: `bg-blue-700` with scale (0.98)
- **Disabled**: `bg-silver-300 text-silver-500` with reduced opacity
- **Loading**: Show spinner, disable interaction

### Input States
- **Default**: `border-silver-300 bg-white`
- **Focus**: `border-blue-600 ring-2 ring-blue-100`
- **Error**: `border-error-main bg-error-light`
- **Disabled**: `bg-silver-100 text-silver-400`

### Card States
- **Default**: `bg-white shadow-default rounded-lg`
- **Hover**: `shadow-md` with subtle lift (translateY -2px)
- **Active**: `ring-2 ring-blue-600`

## Accessibility

### Contrast Requirements
- Normal text: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Focus Indicators
All interactive elements must have visible focus states:
- Focus ring: `ring-2 ring-blue-600 ring-offset-2`
- Outline: `outline-2 outline-offset-2 outline-blue-600`

### Reduced Motion
Respect `prefers-reduced-motion` media query:
- Disable or reduce animations
- Use instant transitions
- Keep essential motion only

## Iconography

### Icon Style
- Style: Outlined (not filled) for consistency
- Stroke width: 1.5px - 2px
- Size scale: 16px, 20px, 24px, 32px

### Recommended Icon Sets
- Lucide Icons (primary)
- Heroicons (alternative)

## Implementation

### Web (Next.js + Tailwind)
Tokens are exported from `@satcom/shared/theme` and integrated into `tailwind.config.js`.

### Mobile (Expo React Native)
Import tokens directly:
```typescript
import { colors, typography, spacing } from '@satcom/shared/theme';
```

### Token Location
All tokens are defined in:
- `packages/shared/src/theme/colors.ts`
- `packages/shared/src/theme/typography.ts`
- `packages/shared/src/theme/spacing.ts`
- `packages/shared/src/theme/motion.ts`
