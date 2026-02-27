// src/utils/formatting.ts
// Shared subject/grade colour maps and helper functions.
// Import from here — do NOT duplicate these in individual screens.

import { BRAND } from '../components/theme';

// ─── Subject colours ─────────────────────────────────────────────────────────
export const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics':           BRAND.blue,
  'Mathematical Literacy': BRAND.blue,
  'Physics':               '#8b5cf6',
  'Physical Sciences':     '#ec4899',
  'Chemistry':             BRAND.teal,
  'Biology':               BRAND.teal,
  'Natural Sciences':      BRAND.teal,
  'Life Sciences':         BRAND.red,
  'English':               BRAND.yellow,
  'Geography':             '#06b6d4',
  'History':               BRAND.red,
  'Computer Science':      '#8b5cf6',
  'Business Studies':      '#8b5cf6',
  'Accounting':            '#06b6d4',
  'Agricultural Sciences': '#84cc16',
  'Art':                   '#ec4899',
  'Music':                 BRAND.yellow,
};

export const SUBJECT_ICONS: Record<string, string> = {
  'Mathematics':           'calculator',
  'Mathematical Literacy': 'calculator',
  'Physics':               'rocket',
  'Physical Sciences':     'flask',
  'Chemistry':             'flask',
  'Biology':               'leaf',
  'Natural Sciences':      'leaf',
  'Life Sciences':         'heart',
  'English':               'book',
  'Geography':             'map',
  'History':               'time',
  'Computer Science':      'bar-chart',
  'Business Studies':      'business',
  'Accounting':            'calculator',
  'Agricultural Sciences': 'leaf',
  'Art':                   'school',
  'Music':                 'school',
};

export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || BRAND.blue;
}

export function getSubjectIcon(subject: string): string {
  return SUBJECT_ICONS[subject] || 'school';
}

// ─── Grade helpers ────────────────────────────────────────────────────────────
export function calculateGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

export function getGradeColor(grade: string): string {
  const map: Record<string, string> = {
    'A+': BRAND.teal, 'A': BRAND.teal,
    'B':  BRAND.blue,
    'C':  BRAND.yellow,
    'D':  BRAND.red,  'F': BRAND.red,
  };
  return map[grade] || BRAND.textSecondary;
}