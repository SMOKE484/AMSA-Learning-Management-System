// src/screens/student/AttendanceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Platform,
} from 'react-native';
import { studentService, Attendance } from '../../services/student';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';


// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  present: BRAND.teal,
  absent:  BRAND.red,
  late:    BRAND.yellow,
  excused: BRAND.blue,
};
const STATUS_ICON: Record<string, string> = {
  present: 'checkmark-circle',
  absent:  'close-circle',
  late:    'time',
  excused: 'information-circle',
};
const getStatusColor = (s: string) => STATUS_COLOR[s] || BRAND.textSecondary;
const getStatusIcon  = (s: string) => STATUS_ICON[s]  || 'help-circle';


// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const StudentAttendanceScreen = () => {
  const [attendance, setAttendance]       = useState<Attendance[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const { logout } = useAuth();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const loadAttendance = async () => {
    try {
      const res = await studentService.getAttendance();
      setAttendance(res.attendance || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        logout();
      } else {
        setAttendance([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttendance(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const filteredAttendance = attendance.filter(record => {
    const dateStr = record.checkIn?.time ?? record.class?.scheduledDate ?? record.createdAt;
    return new Date(dateStr).getMonth() === selectedMonth;
  });

  const presentCount  = filteredAttendance.filter(a => a.status === 'present').length;
  const absentCount   = filteredAttendance.filter(a => a.status === 'absent').length;
  const lateCount     = filteredAttendance.filter(a => a.status === 'late').length;
  const totalCount    = filteredAttendance.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading attendance…</Text>
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
            <Text style={s.title}>Attendance</Text>
            <Text style={s.subtitle}>Track your class attendance</Text>
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
            tintColor={BRAND.teal}
            colors={[BRAND.teal]}
          />
        }
      >

        {/* ── OVERVIEW CARD ─────────────────────────────────────────────── */}
        <GlassCard accentColor={BRAND.teal} style={s.overviewCard}>
          <View style={s.overviewInner}>

            <View style={s.overviewTopRow}>
              <View>
                <Text style={s.overviewLabel}>Monthly Overview</Text>
                <Text style={s.overviewMonth}>{months[selectedMonth]}</Text>
              </View>
              <View style={s.ratePill}>
                <Text style={s.rateValue}>{attendanceRate}%</Text>
              </View>
            </View>

            {/* Stat chips */}
            <View style={s.statsRow}>
              {[
                { count: presentCount,  label: 'Present', color: BRAND.teal   },
                { count: absentCount,   label: 'Absent',  color: BRAND.red    },
                { count: lateCount,     label: 'Late',    color: BRAND.yellow },
              ].map(stat => (
                <View
                  key={stat.label}
                  style={[s.statChip, { backgroundColor: stat.color + '18', borderColor: stat.color + '44' }]}
                >
                  <Text style={[s.statCount, { color: stat.color }]}>{stat.count}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${attendanceRate}%` as any }]} />
            </View>
          </View>
        </GlassCard>

        {/* ── MONTH SELECTOR ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.monthScroll}
          contentContainerStyle={s.monthContent}
        >
          {months.map((month, index) => {
            const active = selectedMonth === index;
            return (
              <TouchableOpacity
                key={month}
                style={[
                  s.monthChip,
                  active
                    ? { backgroundColor: BRAND.teal, borderColor: BRAND.teal }
                    : { backgroundColor: BRAND.surface, borderColor: BRAND.border },
                ]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text style={[s.monthChipText, active && { color: '#fff' }]}>
                  {month.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── SECTION HEADING ───────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionAccent, { backgroundColor: BRAND.teal }]} />
          <Text style={s.sectionTitle}>Attendance Records</Text>
        </View>

        {/* ── RECORDS ───────────────────────────────────────────────────── */}
        {filteredAttendance.length > 0 ? (
          filteredAttendance.map((record, index) => {
            const subject     = record.class?.subject ?? 'Unknown Class';
            const displayDate = record.checkIn?.time ?? record.class?.scheduledDate ?? record.createdAt;
            const color       = getStatusColor(record.status);

            return (
              <GlassCard key={record._id || index} accentColor={color} style={s.recordCard}>
                <View style={s.recordInner}>
                  {/* Icon */}
                  <View style={[s.recordIconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                    <Icon name={getStatusIcon(record.status) as any} size={22} color={color} />
                  </View>

                  {/* Info */}
                  <View style={s.recordBody}>
                    <Text style={s.recordSubject}>{subject}</Text>
                    <Text style={s.recordDate}>{formatDate(displayDate)}</Text>
                    {record.notes ? (
                      <Text style={s.recordNotes}>{record.notes}</Text>
                    ) : null}
                  </View>

                  {/* Status badge */}
                  <View style={[s.statusBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                    <Text style={[s.statusText, { color }]}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            );
          })
        ) : (
          <View style={s.empty}>
            <View style={[s.emptyIconRing, { borderColor: BRAND.border }]}>
              <Icon name="calendar-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No records for {months[selectedMonth]}</Text>
            <Text style={s.emptySub}>Attendance records will appear here</Text>
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
  overviewCard:    { marginBottom: 16 },
  overviewInner:   { padding: 20 },
  overviewTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  overviewLabel:   { fontSize: 12, fontWeight: '600', color: BRAND.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  overviewMonth:   { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 },
  ratePill:        {
    backgroundColor: BRAND.tealDim, borderWidth: 1, borderColor: BRAND.teal + '55',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  rateValue:       { fontSize: 20, fontWeight: '800', color: BRAND.teal },
  statsRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statChip:        { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  statCount:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:       { fontSize: 11, fontWeight: '600', color: BRAND.textMuted, marginTop: 2 },
  progressTrack:   { height: 6, backgroundColor: BRAND.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: BRAND.teal, borderRadius: 3 },

  // Month selector
  monthScroll:   { maxHeight: 52, marginBottom: 20 },
  monthContent:  { gap: 8, alignItems: 'center' },
  monthChip:     { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  monthChipText: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary },

  // Section header
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent:  { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },

  // Record cards
  recordCard:    { marginBottom: 12 },
  recordInner:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  recordIconWrap:{ width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
  recordBody:    { flex: 1, gap: 3 },
  recordSubject: { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.2 },
  recordDate:    { fontSize: 12, color: BRAND.textSecondary },
  recordNotes:   { fontSize: 11, color: BRAND.textMuted, fontStyle: 'italic' },
  statusBadge:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText:    { fontSize: 12, fontWeight: '700' },

  // Empty
  empty:         { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: BRAND.textSecondary, textAlign: 'center' },
  emptySub:      { fontSize: 13, color: BRAND.textMuted, textAlign: 'center', marginTop: 4 },
});

export default StudentAttendanceScreen;