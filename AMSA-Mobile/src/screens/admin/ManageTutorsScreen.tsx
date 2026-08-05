// src/screens/admin/ManageTutorsScreen.tsx
// Mirrors react-admin-tutor-web's ManageTutors.jsx: list, create, delete.
// (There's no tutor-update endpoint on the backend — the web dashboard
// doesn't offer one either, so this screen doesn't invent one.)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { ChipSelector } from '../../components/ChipSelector';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminTutor } from '../../services/admin';
import { academicService } from '../../services/academic';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { marginHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteIcon: { padding: 8 },
});

const EMPTY_FORM = { name: '', email: '', password: '', subjects: [] as string[], grades: [] as string[] };

const ManageTutorsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [tutors, setTutors] = useState<AdminTutor[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tutorsRes, config] = await Promise.all([adminService.getTutors(), academicService.getConfig()]);
      setTutors(tutorsRes.tutors || []);
      setGrades(config.grades || []);
      setSubjects(config.subjects || []);
    } catch {
      Alert.alert('Error', 'Could not load tutors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tutors.filter(t => !query || t.user.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (key: 'subjects' | 'grades') => (value: string | number) => {
    const v = String(value);
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || form.subjects.length === 0 || form.grades.length === 0) {
      Alert.alert('Error', 'Please fill in all fields, including at least one subject and grade'); return;
    }
    try {
      setSaving(true);
      await adminService.createTutor(form);
      setCreateVisible(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create tutor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tutor: AdminTutor) => {
    Alert.alert('Delete Tutor', `Remove ${tutor.user.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteUser(tutor.user._id);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete tutor');
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
          <Text style={s.title}>Tutors</Text>
          <Text style={s.subtitle}>{tutors.length} on staff</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={() => setCreateVisible(true)}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={[formInputStyle(colors), { backgroundColor: colors.surface }]}
          placeholder="Search tutors…" placeholderTextColor={colors.textMuted}
          value={query} onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.user.name}</Text>
              <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{item.subjects.join(', ')} • Grades {item.grades.join(', ')}</Text>
            </View>
            <TouchableOpacity style={s.deleteIcon} onPress={() => handleDelete(item)}>
              <Icon name="close-circle" size={20} color={colors.red} />
            </TouchableOpacity>
          </View>
        )}
      />

      <FormModal visible={createVisible} title="Add Tutor" onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))} />
        <Text style={[s.label, { color: colors.textMuted }]}>Subjects</Text>
        <ChipSelector options={subjects} selected={form.subjects} onToggle={toggle('subjects')} accentColor={colors.blue} />
        <Text style={[s.label, { color: colors.textMuted }]}>Grades</Text>
        <ChipSelector options={grades} selected={form.grades} onToggle={toggle('grades')} accentColor={colors.blue} />
      </FormModal>
    </View>
  );
};

export default ManageTutorsScreen;
