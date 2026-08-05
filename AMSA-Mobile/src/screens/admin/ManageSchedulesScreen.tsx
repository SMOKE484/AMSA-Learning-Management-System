// src/screens/admin/ManageSchedulesScreen.tsx
// Mirrors react-admin-tutor-web's ManageSchedules.jsx: list, create, delete.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { ChipSelector } from '../../components/ChipSelector';
import { FormModal, formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminTutor } from '../../services/admin';
import { academicService } from '../../services/academic';
import { toLocalDateString } from '../../utils/formatting';

const formatDisplayDate = (d: string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
};

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  row: { padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteIcon: { padding: 6 },
});

const STATUS_COLORS: Record<string, string> = { scheduled: '#2B6E9E', ongoing: '#F5A800', completed: '#2E9E5B', cancelled: '#E8341C' };

const EMPTY_FORM = {
  subject: '', grade: '', title: '', description: '',
  scheduledDate: toLocalDateString(new Date()), startTime: '15:00', endTime: '16:00',
  tutor: '', room: '', meetingLink: '',
};

const ManageSchedulesScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [tutors, setTutors] = useState<AdminTutor[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [schedulesRes, tutorsRes, config] = await Promise.all([
        adminService.getSchedules({ limit: 100 }),
        adminService.getTutors(),
        academicService.getConfig(),
      ]);
      setSchedules(schedulesRes.schedules || []);
      setTutors(tutorsRes.tutors || []);
      setGrades(config.grades || []);
      setSubjects(config.subjects || []);
    } catch {
      Alert.alert('Error', 'Could not load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.subject || !form.grade || !form.title || !form.scheduledDate || !form.startTime || !form.endTime || !form.tutor) {
      Alert.alert('Error', 'Please fill in subject, grade, title, date, times, and tutor'); return;
    }
    try {
      setSaving(true);
      await adminService.createSchedule(form);
      setCreateVisible(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (scheduleId: string, title: string) => {
    Alert.alert('Delete Class', `Delete "${title}"? This also removes its attendance records.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteSchedule(scheduleId);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete class');
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
          <Text style={s.title}>Schedules</Text>
          <Text style={s.subtitle}>{schedules.length} classes</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={() => setCreateVisible(true)}>
          <Icon name="add-circle-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          return (
            <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.rowTop}>
                <Text style={[s.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <TouchableOpacity style={s.deleteIcon} onPress={() => handleDelete(item._id, item.title)}>
                  <Icon name="close-circle" size={18} color={colors.red} />
                </TouchableOpacity>
              </View>
              <Text style={[s.rowMeta, { color: colors.textSecondary }]}>
                {item.subject} • Grade {item.grade} • {item.scheduledDate ? formatDisplayDate(item.scheduledDate) : ''} {item.startTime}-{item.endTime}
              </Text>
              <Text style={[s.rowMeta, { color: colors.textMuted }]}>Tutor: {item.tutor?.user?.name || '—'} • {item.students?.length || 0} students</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      <FormModal visible={createVisible} title="New Class" onClose={() => setCreateVisible(false)} onSave={handleCreate} saving={saving} saveLabel="Create">
        <TextInput style={formInputStyle(colors)} placeholder="Title" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />

        <Text style={[s.label, { color: colors.textMuted }]}>Subject</Text>
        <ChipSelector options={subjects} selected={form.subject ? [form.subject] : []} onToggle={v => setForm(f => ({ ...f, subject: String(v) }))} accentColor={colors.blue} />
        <Text style={[s.label, { color: colors.textMuted }]}>Grade</Text>
        <ChipSelector options={grades} selected={form.grade ? [form.grade] : []} onToggle={v => setForm(f => ({ ...f, grade: String(v) }))} accentColor={colors.blue} />

        <Text style={[s.label, { color: colors.textMuted }]}>Tutor</Text>
        <ChipSelector
          options={tutors.map(t => t.user.name)}
          selected={form.tutor ? [tutors.find(t => t._id === form.tutor)?.user.name || ''] : []}
          onToggle={(name) => { const t = tutors.find(t => t.user.name === name); setForm(f => ({ ...f, tutor: t?._id || '' })); }}
          accentColor={colors.blue}
        />

        <Text style={[s.label, { color: colors.textMuted }]}>Date (YYYY-MM-DD)</Text>
        <TextInput style={formInputStyle(colors)} placeholder="2026-08-01" placeholderTextColor={colors.textMuted} value={form.scheduledDate} onChangeText={v => setForm(f => ({ ...f, scheduledDate: v }))} />
        <Text style={[s.label, { color: colors.textMuted }]}>Start Time (HH:MM)</Text>
        <TextInput style={formInputStyle(colors)} placeholder="15:00" placeholderTextColor={colors.textMuted} value={form.startTime} onChangeText={v => setForm(f => ({ ...f, startTime: v }))} />
        <Text style={[s.label, { color: colors.textMuted }]}>End Time (HH:MM)</Text>
        <TextInput style={formInputStyle(colors)} placeholder="16:00" placeholderTextColor={colors.textMuted} value={form.endTime} onChangeText={v => setForm(f => ({ ...f, endTime: v }))} />

        <TextInput style={formInputStyle(colors)} placeholder="Room (optional)" placeholderTextColor={colors.textMuted} value={form.room} onChangeText={v => setForm(f => ({ ...f, room: v }))} />
        <TextInput style={formInputStyle(colors)} placeholder="Meeting link (optional)" placeholderTextColor={colors.textMuted} value={form.meetingLink} onChangeText={v => setForm(f => ({ ...f, meetingLink: v }))} />
      </FormModal>
    </View>
  );
};

export default ManageSchedulesScreen;
