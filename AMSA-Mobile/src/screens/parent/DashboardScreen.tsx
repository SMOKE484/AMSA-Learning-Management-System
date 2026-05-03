// src/screens/parent/DashboardScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { parentService } from '../../services/parent';
import { useNavigation } from '@react-navigation/native';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import * as Notifications from 'expo-notifications';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';



// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatActivityTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ParentStats {
  childrenCount: number;
  totalMarks: number;
  averageAttendance: number;
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentDashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats]             = useState<ParentStats>({ childrenCount: 0, totalMarks: 0, averageAttendance: 0 });
  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const notificationListener = useRef<Notifications.Subscription | null>(null);

  const loadDashboardData = async (isRefreshing = false) => {
    try {
      const [childrenData, marksData, attendanceData] = await Promise.all([
        parentService.getChildren(),
        parentService.getChildrenMarks(),
        parentService.getChildrenAttendance(),
      ]);

      const childrenCount = childrenData.children?.length || 0;
      const allMarks = marksData.marks || [];
      const attendanceRate = attendanceData.rate ?? 0;

      setStats({ childrenCount, totalMarks: allMarks.length, averageAttendance: attendanceRate });

      const activity: any[] = allMarks.slice(0, 3).map((mark: any) => ({
        type: 'mark',
        title: `${mark.student.user.name} — ${mark.subject}`,
        time: formatActivityTime(mark.createdAt || mark.date),
        icon: 'school',
        color: BRAND.teal,
      }));
      setRecentActivity(activity);

    } catch (error: any) {
      if (!isRefreshing) Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    registerForPushNotificationsAsync().catch(console.error);
    notificationListener.current = Notifications.addNotificationReceivedListener(() => loadDashboardData());
    return () => { notificationListener.current?.remove(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'people',        title: 'My Children', color: BRAND.teal,   dim: BRAND.tealDim,   onPress: () => navigation.navigate('Children' as never) },
    { icon: 'school',        title: 'View Marks',  color: BRAND.red,    dim: BRAND.redDim,    onPress: () => navigation.navigate('Marks' as never) },
    { icon: 'notifications', title: 'Alerts',      color: BRAND.yellow, dim: BRAND.yellowDim, onPress: () => Alert.alert('Coming Soon', 'Alerts will be available in a future update.') },
    { icon: 'chatbubble',    title: 'Messages',    color: BRAND.blue,   dim: BRAND.blueDim,   onPress: () => Alert.alert('Coming Soon', 'Messaging will be available in a future update.') },
  ];

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <BouncingDotsLoader size={20} />
        <Text style={s.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: BOTTOM_PAD }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND.red}
          colors={[BRAND.red]}
        />
      }
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <View>
            <Text style={s.welcome}>Welcome back,</Text>
            <Text style={s.userName}>{user?.name}!</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => Alert.alert('Notifications', 'No new notifications at this time.')}
          >
            <Icon name="notifications-outline" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STATS ROW ──────────────────────────────────────────────────── */}
      <View style={s.statsRow}>
        {[
          { icon: 'people',    value: stats.childrenCount,    label: 'Children',   color: BRAND.teal,   dim: BRAND.tealDim   },
          { icon: 'school',    value: stats.totalMarks,       label: 'Tests',      color: BRAND.red,    dim: BRAND.redDim    },
          { icon: 'calendar',  value: `${stats.averageAttendance}%`, label: 'Attendance', color: BRAND.blue, dim: BRAND.blueDim },
        ].map((item, i) => (
          <GlassCard key={i} style={s.statCard} accentColor={item.color} accentSide="top">
            <View style={[s.statIconWrap, { backgroundColor: item.dim }]}>
              <Icon name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={s.statValue}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </GlassCard>
        ))}
      </View>

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionAccent, { backgroundColor: BRAND.red }]} />
            <Text style={s.sectionTitle}>Quick Actions</Text>
          </View>
        </View>
        <View style={s.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              activeOpacity={0.7}
              style={{ width: '48%' }}
            >
              <GlassCard style={s.actionCard}>
                <View style={s.actionCardInner}>
                  <View style={[s.actionIconWrap, { backgroundColor: action.dim, borderColor: action.color + '44' }]}>
                    <Icon name={action.icon as any} size={28} color={action.color} />
                  </View>
                  <Text style={s.actionText}>{action.title}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── RECENT ACTIVITY ────────────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionAccent, { backgroundColor: BRAND.teal }]} />
            <Text style={s.sectionTitle}>Recent Activity</Text>
          </View>
        </View>

        {recentActivity.length > 0 ? recentActivity.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { if (item.type === 'mark') navigation.navigate('Marks' as never); }}
          >
            <GlassCard style={[s.activityCard, { marginBottom: 10 }]}>
              <View style={s.activityInner}>
                <View style={[s.activityIconWrap, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}>
                  <Icon name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.activityTitle}>{item.title}</Text>
                  <Text style={s.activityTime}>{item.time}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={BRAND.textMuted} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        )) : (
          <View style={s.empty}>
            <Icon name="time-outline" size={44} color={BRAND.textMuted} />
            <Text style={s.emptyText}>No recent activity</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
  welcome:          { fontSize: 14, color: BRAND.textSecondary, letterSpacing: 0.3 },
  userName:         { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, marginTop: 2, letterSpacing: -0.5 },
  notifBtn:         { width: 44, height: 44, borderRadius: 14, backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center' },

  // Stats
  statsRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  statCard:     { flex: 1, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue:    { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  statLabel:    { fontSize: 11, color: BRAND.textSecondary, marginTop: 2, fontWeight: '600', textAlign: 'center' },

  // Section
  section:        { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:  { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },

  // Quick actions
  actionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard:     {},
  actionCardInner:{ padding: 20, alignItems: 'center' },
  actionIconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  actionText:     { fontSize: 13, fontWeight: '600', color: BRAND.textPrimary, textAlign: 'center' },

  // Activity
  activityCard:     {},
  activityInner:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activityIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  activityTitle:    { fontSize: 14, fontWeight: '600', color: BRAND.textPrimary, marginBottom: 3 },
  activityTime:     { fontSize: 12, color: BRAND.textSecondary },

  // Empty
  empty:    { alignItems: 'center', paddingVertical: 40 },
  emptyText:{ marginTop: 12, fontSize: 15, color: BRAND.textSecondary, fontWeight: '500' },
});

export default ParentDashboardScreen;
