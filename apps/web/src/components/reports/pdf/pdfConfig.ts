/**
 * PDF Configuration
 *
 * A4 Portrait orientation, tables only (per user decision)
 */

// A4 dimensions: 210mm x 297mm
export const PDF_CONFIG = {
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  format: 'a4' as const,
  margins: { top: 20, right: 14, bottom: 20, left: 14 },
  headerHeight: 35,
  footerHeight: 15,
  colors: {
    primary: [30, 64, 175] as [number, number, number],    // Blue-700
    text: [30, 41, 59] as [number, number, number],        // Navy-900
    textMuted: [100, 116, 139] as [number, number, number], // Silver-500
    alternateRow: [248, 250, 252] as [number, number, number], // Silver-50
  },
};
