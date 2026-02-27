// src/screens/parent/ChildrenScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { parentService } from '../../services/parent';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';



// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Child {
  _id: string;
  user: { _id: string; name: string; email: string };
  grade: string;
  subjects: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentChildrenScreen = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();

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

  const childActions = [
    { icon: 'school-outline',     label: 'View Marks',  color: BRAND.teal   },
    { icon: 'calendar-outline',   label: 'Attendance',  color: BRAND.red    },
    { icon: 'chatbubble-outline', label: 'Message',     color: BRAND.yellow },
  ];

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
            <Text style={s.title}>My Children</Text>
            <Text style={s.subtitle}>{children.length} children registered</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: BOTTOM_PAD }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.red}
            colors={[BRAND.red]}
          />
        }
      >
        {children.length > 0 ? children.map((child) => {
          const initials = child.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
          return (
            <GlassCard key={child._id} accentColor={BRAND.teal} style={s.childCard}>
              {/* Child header */}
              <View style={s.childHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
                <View style={s.childInfo}>
                  <Text style={s.childName}>{child.user.name}</Text>
                  <Text style={s.childGrade}>Grade {child.grade}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={s.divider} />

              {/* Subjects */}
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

              {/* Actions */}
              <View style={s.actionsRow}>
                {childActions.map((action, idx) => (
                  <TouchableOpacity key={idx} style={[s.actionBtn, { borderColor: action.color + '44', backgroundColor: action.color + '15' }]}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BRAND.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: BRAND.textSecondary },

  // Header
  header:           { backgroundColor: BRAND.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  subtitle:         { fontSize: 13, color: BRAND.textSecondary, marginTop: 4 },

  list: { flex: 1 },

  // Child card
  childCard:   { marginBottom: 14 },
  childHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BRAND.teal,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
    shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  avatarText:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  childInfo:   { flex: 1 },
  childName:   { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },
  childGrade:  { fontSize: 13, color: BRAND.textSecondary, marginTop: 3 },
  divider: { height: 1, backgroundColor: BRAND.border, marginHorizontal: 16 },

  // Subjects
  subjectsWrap:  { padding: 16, paddingBottom: 12 },
  subjectsLabel: { fontSize: 11, fontWeight: '700', color: BRAND.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  subjectsList:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectTag:    { backgroundColor: BRAND.tealDim, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: BRAND.teal + '44' },
  subjectText:   { fontSize: 12, color: BRAND.teal, fontWeight: '600' },

  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, gap: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  // Empty
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing:{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: BRAND.textSecondary, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: BRAND.textMuted, textAlign: 'center', marginTop: 6 },
});

export default ParentChildrenScreen;
