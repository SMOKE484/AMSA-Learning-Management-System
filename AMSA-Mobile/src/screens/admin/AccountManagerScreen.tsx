// src/screens/admin/AccountManagerScreen.tsx
// Shared list/create/edit/delete UI for the Admins and Staff account screens
// — same shape, different backing endpoints (see ManageAdminsScreen.tsx /
// ManageStaffScreen.tsx), so it isn't duplicated twice.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminUser } from '../../services/admin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
});

interface AccountManagerScreenProps {
  title: string;
  subtitleLabel: string;
  getAccounts: () => Promise<{ accounts: AdminUser[] }>;
  createAccount: (data: { name: string; email: string; password: string }) => Promise<any>;
  updateAccount: (userId: string, data: { name?: string; email?: string }) => Promise<any>;
}

const EMPTY_FORM = { name: '', email: '', password: '' };

export const AccountManagerScreen: React.FC<AccountManagerScreenProps> = ({ title, subtitleLabel, getAccounts, createAccount, updateAccount }) => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.accounts || []);
    } catch {
      Alert.alert('Error', 'Could not load accounts');
    } finally {
      setLoading(false);
    }
  }, [getAccounts]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (account: AdminUser) => {
    setEditing(account);
    setForm({ name: account.name, email: account.email, password: '' });
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    try {
      setSaving(true);
      await createAccount(form);
      setCreateVisible(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await updateAccount(editing._id, { name: form.name, email: form.email });
      setEditing(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert('Delete Account', `Remove ${editing.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteUser(editing._id);
            setEditing(null);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete account');
          }
        }
      },
    ]);
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{accounts.length} {subtitleLabel}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={() => setCreateVisible(true)}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openEdit(item)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{item.email}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      <FormModal visible={createVisible} title={`Add ${title.slice(0, -1)}`} onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
      </FormModal>

      <FormModal visible={!!editing} title={`Edit ${title.slice(0, -1)}`} onClose={() => setEditing(null)} onSave={handleUpdate} saving={saving}>
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <TouchableOpacity style={[s.deleteBtn, { backgroundColor: colors.redDim }]} onPress={handleDelete}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>Delete Account</Text>
        </TouchableOpacity>
      </FormModal>
    </View>
  );
};
