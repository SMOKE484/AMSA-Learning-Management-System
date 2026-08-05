// src/screens/admin/AdminProfileScreen.tsx
// Minimal profile screen shared by both the full 'admin' role and the
// restricted 'staff' role (staff has no other screen to log out from).
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { BrandPalette } from '../../components/theme';
import { api } from '../../services/api';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },

  card: { margin: 20, padding: 20 },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  roleTag: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const AdminProfileScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isStaff = user?.role === 'staff';

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match'); return;
    }
    try {
      setSubmitting(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password updated successfully');
      setModalVisible(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <GlassCard style={s.card} accentColor={colors.blue}>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={[s.roleTag, { backgroundColor: colors.blueDim }]}>
          <Text style={[s.roleTagText, { color: colors.blue }]}>{isStaff ? 'Attendance Staff' : 'Admin'}</Text>
        </View>

        <TouchableOpacity style={[s.actionRow, { borderTopColor: colors.border }]} onPress={() => setModalVisible(true)}>
          <Icon name="lock-closed-outline" size={20} color={colors.textPrimary} />
          <Text style={[s.actionText, { color: colors.textPrimary }]}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionRow, { borderTopColor: colors.border }]} onPress={logout}>
          <Icon name="log-out-outline" size={20} color={colors.red} />
          <Text style={[s.actionText, { color: colors.red }]}>Log Out</Text>
        </TouchableOpacity>
      </GlassCard>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Change Password</Text>
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Current password" placeholderTextColor={colors.textMuted}
              secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}
            />
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="New password" placeholderTextColor={colors.textMuted}
              secureTextEntry value={newPassword} onChangeText={setNewPassword}
            />
            <TextInput
              style={[s.input, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Confirm new password" placeholderTextColor={colors.textMuted}
              secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.blue }]} onPress={handleChangePassword} disabled={submitting}>
              <Text style={s.modalBtnText}>{submitting ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtn} onPress={() => setModalVisible(false)}>
              <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminProfileScreen;
