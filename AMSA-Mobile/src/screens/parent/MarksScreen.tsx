// src/screens/parent/MarksScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { parentService } from '../../services/parent';
import { useAuth } from '../../context/AuthContext';
import { useRoute } from '@react-navigation/native';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { calculateGrade, getGradeColor } from '../../utils/formatting';


// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ChildMark {
  _id: string;
  student: { _id: string; user: { name: string } };
  subject: string;
  testName: string;
  score: number;
  total: number;
  grade: string;
  date: string;
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentMarksScreen = () => {
  const [marks, setMarks]               = useState<ChildMark[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const { logout } = useAuth();
  const route = useRoute<any>();

  // Pre-select a child when navigated here from the Children screen
  useEffect(() => {
    if (route.params?.childId) {
      setSelectedChild(route.params.childId);
    }
  }, [route.params?.childId]);

  const loadMarks = async () => {
    try {
      const response = await parentService.getChildrenMarks();
      setMarks(response.marks || []);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarks();
    setRefreshing(false);
  };

  useEffect(() => { loadMarks(); }, []);

  // Unique children
  const children = Array.from(new Set(marks.map(m => m.student._id))).map(id => {
    const mark = marks.find(m => m.student._id === id);
    return { id, name: mark?.student.user.name || 'Unknown' };
  });

  const filteredMarks = selectedChild === 'all'
    ? marks
    : marks.filter(m => m.student._id === selectedChild);

  // Group by child → subject
  const marksByChild = filteredMarks.reduce((acc: any, mark) => {
    const childName = mark.student.user.name;
    if (!acc[childName]) acc[childName] = {};
    if (!acc[childName][mark.subject]) acc[childName][mark.subject] = [];
    acc[childName][mark.subject].push(mark);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <BouncingDotsLoader size={20} />
        <Text style={s.loadingText}>Loading marks…</Text>
      </View>
    );
  }

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

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
            <Text style={s.title}>Children Marks</Text>
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
        {/* ── CHILD FILTER ──────────────────────────────────────────────── */}
        {children.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filterScroll}
            contentContainerStyle={s.filterContent}
          >
            {[{ id: 'all', name: 'All Children' }, ...children].map((child) => {
              const active = selectedChild === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    s.filterChip,
                    active
                      ? { backgroundColor: BRAND.red, borderColor: BRAND.red }
                      : { backgroundColor: BRAND.surface, borderColor: BRAND.border },
                  ]}
                  onPress={() => setSelectedChild(child.id)}
                >
                  <Text style={[s.filterChipText, active && { color: '#fff' }]}>{child.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── MARKS BY CHILD ────────────────────────────────────────────── */}
        {Object.keys(marksByChild).length > 0 ? (
          Object.entries(marksByChild).map(([childName, subjects]) => (
            <View key={childName}>
              {/* Child name header */}
              <View style={s.childHeaderRow}>
                <View style={[s.childAvatar]}>
                  <Text style={s.childAvatarText}>
                    {childName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </Text>
                </View>
                <Text style={s.childNameText}>{childName}</Text>
              </View>

              {/* Subject cards */}
              {Object.entries(subjects as any).map(([subject, subjectMarks]: [string, any]) => {
                const avg = subjectMarks.reduce((sum: number, m: any) =>
                  sum + (m.score / m.total * 100), 0) / subjectMarks.length;
                const avgRounded = Math.round(avg);
                const grade = calculateGrade(avg);
                const gradeColor = getGradeColor(grade);

                return (
                  <GlassCard key={subject} accentColor={gradeColor} style={s.subjectCard}>
                    {/* Subject header */}
                    <View style={s.subjectHeader}>
                      <Text style={s.subjectName}>{subject}</Text>
                      <View style={[s.gradeBadge, { backgroundColor: gradeColor + '22', borderColor: gradeColor + '44' }]}>
                        <Text style={[s.gradeText, { color: gradeColor }]}>{grade}</Text>
                      </View>
                    </View>

                    {/* Score + progress */}
                    <View style={s.scoreRow}>
                      <Text style={s.scoreValue}>{avgRounded}</Text>
                      <Text style={s.scoreTotal}>/100</Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${avgRounded}%` as any, backgroundColor: gradeColor }]} />
                    </View>

                    {/* Test rows */}
                    <View style={s.testsWrap}>
                      {subjectMarks.map((mark: any, idx: number) => (
                        <View
                          key={idx}
                          style={[s.testRow, idx < subjectMarks.length - 1 && s.testRowBorder]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.testName}>{mark.testName}</Text>
                            <Text style={s.testDate}>
                              {new Date(mark.date).toLocaleDateString('en-ZA', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <Text style={[s.testMark, { color: getGradeColor(mark.grade || calculateGrade(mark.score / mark.total * 100)) }]}>
                            {Math.round((mark.score / mark.total) * 100)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          ))
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Icon name="school-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No marks available</Text>
            <Text style={s.emptySub}>Marks will appear here once your children's tests are graded</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Filter chips
  filterScroll:  { maxHeight: 52, marginBottom: 16 },
  filterContent: { gap: 8, alignItems: 'center' },
  filterChip:    { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  filterChipText:{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },

  // Child section
  childHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 8 },
  childAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BRAND.teal,
    justifyContent: 'center', alignItems: 'center',
  },
  childAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  childNameText:   { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },

  // Subject card
  subjectCard:   { marginBottom: 14 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  subjectName:   { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3, flex: 1 },
  gradeBadge:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  gradeText:     { fontSize: 14, fontWeight: '800' },

  scoreRow:      { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 8 },
  scoreValue:    { fontSize: 40, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -1 },
  scoreTotal:    { fontSize: 17, color: BRAND.textSecondary, marginLeft: 4, marginBottom: 6 },
  progressTrack: { height: 5, backgroundColor: BRAND.border, borderRadius: 3, overflow: 'hidden', marginHorizontal: 16, marginBottom: 12 },
  progressFill:  { height: '100%', borderRadius: 3 },

  testsWrap:     { backgroundColor: BRAND.surfaceAlt, borderRadius: 12, overflow: 'hidden', marginHorizontal: 12, marginBottom: 12 },
  testRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  testRowBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.border },
  testName:      { fontSize: 13, fontWeight: '600', color: BRAND.textPrimary },
  testDate:      { fontSize: 11, color: BRAND.textMuted, marginTop: 2 },
  testMark:      { fontSize: 15, fontWeight: '700' },

  // Empty
  empty:         { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: BRAND.textSecondary, textAlign: 'center' },
  emptySub:      { fontSize: 13, color: BRAND.textMuted, textAlign: 'center', marginTop: 6 },
});

export default ParentMarksScreen;
