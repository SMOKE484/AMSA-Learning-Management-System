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
// Percentage from a score/total pair; 0 when total is missing/zero so a bad
// mark record never renders NaN% or Infinity%.
export function pct(score: number, total: number): number {
  if (!total) return 0;
  return (score / total) * 100;
}

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

// ─── Date helpers ─────────────────────────────────────────────────────────────
// LOCAL calendar date as YYYY-MM-DD. Never use toISOString().split('T')[0] for
// day comparisons — that's UTC, and SA (UTC+2) evening classes land on the
// wrong day.
export function toLocalDateString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}