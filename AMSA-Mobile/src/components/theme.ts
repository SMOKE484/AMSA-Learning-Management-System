// src/components/theme.ts
// Single source of truth for the AMSA brand palette.
// Import from here — do NOT define local BRAND objects in screens.

export const BRAND = {
  bg:           '#0A0A0A',
  surface:      '#141414',
  surfaceAlt:   '#1A1A1A',
  border:       'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  red:          '#E8341C',
  redDim:       'rgba(232,52,28,0.15)',
  yellow:       '#F5A800',
  yellowDim:    'rgba(245,168,0,0.15)',
  teal:         '#3ABFBF',
  tealDim:      'rgba(58,191,191,0.15)',
  blue:         '#2B6E9E',
  blueDim:      'rgba(43,110,158,0.15)',

  textPrimary:   '#F0F0F0',
  textSecondary: 'rgba(240,240,240,0.55)',
  textMuted:     'rgba(240,240,240,0.30)',

  // Tab bar glass
  glassBg:             'rgba(12, 12, 12, 0.72)',
  glassBorder:         'rgba(255, 255, 255, 0.10)',
  glassInnerHighlight: 'rgba(255, 255, 255, 0.06)',
};