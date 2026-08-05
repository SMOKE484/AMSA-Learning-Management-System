// src/screens/admin/ClassAttendanceScreen.tsx
// Mirrors react-admin-tutor-web's ClassAttendance.jsx: browse attendance
// records and batch-mark a class manually. Coexists with the NFC Tap screen
// rather than replacing it — useful when a student forgot their card.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { FormModal } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { attendanceAdminService } from '../../services/attendanceAdmin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  markBtn: { marginHorizontal: 20, marginBottom: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  markBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  classRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 6 },
});

const STATUS_COLORS: Record<string, string> = { present: '#2E9E5B', absent: '#E8341C', late: '#F5A800', excused: '#2B6E9E', left_early: '#F5A800' };
const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

const ClassAttendanceScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markVisible, setMarkVisible] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await attendanceAdminService.getAllAttendance();
      setRecords(data || []);
    } catch {
      Alert.alert('Error', 'Could not load attendance records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMarkFlow = async () => {
    try {
      const res = await attendanceAdminService.getTodaySchedules();
      setTodaySchedules(res.schedules || []);
      setSelectedClass(null);
      setMarkVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load today\'s classes');
    }
  };

  const selectClass = (cls: any) => {
    setSelectedClass(cls);
    const initial: Record<string, string> = {};
    (cls.students || []).forEach((st: any) => { initial[st._id || st] = 'present'; });
    setStatuses(initial);
  };

  const handleSaveBatch = async () => {
    if (!selectedClass) return;
    try {
      setSaving(true);
      const students = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      await attendanceAdminService.markBatch(selectedClass._id, students);
      setMarkVisible(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Attendance</Text>
        <Text style={s.subtitle}>{records.length} recent records</Text>
      </View>

      <TouchableOpacity style={[s.markBtn, { backgroundColor: colors.blue }]} onPress={openMarkFlow}>
        <Text style={s.markBtnText}>Mark Attendance for a Class</Text>
      </TouchableOpacity>

      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
          return (
            <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.student?.user?.name || 'Unknown'}</Text>
                <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{item.class?.subject} • {item.class?.scheduledDate ? new Date(item.class.scheduledDate).toLocaleDateString() : ''}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[s.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
            </View>
          );
        }}
      />

      <FormModal
        visible={markVisible}
        title={selectedClass ? selectedClass.title : 'Select a Class'}
        onClose={() => setMarkVisible(false)}
        onSave={selectedClass ? handleSaveBatch : () => setMarkVisible(false)}
        saving={saving}
        saveLabel={selectedClass ? 'Save All' : 'Close'}
      >
        {!selectedClass ? (
          todaySchedules.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No classes scheduled today</Text>
          ) : (
            todaySchedules.map(cls => (
              <TouchableOpacity key={cls._id} style={[s.classRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => selectClass(cls)}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{cls.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{cls.subject} • {cls.startTime}</Text>
              </TouchableOpacity>
            ))
          )
        ) : (
          (selectedClass.students || []).map((st: any) => {
            const studentId = st._id || st;
            const name = st.user?.name || 'Student';
            return (
              <View key={studentId} style={[s.studentRow, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{name}</Text>
                <View style={{ flexDirection: 'row' }}>
                  {STATUS_OPTIONS.map(opt => {
                    const active = statuses[studentId] === opt;
                    const color = STATUS_COLORS[opt];
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[s.statusChip, { backgroundColor: active ? color + '33' : colors.surfaceAlt, borderWidth: 1, borderColor: active ? color : colors.border }]}
                        onPress={() => setStatuses(prev => ({ ...prev, [studentId]: opt }))}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: active ? color : colors.textMuted, textTransform: 'uppercase' }}>{opt.slice(0, 4)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </FormModal>
    </View>
  );
};

export default ClassAttendanceScreen;
