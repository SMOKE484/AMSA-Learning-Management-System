// src/screens/parent/AttendanceScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Image,
} from 'react-native';
import { parentService, ChildAttendanceRecord } from '../../services/parent';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { GlassCard } from '../../components/GlassCard';
import { getAvatarUrl } from '../../utils/avatarUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_ICON: Record<string, string> = {
  present:    'checkmark-circle',
  absent:     'close-circle',
  late:       'time',
  excused:    'information-circle',
  left_early: 'exit-outline',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },

  header:           { backgroundColor: colors.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle:         { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  overviewCard:   { marginBottom: 16 },
  overviewInner:  { padding: 20 },
  overviewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  overviewLabel:  { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  overviewMonth:  { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  ratePill:       { backgroundColor: colors.tealDim, borderWidth: 1, borderColor: colors.teal + '55', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  rateValue:      { fontSize: 20, fontWeight: '800', color: colors.teal },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statChip:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  statCount:      { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel:      { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  progressTrack:  { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 3 },

  filterScroll:   { maxHeight: 52, marginBottom: 14 },
  filterContent:  { gap: 8, alignItems: 'center' },
  filterChip:     { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  monthScroll:   { maxHeight: 52, marginBottom: 20 },
  monthContent:  { gap: 8, alignItems: 'center' },
  monthChip:     { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  monthChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent:  { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },

  childRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 4 },
  childAvatar:    { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  childName:      { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  recordCard:     { marginBottom: 12 },
  recordInner:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  recordIconWrap: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
  recordBody:     { flex: 1, gap: 3 },
  recordSubject:  { fontSize: 15, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 },
  recordDate:     { fontSize: 12, color: colors.textSecondary },
  recordNotes:    { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  statusBadge:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText:     { fontSize: 12, fontWeight: '700' },

  empty:         { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  emptySub:      { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentAttendanceScreen = () => {
  const { logout } = useAuth();
  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const [records, setRecords]           = useState<ChildAttendanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const STATUS_COLOR: Record<string, string> = {
    present:    BRAND.teal,
    absent:     BRAND.red,
    late:       BRAND.yellow,
    excused:    BRAND.blue,
    left_early: BRAND.yellow,
  };
  const getStatusColor = (st: string) => STATUS_COLOR[st] || BRAND.textSecondary;
  const getStatusLabel = (st: string) =>
    st === 'left_early' ? 'Left Early' : st.charAt(0).toUpperCase() + st.slice(1);

  const loadRecords = async () => {
    try {
      const res = await parentService.getChildrenAttendanceRecords();
      setRecords(res.records || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        logout();
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  // Unique children derived from records
  const children = useMemo(() => {
    const seen = new Map<string, string>();
    records.forEach(r => {
      if (!seen.has(r.student._id)) seen.set(r.student._id, r.student.user.name);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [records]);

  const getRecordDate = (r: ChildAttendanceRecord) =>
    r.checkIn?.time ?? r.class?.scheduledDate ?? r.createdAt;

  const filteredByChild = selectedChild === 'all'
    ? records
    : records.filter(r => r.student._id === selectedChild);

  const filteredRecords = filteredByChild.filter(r =>
    new Date(getRecordDate(r)).getMonth() === selectedMonth
  );

  // Stats for overview
  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const absentCount  = filteredRecords.filter(r => r.status === 'absent').length;
  const lateCount    = filteredRecords.filter(r => r.status === 'late' || r.status === 'left_early').length;
  const totalCount   = filteredRecords.length;
  const rate         = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Group by child when "All" selected so each child's records are together
  const groupedByChild = useMemo(() => {
    const map: Record<string, ChildAttendanceRecord[]> = {};
    filteredRecords.forEach(r => {
      const name = r.student.user.name;
      if (!map[name]) map[name] = [];
      map[name].push(r);
    });
    return map;
  }, [filteredRecords]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading attendance…</Text>
    </View>
  );

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
          <Text style={s.title}>Attendance</Text>
          <Text style={s.subtitle}>Track your children's attendance</Text>
        </View>
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.listContent, { paddingBottom: BOTTOM_PAD }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.teal} colors={[BRAND.teal]} />
        }
      >

        {/* ── OVERVIEW CARD ─────────────────────────────────────────────── */}
        <GlassCard accentColor={BRAND.teal} style={s.overviewCard}>
          <View style={s.overviewInner}>
            <View style={s.overviewTopRow}>
              <View>
                <Text style={s.overviewLabel}>Monthly Overview</Text>
                <Text style={s.overviewMonth}>{MONTHS[selectedMonth]}</Text>
              </View>
              <View style={s.ratePill}>
                <Text style={s.rateValue}>{rate}%</Text>
              </View>
            </View>
            <View style={s.statsRow}>
              {[
                { count: presentCount, label: 'Present', color: BRAND.teal   },
                { count: absentCount,  label: 'Absent',  color: BRAND.red    },
                { count: lateCount,    label: 'Late',     color: BRAND.yellow },
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
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${rate}%` as any, backgroundColor: BRAND.teal }]} />
            </View>
          </View>
        </GlassCard>

        {/* ── CHILD FILTER ──────────────────────────────────────────────── */}
        {children.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filterScroll}
            contentContainerStyle={s.filterContent}
          >
            {[{ id: 'all', name: 'All Children' }, ...children].map(child => {
              const active = selectedChild === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    s.filterChip,
                    active
                      ? { backgroundColor: BRAND.teal, borderColor: BRAND.teal }
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

        {/* ── MONTH SELECTOR ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.monthScroll}
          contentContainerStyle={s.monthContent}
        >
          {MONTHS.map((month, index) => {
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
                <Text style={[s.monthChipText, active && { color: '#fff' }]}>{month.slice(0, 3)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── RECORDS ───────────────────────────────────────────────────── */}
        {Object.keys(groupedByChild).length > 0 ? (
          Object.entries(groupedByChild).map(([childName, childRecords]) => (
            <View key={childName}>
              {selectedChild === 'all' && (
                <View style={s.childRow}>
                  <Image source={{ uri: getAvatarUrl(childName) }} style={s.childAvatar} />
                  <Text style={s.childName}>{childName}</Text>
                </View>
              )}

              <View style={[s.sectionHeader, { marginTop: selectedChild === 'all' ? 0 : 0 }]}>
                <View style={[s.sectionAccent, { backgroundColor: BRAND.teal }]} />
                <Text style={s.sectionTitle}>Attendance Records</Text>
              </View>

              {childRecords.map((record, idx) => {
                const color       = getStatusColor(record.status);
                const subject     = record.class?.subject ?? 'Unknown Class';
                const displayDate = getRecordDate(record);

                return (
                  <GlassCard key={record._id || idx} accentColor={color} style={s.recordCard}>
                    <View style={s.recordInner}>
                      <View style={[s.recordIconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                        <Icon name={(STATUS_ICON[record.status] || 'help-circle') as any} size={22} color={color} />
                      </View>
                      <View style={s.recordBody}>
                        <Text style={s.recordSubject}>{subject}</Text>
                        <Text style={s.recordDate}>{formatDate(displayDate)}</Text>
                        {record.notes ? <Text style={s.recordNotes}>{record.notes}</Text> : null}
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                        <Text style={[s.statusText, { color }]}>{getStatusLabel(record.status)}</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          ))
        ) : (
          <View style={s.empty}>
            <View style={[s.emptyIconRing, { borderColor: BRAND.border }]}>
              <Icon name="calendar-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No records for {MONTHS[selectedMonth]}</Text>
            <Text style={s.emptySub}>Attendance records will appear here once marked</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

export default ParentAttendanceScreen;
