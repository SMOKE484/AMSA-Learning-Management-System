// src/screens/student/ProfileScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Switch,
} from 'react-native';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { saveProfilePicture, getStoredProfilePicture } from '../../utils/avatarStorage';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { studentService } from '../../services/student';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BrandPalette } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';


// ─── MenuItem ────────────────────────────────────────────────────────────────
const MenuItem: React.FC<{
  icon: string;
  label: string;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
  divider?: boolean;
  destructive?: boolean;
}> = ({ icon, label, iconBg, iconColor, onPress, divider, destructive }) => {
  const { colors } = useTheme();
  const ms = useMemo(() => StyleSheet.create({
    item:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    iconWrap:    { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    label:       { fontSize: 15, fontWeight: '500', color: colors.textPrimary, flex: 1 },
  }), [colors]);
  return (
    <TouchableOpacity style={[ms.item, divider && ms.itemDivider]} onPress={onPress} activeOpacity={0.7}>
      <View style={[ms.iconWrap, { backgroundColor: iconBg }]}>
        <Icon name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[ms.label, destructive && { color: colors.red }]}>{label}</Text>
      {!destructive && (
        <Icon name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
      )}
    </TouchableOpacity>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },

  header:           { backgroundColor: colors.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  avatarCard:  { marginBottom: 24 },
  avatarInner: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatarRing:  {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: colors.red + '66',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 84, height: 84, borderRadius: 42,
    overflow: 'hidden',
    shadowColor: colors.red, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  nameText:   { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3, marginBottom: 4 },
  emailText:  { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  badgeRow:   { flexDirection: 'row', gap: 10 },
  badge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText:  { fontSize: 12, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginLeft: 4,
  },
  sectionCard: { marginBottom: 20 },

  menuItem:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuItemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap:    { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel:       { fontSize: 15, fontWeight: '500', color: colors.textPrimary, flex: 1 },

  themeRow:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  themeLabel: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, flex: 1 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', padding: 28,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  modalClose:  {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  inputGroup:  { marginBottom: 16 },
  inputLabel:  { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14, fontSize: 15, color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.red, padding: 16,
    borderRadius: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },

  pickerCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  photoBtnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const StudentProfileScreen = () => {
  const { colors: BRAND, mode, toggleTheme } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [profile, setProfile]             = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [modalVisible, setModalVisible]   = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [profilePicUri, setProfilePicUri] = useState<string | null>(null);
  const [passwordForm, setPasswordForm]   = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  useEffect(() => { loadProfileData(); }, []);

  useEffect(() => {
    if (user?.id) {
      getStoredProfilePicture(user.id).then(setProfilePicUri);
    }
  }, [user?.id]);

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

  const handleUploadPhoto = async () => {
    setPickerVisible(false);
    await new Promise(r => setTimeout(r, 350));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && user?.id) {
      const uri = await saveProfilePicture(user.id, result.assets[0].uri);
      setProfilePicUri(uri);
    }
  };

  const handleTakePhoto = async () => {
    setPickerVisible(false);
    await new Promise(r => setTimeout(r, 350));
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access in Settings.'); return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0] && user?.id) {
      const uri = await saveProfilePicture(user.id, result.assets[0].uri);
      setProfilePicUri(uri);
    }
  };

  const displayName  = user?.name  || profile?.user?.name  || '';
  const displayEmail = user?.email || profile?.user?.email || '';
  const BOTTOM_PAD   = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading profile…</Text>
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
            <TouchableOpacity style={s.avatarRing} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
              <Image
                source={profilePicUri
                  ? { uri: profilePicUri }
                  : { uri: getAvatarUrl(displayName) }
                }
                style={s.avatarCircle}
              />
              <View style={s.avatarEditBadge}>
                <Icon name="create-outline" size={10} color="#fff" />
              </View>
            </TouchableOpacity>

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
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </GlassCard>

        {/* ── APPEARANCE ────────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>Appearance</Text>
        <GlassCard style={s.sectionCard}>
          <View style={s.themeRow}>
            <View style={[s.menuIconWrap, { backgroundColor: BRAND.yellowDim }]}>
              <Icon name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={BRAND.yellow} />
            </View>
            <Text style={s.themeLabel}>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
            <Switch
              value={mode === 'light'}
              onValueChange={toggleTheme}
              trackColor={{ false: BRAND.surfaceAlt, true: BRAND.teal }}
              thumbColor={mode === 'light' ? BRAND.teal : BRAND.textMuted}
            />
          </View>
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

      {/* ── PHOTO PICKER MODAL ───────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.pickerCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Photo</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={s.modalClose}>
                <Icon name="close" size={20} color={BRAND.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.photoBtn} onPress={handleUploadPhoto}>
              <Icon name="image-outline" size={22} color={BRAND.teal} />
              <Text style={s.photoBtnText}>Upload from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={handleTakePhoto}>
              <Icon name="camera-outline" size={22} color={BRAND.teal} />
              <Text style={s.photoBtnText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <BlurView intensity={40} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND.surfaceAlt }]} />
            )}

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.modalClose}>
                <Icon name="close" size={20} color={BRAND.textSecondary} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'Current Password',    key: 'currentPassword', placeholder: 'Enter current password' },
              { label: 'New Password',         key: 'newPassword',     placeholder: 'Min 6 characters' },
              { label: 'Confirm New Password', key: 'confirmPassword', placeholder: 'Re-enter new password' },
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

export default StudentProfileScreen;
