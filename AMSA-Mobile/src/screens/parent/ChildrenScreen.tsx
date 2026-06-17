// src/screens/parent/ChildrenScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Image,
} from 'react-native';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { parentService } from '../../services/parent';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BrandPalette } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

interface Child {
  _id: string;
  user: { _id: string; name: string; email: string };
  grade: string;
  subjects: string[];
}

// ─── Styles factory ───────────────────────────────────────────────────────────
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

  list: { flex: 1 },

  childCard:   { marginBottom: 14 },
  childHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    overflow: 'hidden', marginRight: 14,
    shadowColor: colors.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  avatarText:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  childInfo:   { flex: 1 },
  childName:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  childGrade:  { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  divider:     { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  subjectsWrap:  { padding: 16, paddingBottom: 12 },
  subjectsLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  subjectsList:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectTag:    { backgroundColor: colors.tealDim, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.teal + '44' },
  subjectText:   { fontSize: 12, color: colors.teal, fontWeight: '600' },

  actionsRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, gap: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing:{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentChildrenScreen = () => {
  const [children, setChildren]     = useState<Child[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();
  const navigation = useNavigation();
  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const loadChildren = async () => {
    try {
      const response = await parentService.getChildren();
      setChildren(response.children || []);
    } catch (error: any) {
      if (error.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChildren();
    setRefreshing(false);
  };

  useEffect(() => { loadChildren(); }, []);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <BouncingDotsLoader size={20} />
        <Text style={s.loadingText}>Loading children…</Text>
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
          <Text style={s.title}>My Children</Text>
          <Text style={s.subtitle}>{children.length} children registered</Text>
        </View>
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: BOTTOM_PAD }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.red} colors={[BRAND.red]} />
        }
      >
        {children.length > 0 ? children.map((child) => {
          const childActions = [
            { icon: 'school-outline',    label: 'View Marks', color: BRAND.teal,   onPress: () => (navigation as any).navigate('Marks', { childId: child._id }) },
            { icon: 'calendar-outline',  label: 'Attendance', color: BRAND.red,    onPress: () => Alert.alert('Coming Soon', 'Attendance details will be available in a future update.') },
            { icon: 'chatbubble-outline', label: 'Message',   color: BRAND.yellow, onPress: () => (navigation as any).navigate('Messages') },
          ];
          return (
            <GlassCard key={child._id} accentColor={BRAND.teal} style={s.childCard}>
              <View style={s.childHeader}>
                <Image source={{ uri: getAvatarUrl(child.user.name) }} style={s.avatar} />
                <View style={s.childInfo}>
                  <Text style={s.childName}>{child.user.name}</Text>
                  <Text style={s.childGrade}>Grade {child.grade}</Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.subjectsWrap}>
                <Text style={s.subjectsLabel}>Subjects</Text>
                <View style={s.subjectsList}>
                  {child.subjects.map((subject, index) => (
                    <View key={index} style={s.subjectTag}>
                      <Text style={s.subjectText}>{subject}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={s.actionsRow}>
                {childActions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={action.onPress}
                    style={[s.actionBtn, { borderColor: action.color + '44', backgroundColor: action.color + '15' }]}
                  >
                    <Icon name={action.icon as any} size={15} color={action.color} />
                    <Text style={[s.actionBtnText, { color: action.color }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          );
        }) : (
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Icon name="people-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No children registered</Text>
            <Text style={s.emptySub}>Your children will appear here once linked to your account</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ParentChildrenScreen;
