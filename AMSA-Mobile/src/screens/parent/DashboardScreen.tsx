// src/screens/parent/DashboardScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { parentService } from '../../services/parent';
import { getNotifications } from '../../services/notifications';
import { messageService } from '../../services/messages';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { ParentStackParamList } from '../../types/navigation';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import * as Notifications from 'expo-notifications';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BrandPalette } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatActivityTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

interface ParentStats {
  childrenCount: number;
  totalMarks: number;
  averageAttendance: number;
}

// ─── Styles factory ───────────────────────────────────────────────────────────
const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },

  header:           { backgroundColor: colors.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
  welcome:          { fontSize: 14, color: colors.textSecondary, letterSpacing: 0.3 },
  userName:         { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 2, letterSpacing: -0.5 },
  notifBtn:         { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },

  statsRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  statCard:     { flex: 1, padding: 14, alignItems: 'center' },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue:    { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  statLabel:    { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600', textAlign: 'center' },

  section:        { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:  { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },

  actionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard:     {},
  actionCardInner:{ padding: 20, alignItems: 'center' },
  actionIconWrap: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  actionText:     { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },

  activityCard:     {},
  activityInner:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activityIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  activityTitle:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  activityTime:     { fontSize: 12, color: colors.textSecondary },

  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    padding: 14, borderRadius: 14,
    borderWidth: 1,
  },
  verifyBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  verifyBannerLink: { fontSize: 13, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingVertical: 40 },
  emptyText:{ marginTop: 12, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentDashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<ParentStackParamList>>();
  const [stats, setStats]             = useState<ParentStats>({ childrenCount: 0, totalMarks: 0, averageAttendance: 0 });
  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

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
    getNotifications(1, true).then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    messageService.getConversations().then(({ conversations }) => {
      setUnreadMsgCount(conversations.reduce((sum, c) => sum + (c.unreadByParent || 0), 0));
    }).catch(() => {});
    registerForPushNotificationsAsync().catch(console.error);
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      loadDashboardData();
      getNotifications(1, true).then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    });
    return () => { notificationListener.current?.remove(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'people',        title: 'My Children', color: BRAND.teal,   dim: BRAND.tealDim,   badge: 0,              onPress: () => navigation.navigate('Children' as never) },
    { icon: 'school',        title: 'View Marks',  color: BRAND.red,    dim: BRAND.redDim,    badge: 0,              onPress: () => navigation.navigate('Marks' as never) },
    { icon: 'notifications', title: 'Alerts',      color: BRAND.yellow, dim: BRAND.yellowDim, badge: 0,              onPress: () => navigation.navigate('NotificationList') },
    { icon: 'chatbubble',    title: 'Messages',    color: BRAND.blue,   dim: BRAND.blueDim,   badge: unreadMsgCount, onPress: () => navigation.navigate('Messages' as never) },
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.red} colors={[BRAND.red]} />
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
            onPress={() => navigation.navigate('NotificationList')}
          >
            <Icon name="notifications-outline" size={22} color={BRAND.textPrimary} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, borderRadius: 9,
                backgroundColor: BRAND.red,
                justifyContent: 'center', alignItems: 'center',
                paddingHorizontal: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 }}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STATS ROW ──────────────────────────────────────────────────── */}
      <View style={s.statsRow}>
        {[
          { icon: 'people',   value: stats.childrenCount,          label: 'Children',   color: BRAND.teal,  dim: BRAND.tealDim  },
          { icon: 'school',   value: stats.totalMarks,             label: 'Tests',      color: BRAND.red,   dim: BRAND.redDim   },
          { icon: 'calendar', value: `${stats.averageAttendance}%`, label: 'Attendance', color: BRAND.blue,  dim: BRAND.blueDim  },
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
            <TouchableOpacity key={index} onPress={action.onPress} activeOpacity={0.7} style={{ width: '48%' }}>
              <GlassCard style={s.actionCard}>
                <View style={s.actionCardInner}>
                  <View style={[s.actionIconWrap, { backgroundColor: action.dim, borderColor: action.color + '44' }]}>
                    <Icon name={action.icon as any} size={28} color={action.color} />
                    {action.badge > 0 && (
                      <View style={{
                        position: 'absolute', top: -4, right: -4,
                        minWidth: 18, height: 18, borderRadius: 9,
                        backgroundColor: BRAND.red,
                        justifyContent: 'center', alignItems: 'center',
                        paddingHorizontal: 4,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 }}>
                          {action.badge > 99 ? '99+' : String(action.badge)}
                        </Text>
                      </View>
                    )}
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
          <TouchableOpacity key={i} onPress={() => { if (item.type === 'mark') navigation.navigate('Marks' as never); }}>
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

export default ParentDashboardScreen;
