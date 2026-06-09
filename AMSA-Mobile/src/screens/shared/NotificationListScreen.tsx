import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../../components/GlassCard';
import { Icon } from '../../components/Icon';
import { BRAND, BrandPalette } from '../../components/theme';
import { useTheme } from '../../context/ThemeContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  AppNotification,
} from '../../services/notifications';

const makeStyles = (colors: BrandPalette) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.bg },
    header:       { backgroundColor: colors.surface, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerAccentRow: { flexDirection: 'row', height: 3 },
    headerAccentDash: { flex: 1 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
    headerTitle:  { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
    markAllBtn:   { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    markAllText:  { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    list:         { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
    item:         { flexDirection: 'row', padding: 14, marginBottom: 10 },
    iconWrap:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemBody:     { flex: 1 },
    itemTitle:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
    itemTitleRead:{ fontSize: 15, fontWeight: '500', color: colors.textSecondary, marginBottom: 3 },
    itemMsg:      { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    itemTime:     { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    unreadDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND.red, marginLeft: 8, marginTop: 4 },

    emptyWrap:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyIcon:    { marginBottom: 12 },
    emptyTitle:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    emptyText:    { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },

    loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  });

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

const typeIcon = (type: AppNotification['type']): { name: string; color: string; bg: string } => {
  switch (type) {
    case 'announcement':    return { name: 'megaphone',           color: BRAND.yellow, bg: BRAND.yellowDim };
    case 'class_reminder':  return { name: 'calendar',            color: BRAND.blue,   bg: BRAND.blueDim   };
    case 'check_in_available': return { name: 'location',         color: BRAND.teal,   bg: BRAND.tealDim   };
    case 'attendance_alert':return { name: 'alert-circle',        color: BRAND.red,    bg: BRAND.redDim    };
    default:                return { name: 'notifications',       color: BRAND.teal,   bg: BRAND.tealDim   };
  }
};

export default function NotificationListScreen() {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
    } catch {
      // silently fail — user can pull to refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleTap = async (item: AppNotification) => {
    if (!item.read) {
      try {
        await markNotificationAsRead(item._id);
        setNotifications(prev =>
          prev.map(n => n._id === item._id ? { ...n, read: true } : n)
        );
      } catch { /* ignore */ }
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={BRAND.red} />
      </View>
    );
  }

  const hasUnread = notifications.some(n => !n.read);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Notifications</Text>
          {hasUnread && (
            <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAll} disabled={markingAll}>
              <Text style={s.markAllText}>{markingAll ? 'Clearing…' : 'Mark all read'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.red} colors={[BRAND.red]} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Icon name="notifications-off-outline" size={56} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyText}>You're all caught up! Announcements and alerts will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ic = typeIcon(item.type);
          return (
            <GlassCard style={s.item} accentColor={item.read ? undefined : BRAND.red} accentSide="left">
              <TouchableOpacity
                style={{ flexDirection: 'row', flex: 1 }}
                activeOpacity={0.7}
                onPress={() => handleTap(item)}
              >
                <View style={[s.iconWrap, { backgroundColor: ic.bg }]}>
                  <Icon name={ic.name as any} size={20} color={ic.color} />
                </View>
                <View style={s.itemBody}>
                  <Text style={item.read ? s.itemTitleRead : s.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={s.itemMsg} numberOfLines={2}>{item.message}</Text>
                  <Text style={s.itemTime}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={s.unreadDot} />}
              </TouchableOpacity>
            </GlassCard>
          );
        }}
      />
    </View>
  );
}
