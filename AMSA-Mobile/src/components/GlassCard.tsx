// src/components/GlassCard.tsx
// Shared glassmorphism card used across all screens.
// iOS: real BlurView. Android: solid BRAND.surface fallback.

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BRAND } from './theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: object;
  /** Accent bar color (optional) */
  accentColor?: string;
  /** Which edge the accent bar sits on (default: 'left') */
  accentSide?: 'left' | 'top';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  accentColor,
  accentSide = 'left',
}) => (
  <View style={[s.wrapper, style]}>
    {Platform.OS === 'ios' ? (
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
    ) : (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND.surface }]} />
    )}
    {children}
    {accentColor && accentSide === 'left' && (
      <View style={[s.accentLeft, { backgroundColor: accentColor }]} />
    )}
    {accentColor && accentSide === 'top' && (
      <View style={[s.accentTop, { backgroundColor: accentColor }]} />
    )}
  </View>
);

const s = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  accentLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
  },
  accentTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
});