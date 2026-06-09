// src/components/theme.ts
// Single source of truth for the AMSA brand palette.
// Import from here — do NOT define local BRAND objects in screens.

export interface BrandPalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  red: string;
  redDim: string;
  yellow: string;
  yellowDim: string;
  teal: string;
  tealDim: string;
  blue: string;
  blueDim: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassBg: string;
  glassBorder: string;
  glassInnerHighlight: string;
}

export const DARK_PALETTE: BrandPalette = {
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

  glassBg:             'rgba(12, 12, 12, 0.72)',
  glassBorder:         'rgba(255, 255, 255, 0.10)',
  glassInnerHighlight: 'rgba(255, 255, 255, 0.06)',
};

export const LIGHT_PALETTE: BrandPalette = {
  bg:           '#F8F8F8',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F0F0F0',
  border:       'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',

  red:          '#E8341C',
  redDim:       'rgba(232,52,28,0.12)',
  yellow:       '#F5A800',
  yellowDim:    'rgba(245,168,0,0.12)',
  teal:         '#3ABFBF',
  tealDim:      'rgba(58,191,191,0.12)',
  blue:         '#2B6E9E',
  blueDim:      'rgba(43,110,158,0.12)',

  textPrimary:   '#1A1A1A',
  textSecondary: 'rgba(26,26,26,0.55)',
  textMuted:     'rgba(26,26,26,0.40)',

  glassBg:             'rgba(248,248,248,0.85)',
  glassBorder:         'rgba(0,0,0,0.10)',
  glassInnerHighlight: 'rgba(255,255,255,0.60)',
};

// Backward-compat alias so AnimatedSplashScreen and other static imports still compile.
export const BRAND = DARK_PALETTE;
