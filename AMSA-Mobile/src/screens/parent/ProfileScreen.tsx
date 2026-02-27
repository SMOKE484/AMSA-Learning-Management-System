// src/screens/parent/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { parentService } from '../../services/parent';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';



// ─── MenuItem ────────────────────────────────────────────────────────────────
const MenuItem: React.FC<{
  icon: string;
  label: string;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
  divider?: boolean;
  destructive?: boolean;
}> = ({ icon, label, iconBg, iconColor, onPress, divider, destructive }) => (
  <TouchableOpacity
    style={[s.menuItem, divider && s.menuItemDivider]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[s.menuIconWrap, { backgroundColor: iconBg }]}>
      <Icon name={icon as any} size={20} color={iconColor} />
    </View>
    <Text style={[s.menuLabel, destructive && { color: BRAND.red }]}>{label}</Text>
    {!destructive && (
      <Icon name="chevron-forward" size={18} color={BRAND.textMuted} style={{ marginLeft: 'auto' }} />
    )}
  </TouchableOpacity>
);

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading]             = useState(true);

  const loadProfileData = async () => {
    try {
      const childrenData = await parentService.getChildren();
      setChildrenCount(childrenData.children?.length || 0);
    } catch (error: any) {
      console.error('Parent profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfileData(); }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (user?.name || 'P').split(' ').map((n: string) => n[0]).join('').toUpperCase();

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <BouncingDotsLoader size={20} />
        <Text style={s.loadingText}>Loading profile…</Text>
      </View>
    );
  }

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
          <Text style={s.title}>Profile</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: BOTTOM_PAD }]}
      >
        {/* ── AVATAR CARD ───────────────────────────────────────────────── */}
        <GlassCard style={s.avatarCard}>
          <View style={s.avatarInner}>
            <View style={s.avatarRing}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={s.nameText}>{user?.name || 'Parent'}</Text>
            <Text style={s.emailText}>{user?.email || ''}</Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: BRAND.tealDim, borderColor: BRAND.teal + '44' }]}>
                <Text style={[s.badgeText, { color: BRAND.teal }]}>Parent</Text>
              </View>
              <View style={[s.badge, { backgroundColor: BRAND.blueDim, borderColor: BRAND.blue + '44' }]}>
                <Text style={[s.badgeText, { color: BRAND.blue }]}>{childrenCount} Children</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* ── ACCOUNT ───────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Account</Text>
        <GlassCard style={s.sectionCard}>
          <MenuItem icon="person-outline"    label="Edit Profile"      iconBg={BRAND.tealDim}   iconColor={BRAND.teal}   divider />
          <MenuItem icon="lock-closed-outline" label="Change Password"  iconBg={BRAND.blueDim}   iconColor={BRAND.blue}   divider />
          <MenuItem icon="notifications-outline" label="Notifications"  iconBg={BRAND.yellowDim} iconColor={BRAND.yellow} />
        </GlassCard>

        {/* ── CHILDREN ──────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Children</Text>
        <GlassCard style={s.sectionCard}>
          <MenuItem
            icon="people-outline"   label="Manage Children"     iconBg={BRAND.tealDim}   iconColor={BRAND.teal}
            onPress={() => navigation.navigate('Children' as never)} divider
          />
          <MenuItem
            icon="school-outline"   label="Academic Reports"    iconBg={BRAND.redDim}    iconColor={BRAND.red}
            onPress={() => navigation.navigate('Marks' as never)} divider
          />
          <MenuItem icon="chatbubble-outline" label="Parent-Teacher Chat" iconBg={BRAND.yellowDim} iconColor={BRAND.yellow} divider />
          <MenuItem icon="calendar-outline"   label="School Calendar"    iconBg={BRAND.blueDim}   iconColor={BRAND.blue} />
        </GlassCard>

        {/* ── SUPPORT ───────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Support</Text>
        <GlassCard style={s.sectionCard}>
          <MenuItem icon="help-circle-outline" label="Help Center"     iconBg={BRAND.yellowDim} iconColor={BRAND.yellow} divider />
          <MenuItem icon="chatbubble-outline"  label="Contact School"  iconBg={BRAND.tealDim}   iconColor={BRAND.teal}   divider />
          <MenuItem icon="information-circle"  label="About"           iconBg={BRAND.blueDim}   iconColor={BRAND.blue} />
        </GlassCard>

        {/* ── LOGOUT ────────────────────────────────────────────────────── */}
        <GlassCard style={[s.sectionCard, { marginTop: 8 }]}>
          <MenuItem
            icon="lock-closed-outline"
            label="Log Out"
            iconBg={BRAND.redDim}
            iconColor={BRAND.red}
            onPress={handleLogout}
            destructive
          />
        </GlassCard>

        <Text style={s.versionText}>Parent Portal v1.0</Text>
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

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Avatar card
  avatarCard:   { marginBottom: 24 },
  avatarInner:  { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarRing:   {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: BRAND.teal + '66',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: BRAND.teal,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  nameText:    { fontSize: 22, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3, marginBottom: 4 },
  emailText:   { fontSize: 13, color: BRAND.textSecondary, marginBottom: 16 },
  badgeRow:    { flexDirection: 'row', gap: 10 },
  badge:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText:   { fontSize: 12, fontWeight: '700' },

  // Sections
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: BRAND.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginLeft: 4,
  },
  sectionCard: { marginBottom: 20 },

  // Menu items
  menuItem:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuItemDivider: { borderBottomWidth: 1, borderBottomColor: BRAND.border },
  menuIconWrap:    { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel:       { fontSize: 15, fontWeight: '500', color: BRAND.textPrimary, flex: 1 },

  versionText: { textAlign: 'center', fontSize: 12, color: BRAND.textMuted, marginTop: 8, marginBottom: 16 },
});

export default ParentProfileScreen;
