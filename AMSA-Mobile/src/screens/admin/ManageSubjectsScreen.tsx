// src/screens/admin/ManageSubjectsScreen.tsx
// Mirrors react-admin-tutor-web's ManageSubjects.jsx: list, create,
// activate/deactivate, delete.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Switch } from 'react-native';
import { Icon } from '../../components/Icon';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, Subject } from '../../services/admin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

const ManageSubjectsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getSubjects();
      setSubjects(res.subjects || []);
    } catch {
      Alert.alert('Error', 'Could not load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Error', 'Please enter a subject name'); return; }
    try {
      setSaving(true);
      await adminService.createSubject(newName.trim());
      setCreateVisible(false);
      setNewName('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (subject: Subject) => {
    try {
      await adminService.updateSubject(subject._id, { isActive: !subject.isActive });
      setSubjects(prev => prev.map(sub => sub._id === subject._id ? { ...sub, isActive: !sub.isActive } : sub));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update subject');
    }
  };

  const handleDelete = (subject: Subject) => {
    Alert.alert('Delete Subject', `Delete "${subject.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteSubject(subject._id);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete subject');
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
          <Text style={s.title}>Subjects</Text>
          <Text style={s.subtitle}>{subjects.length} subjects</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={() => setCreateVisible(true)}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.rowName, { color: item.isActive ? colors.textPrimary : colors.textMuted }]}>{item.name}</Text>
            <View style={s.rowActions}>
              <Switch value={item.isActive} onValueChange={() => handleToggleActive(item)} trackColor={{ true: colors.blue }} />
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Icon name="close-circle" size={20} color={colors.red} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <FormModal visible={createVisible} title="Add Subject" onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Subject name" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
      </FormModal>
    </View>
  );
};

export default ManageSubjectsScreen;
