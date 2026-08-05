// src/screens/admin/ManageParentsScreen.tsx
// Mirrors react-admin-tutor-web's ManageParents.jsx: list, create, edit,
// link to a student, delete.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminParent, AdminStudent } from '../../services/admin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { marginHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  studentChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  deleteBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
});

const EMPTY_FORM = { name: '', email: '', password: '' };

const ManageParentsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [parents, setParents] = useState<AdminParent[]>([]);
  const [allStudents, setAllStudents] = useState<AdminStudent[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [createVisible, setCreateVisible] = useState(false);
  const [editingParent, setEditingParent] = useState<AdminParent | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<AdminStudent[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [linkPickerVisible, setLinkPickerVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [parentsRes, studentsRes] = await Promise.all([adminService.getParents(), adminService.getStudents()]);
      setParents(parentsRes.parents || []);
      setAllStudents(studentsRes.students || []);
    } catch {
      Alert.alert('Error', 'Could not load parents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = parents.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()));

  const openEdit = async (parent: AdminParent) => {
    setEditingParent(parent);
    setForm({ name: parent.name, email: parent.email, password: '' });
    try {
      const res = await adminService.getParentWithStudents(parent._id);
      setLinkedStudents(res.parent.linkedStudents || []);
    } catch {
      setLinkedStudents([]);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    try {
      setSaving(true);
      await adminService.createParent(form);
      setCreateVisible(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create parent');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingParent) return;
    try {
      setSaving(true);
      await adminService.updateParent(editingParent._id, { name: form.name, email: form.email });
      setEditingParent(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update parent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingParent) return;
    Alert.alert('Delete Parent', `Remove ${editingParent.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteUser(editingParent._id);
            setEditingParent(null);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete parent');
          }
        }
      },
    ]);
  };

  const handleLinkStudent = async (student: AdminStudent) => {
    if (!editingParent) return;
    try {
      await adminService.linkParentToStudent(student._id, editingParent._id);
      setLinkedStudents(prev => [...prev, student]);
      setLinkPickerVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to link student');
    }
  };

  const unlinkedStudents = allStudents.filter(st => !linkedStudents.some(ls => ls._id === st._id));

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Parents</Text>
          <Text style={s.subtitle}>{parents.length} registered</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={() => setCreateVisible(true)}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={[formInputStyle(colors), { backgroundColor: colors.surface }]}
          placeholder="Search parents…" placeholderTextColor={colors.textMuted}
          value={query} onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
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

      <FormModal visible={createVisible} title="Add Parent" onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
      </FormModal>

      <FormModal visible={!!editingParent} title="Edit Parent" onClose={() => setEditingParent(null)} onSave={handleUpdate} saving={saving}>
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />

        <Text style={[s.label, { color: colors.textMuted }]}>Linked Students</Text>
        {linkedStudents.length === 0 && <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>No students linked yet</Text>}
        {linkedStudents.map(st => (
          <View key={st._id} style={[s.studentChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{st.user?.name || '(no linked account)'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Grade {st.grade}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={() => setLinkPickerVisible(true)} style={{ marginTop: 4, marginBottom: 4 }}>
          <Text style={{ color: colors.blue, fontWeight: '600', fontSize: 13 }}>+ Link another student</Text>
        </TouchableOpacity>

        {linkPickerVisible && (
          <View style={{ marginTop: 8 }}>
            {unlinkedStudents.map(st => (
              <TouchableOpacity key={st._id} style={[s.studentChip, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => handleLinkStudent(st)}>
                <Text style={{ color: colors.textPrimary }}>{st.user?.name || '(no linked account)'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Grade {st.grade}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={[s.deleteBtn, { backgroundColor: colors.redDim }]} onPress={handleDelete}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>Delete Parent</Text>
        </TouchableOpacity>
      </FormModal>
    </View>
  );
};

export default ManageParentsScreen;
