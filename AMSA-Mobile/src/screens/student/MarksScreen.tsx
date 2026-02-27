// src/screens/student/MarksScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Platform,
} from 'react-native';
import { studentService, Mark } from '../../services/student';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { getSubjectColor, getSubjectIcon, calculateGrade, getGradeColor } from '../../utils/formatting';


// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const StudentMarksScreen = () => {
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [marks, setMarks]               = useState<Mark[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const { logout } = useAuth();

  const terms = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];

  const loadMarks = async () => {
    try {
      const res = await studentService.getMarks();
      setMarks(res.marks || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        logout();
      } else {
        Alert.alert('Error', 'Failed to load marks');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMarks(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarks();
    setRefreshing(false);
  };

  // Group and compute averages
  const marksBySubject = marks.reduce((acc: any, mark) => {
    if (!acc[mark.subject]) acc[mark.subject] = [];
    acc[mark.subject].push(mark);
    return acc;
  }, {});

  const subjectAverages = Object.keys(marksBySubject).map(subject => {
    const subjectMarks = marksBySubject[subject];
    const average = subjectMarks.reduce((sum: number, m: Mark) =>
      sum + (m.score / m.total * 100), 0) / subjectMarks.length;
    return {
      subject,
      average: Math.round(average),
      marks: subjectMarks,
      grade: calculateGrade(average),
    };
  });

  const overallAverage = subjectAverages.length > 0
    ? Math.round(subjectAverages.reduce((s, sub) => s + sub.average, 0) / subjectAverages.length)
    : 0;

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading marks…</Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <View>
            <Text style={s.title}>Marks</Text>
            <Text style={s.subtitle}>Academic Performance</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.listContent, { paddingBottom: BOTTOM_PAD }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.red}
            colors={[BRAND.red]}
          />
        }
      >
        {/* ── OVERVIEW CARD ─────────────────────────────────────────────── */}
        <GlassCard accentColor={BRAND.red} style={s.overviewCard}>
          <View style={s.overviewInner}>
            <Text style={s.overviewLabel}>Overall Average</Text>
            <Text style={s.overviewValue}>{overallAverage}%</Text>

            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${overallAverage}%` as any }]} />
            </View>

            <View style={s.overviewFooter}>
              <View style={[s.gradePill, { backgroundColor: getGradeColor(calculateGrade(overallAverage)) + '22', borderColor: getGradeColor(calculateGrade(overallAverage)) + '55' }]}>
                <Text style={[s.gradePillText, { color: getGradeColor(calculateGrade(overallAverage)) }]}>
                  {calculateGrade(overallAverage)}
                </Text>
              </View>
              <Text style={s.testCountText}>{marks.length} tests completed</Text>
            </View>
          </View>
        </GlassCard>

        {/* ── TERM SELECTOR ─────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.termScroll}
          contentContainerStyle={s.termContent}
        >
          {terms.map(term => {
            const active = selectedTerm === term;
            return (
              <TouchableOpacity
                key={term}
                style={[
                  s.termChip,
                  active
                    ? { backgroundColor: BRAND.red, borderColor: BRAND.red }
                    : { backgroundColor: BRAND.surface, borderColor: BRAND.border },
                ]}
                onPress={() => setSelectedTerm(term)}
              >
                <Text style={[s.termChipText, active && { color: '#fff' }]}>{term}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── SUBJECT CARDS ─────────────────────────────────────────────── */}
        {subjectAverages.length > 0 ? (
          subjectAverages.map(sub => {
            const color = getSubjectColor(sub.subject);
            const gradeColor = getGradeColor(sub.grade);
            return (
              <GlassCard key={sub.subject} accentColor={color} style={s.subjectCard}>
                <View style={s.subjectInner}>

                  {/* Subject header */}
                  <View style={s.subjectTop}>
                    <View style={[s.subjectIconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                      <Icon name={getSubjectIcon(sub.subject) as any} size={24} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.subjectName}>{sub.subject}</Text>
                    </View>
                    <View style={[s.gradeBadge, { backgroundColor: gradeColor + '22', borderColor: gradeColor + '44' }]}>
                      <Text style={[s.gradeText, { color: gradeColor }]}>{sub.grade}</Text>
                    </View>
                  </View>

                  {/* Score */}
                  <View style={s.scoreRow}>
                    <Text style={s.scoreValue}>{sub.average}</Text>
                    <Text style={s.scoreTotal}>/100</Text>
                  </View>

                  {/* Mini progress */}
                  <View style={s.miniTrack}>
                    <View style={[s.miniFill, { width: `${sub.average}%` as any, backgroundColor: color }]} />
                  </View>

                  {/* Recent tests */}
                  <View style={s.testsWrap}>
                    {sub.marks.slice(0, 3).map((test: Mark, idx: number) => (
                      <View
                        key={idx}
                        style={[s.testRow, idx < Math.min(sub.marks.length, 3) - 1 && s.testRowBorder]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.testName}>{test.testName}</Text>
                          <Text style={s.testDate}>
                            {new Date(test.createdAt).toLocaleDateString('en-ZA', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <Text style={[s.testMark, { color }]}>
                          {Math.round((test.score / test.total) * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>

                </View>
              </GlassCard>
            );
          })
        ) : (
          <View style={s.empty}>
            <View style={[s.emptyIconRing, { borderColor: BRAND.border }]}>
              <Icon name="bar-chart-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No marks available yet</Text>
            <Text style={s.emptySub}>Your marks will appear here once graded</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BRAND.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: BRAND.textSecondary },

  // Header
  header:           { backgroundColor: BRAND.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  subtitle:         { fontSize: 13, color: BRAND.textSecondary, marginTop: 4 },

  // List
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Overview card
  overviewCard:  { marginBottom: 16 },
  overviewInner: { padding: 20 },
  overviewLabel: { fontSize: 13, color: BRAND.textSecondary, fontWeight: '600', marginBottom: 4 },
  overviewValue: { fontSize: 52, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -1, marginBottom: 12 },
  progressTrack: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: '100%', backgroundColor: BRAND.red, borderRadius: 3 },
  overviewFooter:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gradePill:     { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  gradePillText: { fontSize: 14, fontWeight: '700' },
  testCountText: { fontSize: 13, color: BRAND.textMuted },

  // Term selector
  termScroll:  { maxHeight: 52, marginBottom: 16 },
  termContent: { gap: 8, alignItems: 'center' },
  termChip:    { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  termChipText:{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },

  // Subject cards
  subjectCard:  { marginBottom: 14 },
  subjectInner: { padding: 18 },
  subjectTop:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  subjectIconWrap:{ width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
  subjectName:  { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },
  gradeBadge:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  gradeText:    { fontSize: 15, fontWeight: '800' },
  scoreRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  scoreValue:   { fontSize: 40, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -1 },
  scoreTotal:   { fontSize: 18, color: BRAND.textSecondary, marginLeft: 4, marginBottom: 6 },
  miniTrack:    { height: 5, backgroundColor: BRAND.border, borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  miniFill:     { height: '100%', borderRadius: 3 },

  // Recent tests
  testsWrap:    { backgroundColor: BRAND.surfaceAlt, borderRadius: 14, overflow: 'hidden' },
  testRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  testRowBorder:{ borderBottomWidth: 1, borderBottomColor: BRAND.border },
  testName:     { fontSize: 13, fontWeight: '600', color: BRAND.textPrimary },
  testDate:     { fontSize: 11, color: BRAND.textMuted, marginTop: 2 },
  testMark:     { fontSize: 15, fontWeight: '700' },

  // Empty
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing:{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: BRAND.textSecondary, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: BRAND.textMuted, textAlign: 'center', marginTop: 4 },
});

export default StudentMarksScreen;