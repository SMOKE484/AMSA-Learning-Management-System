// src/screens/admin/ManageStudentsScreen.tsx
// Mirrors react-admin-tutor-web's ManageStudents.jsx: list + search, create,
// edit, delete, plus the admin photo upload the NFC tap screen depends on.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { ChipSelector } from '../../components/ChipSelector';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminStudent } from '../../services/admin';
import { academicService } from '../../services/academic';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  searchWrap: { marginHorizontal: 20, marginBottom: 12 },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },

  detailPhoto: { width: 88, height: 88, borderRadius: 44, alignSelf: 'center', marginBottom: 12 },
  photoBtn: { alignSelf: 'center', marginBottom: 16 },
  photoBtnText: { fontSize: 13, fontWeight: '600' },

  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  deleteBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
});

const EMPTY_FORM = { name: '', email: '', password: '', grade: '', subjects: [] as string[] };

const ManageStudentsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [createVisible, setCreateVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [studentsRes, config] = await Promise.all([
        adminService.getStudents(),
        academicService.getConfig(),
      ]);
      setStudents(studentsRes.students || []);
      setGrades(config.grades || []);
      setSubjects(config.subjects || []);
    } catch {
      Alert.alert('Error', 'Could not load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(st => !query || st.user?.name?.toLowerCase().includes(query.toLowerCase()));

  const openCreate = () => { setForm(EMPTY_FORM); setCreateVisible(true); };
  const openEdit = (student: AdminStudent) => {
    setEditingStudent(student);
    setForm({ name: student.user?.name || '', email: student.user?.email || '', password: '', grade: student.grade, subjects: student.subjects });
  };

  const toggleSubject = (value: string | number) => {
    const v = String(value);
    setForm(f => ({ ...f, subjects: f.subjects.includes(v) ? f.subjects.filter(x => x !== v) : [...f.subjects, v] }));
  };
  const pickGrade = (value: string | number) => setForm(f => ({ ...f, grade: String(value) }));

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.grade || form.subjects.length === 0) {
      Alert.alert('Error', 'Please fill in all fields, including grade and at least one subject'); return;
    }
    try {
      setSaving(true);
      await adminService.createStudent(form);
      setCreateVisible(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    if (!editingStudent.user) {
      Alert.alert('Error', 'This student record has no linked account and cannot be edited.');
      return;
    }
    try {
      setSaving(true);
      await adminService.updateStudent(editingStudent.user._id, {
        name: form.name, email: form.email, grade: form.grade, subjects: form.subjects,
      });
      setEditingStudent(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingStudent) return;
    const editingUser = editingStudent.user;
    if (!editingUser) {
      Alert.alert('Error', 'This student record has no linked account and cannot be deleted here.');
      return;
    }
    Alert.alert('Delete Student', `Remove ${editingUser.name} and all their records? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteUser(editingUser._id);
            setEditingStudent(null);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete student');
          }
        }
      },
    ]);
  };

  const handleChangePhoto = async () => {
    if (!editingStudent) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    try {
      const res = await adminService.uploadStudentPhoto(editingStudent._id, result.assets[0].uri);
      setEditingStudent({ ...editingStudent, photoUrl: res.photoUrl });
      setStudents(prev => prev.map(st => st._id === editingStudent._id ? { ...st, photoUrl: res.photoUrl } : st));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload photo');
    }
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Students</Text>
          <Text style={s.subtitle}>{students.length} enrolled</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={openCreate}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={[formInputStyle(colors), { backgroundColor: colors.surface }]}
          placeholder="Search students…" placeholderTextColor={colors.textMuted}
          value={query} onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openEdit(item)}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="person-outline" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.user?.name || '(no linked account)'}</Text>
              <Text style={[s.rowMeta, { color: colors.textSecondary }]}>Grade {item.grade} • {item.subjects.length} subjects</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />

      <FormModal visible={createVisible} title="Add Student" onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
        <Text style={[s.label, { color: colors.textMuted }]}>Grade</Text>
        <ChipSelector options={grades} selected={form.grade ? [form.grade] : []} onToggle={pickGrade} accentColor={colors.blue} />
        <Text style={[s.label, { color: colors.textMuted }]}>Subjects</Text>
        <ChipSelector options={subjects} selected={form.subjects} onToggle={toggleSubject} accentColor={colors.blue} />
      </FormModal>

      <FormModal visible={!!editingStudent} title="Edit Student" onClose={() => setEditingStudent(null)} onSave={handleUpdate} saving={saving}>
        {editingStudent?.photoUrl ? (
          <Image source={{ uri: editingStudent.photoUrl }} style={s.detailPhoto} />
        ) : (
          <View style={[s.detailPhoto, { backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
            <Icon name="person-outline" size={36} color={colors.textMuted} />
          </View>
        )}
        <TouchableOpacity style={s.photoBtn} onPress={handleChangePhoto}>
          <Text style={[s.photoBtnText, { color: colors.blue }]}>Change Photo</Text>
        </TouchableOpacity>

        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <Text style={[s.label, { color: colors.textMuted }]}>Grade</Text>
        <ChipSelector options={grades} selected={form.grade ? [form.grade] : []} onToggle={pickGrade} accentColor={colors.blue} />
        <Text style={[s.label, { color: colors.textMuted }]}>Subjects</Text>
        <ChipSelector options={subjects} selected={form.subjects} onToggle={toggleSubject} accentColor={colors.blue} />

        <TouchableOpacity style={[s.deleteBtn, { backgroundColor: colors.redDim }]} onPress={handleDelete}>
          <Text style={{ color: colors.red, fontWeight: '700' }}>Delete Student</Text>
        </TouchableOpacity>
      </FormModal>
    </View>
  );
};

export default ManageStudentsScreen;
