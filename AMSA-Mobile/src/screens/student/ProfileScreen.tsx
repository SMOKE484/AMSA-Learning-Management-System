// src/screens/student/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/student';
import { BlurView } from 'expo-blur';
import { Icon } from '../../components/Icon';
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
const StudentProfileScreen = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile]           = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  useEffect(() => { loadProfileData(); }, []);

  const loadProfileData = async () => {
    try {
      const profileData = await studentService.getProfile();
      setProfile(profileData.student);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match'); return;
    }
    try {
      setSubmitting(true);
      await studentService.changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password updated successfully');
      setModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (profile?.user?.name || user?.name || 'S').charAt(0).toUpperCase();
  const displayName  = profile?.user?.name  || user?.name  || '';
  const displayEmail = profile?.user?.email || user?.email || '';

  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading profile…</Text>
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

            <Text style={s.nameText}>{displayName}</Text>
            <Text style={s.emailText}>{displayEmail}</Text>

            <View style={s.badgeRow}>
              {profile?.grade && (
                <View style={[s.badge, { backgroundColor: BRAND.redDim, borderColor: BRAND.red + '44' }]}>
                  <Text style={[s.badgeText, { color: BRAND.red }]}>Grade {profile.grade}</Text>
                </View>
              )}
              <View style={[s.badge, { backgroundColor: BRAND.blueDim, borderColor: BRAND.blue + '44' }]}>
                <Text style={[s.badgeText, { color: BRAND.blue }]}>Student</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* ── ACCOUNT SETTINGS ──────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Account Settings</Text>
        <GlassCard style={s.sectionCard}>
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            iconBg={BRAND.blueDim}
            iconColor={BRAND.blue}
            onPress={() => setModalVisible(true)}
            divider
          />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            iconBg={BRAND.tealDim}
            iconColor={BRAND.teal}
          />
        </GlassCard>

        {/* ── SUPPORT ───────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Support</Text>
        <GlassCard style={s.sectionCard}>
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            iconBg={BRAND.yellowDim}
            iconColor={BRAND.yellow}
          />
        </GlassCard>

        {/* ── LOGOUT ────────────────────────────────────────────────────── */}
        <GlassCard style={[s.sectionCard, { marginTop: 8 }]}>
          <MenuItem
            icon="log-out-outline"
            label="Log Out"
            iconBg={BRAND.redDim}
            iconColor={BRAND.red}
            onPress={handleLogout}
            destructive
          />
        </GlassCard>

      </ScrollView>

      {/* ── CHANGE PASSWORD MODAL ─────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND.surfaceAlt }]} />
            )}

            {/* Modal header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.modalClose}
              >
                <Icon name="close" size={20} color={BRAND.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            {[
              { label: 'Current Password',     key: 'currentPassword',  placeholder: 'Enter current password' },
              { label: 'New Password',          key: 'newPassword',      placeholder: 'Min 6 characters' },
              { label: 'Confirm New Password',  key: 'confirmPassword',  placeholder: 'Re-enter new password' },
            ].map(field => (
              <View key={field.key} style={s.inputGroup}>
                <Text style={s.inputLabel}>{field.label}</Text>
                <TextInput
                  style={s.input}
                  secureTextEntry
                  value={(passwordForm as any)[field.key]}
                  onChangeText={text => setPasswordForm(prev => ({ ...prev, [field.key]: text }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={BRAND.textMuted}
                />
              </View>
            ))}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  headerContent:    { paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Avatar card
  avatarCard:   { marginBottom: 24 },
  avatarInner:  { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarRing:   {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: BRAND.red + '66',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: BRAND.red,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BRAND.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText:   { fontSize: 36, fontWeight: '800', color: '#fff' },
  nameText:     { fontSize: 22, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3, marginBottom: 4 },
  emailText:    { fontSize: 13, color: BRAND.textSecondary, marginBottom: 16 },
  badgeRow:     { flexDirection: 'row', gap: 10 },
  badge:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText:    { fontSize: 12, fontWeight: '700' },

  // Sections
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: BRAND.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginLeft: 4,
  },
  sectionCard:  { marginBottom: 20 },

  // Menu items
  menuItem:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuItemDivider:{ borderBottomWidth: 1, borderBottomColor: BRAND.border },
  menuIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel:    { fontSize: 15, fontWeight: '500', color: BRAND.textPrimary, flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', padding: 28,
    borderWidth: 1, borderColor: BRAND.borderStrong,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: BRAND.textPrimary },
  modalClose:  {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border,
    justifyContent: 'center', alignItems: 'center',
  },
  inputGroup:  { marginBottom: 16 },
  inputLabel:  { fontSize: 12, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border,
    borderRadius: 14, padding: 14, fontSize: 15, color: BRAND.textPrimary,
  },
  submitBtn: {
    backgroundColor: BRAND.red, padding: 16,
    borderRadius: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default StudentProfileScreen;