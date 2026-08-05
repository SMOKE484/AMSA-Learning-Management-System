// src/screens/admin/ManageMarksScreen.tsx
// Mirrors react-admin-tutor-web's ManageMarks.jsx: view/filter/delete marks.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { ChipSelector } from '../../components/ChipSelector';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminMark } from '../../services/admin';
import { academicService } from '../../services/academic';
import { pct, calculateGrade, getGradeColor } from '../../utils/formatting';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  filterWrap: { paddingHorizontal: 20, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 8 },
});

const ManageMarksScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [marks, setMarks] = useState<AdminMark[]>([]);
  const [average, setAverage] = useState('0');
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [marksRes, config] = await Promise.all([
        adminService.getAllMarks({ grade: filterGrade || undefined, subject: filterSubject || undefined }),
        academicService.getConfig(),
      ]);
      setMarks(marksRes.marks || []);
      setAverage(marksRes.meta?.averageScore || '0');
      setGrades(config.grades || []);
      setSubjects(config.subjects || []);
    } catch {
      Alert.alert('Error', 'Could not load marks');
    } finally {
      setLoading(false);
    }
  }, [filterGrade, filterSubject]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (mark: AdminMark) => {
    Alert.alert('Delete Mark', `Delete ${mark.testName} for ${mark.student?.user?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await adminService.deleteMark(mark._id);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete mark');
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
        <Text style={s.title}>Marks</Text>
        <Text style={s.subtitle}>{marks.length} records • Avg {average}%</Text>
      </View>

      <View style={s.filterWrap}>
        <ChipSelector
          options={grades}
          selected={filterGrade ? [filterGrade] : []}
          onToggle={(v) => setFilterGrade(filterGrade === String(v) ? null : String(v))}
          accentColor={colors.blue}
        />
      </View>
      <View style={s.filterWrap}>
        <ChipSelector
          options={subjects}
          selected={filterSubject ? [filterSubject] : []}
          onToggle={(v) => setFilterSubject(filterSubject === String(v) ? null : String(v))}
          accentColor={colors.blue}
        />
      </View>

      <FlatList
        data={marks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const p = pct(item.score, item.total);
          const grade = calculateGrade(p);
          const gradeColor = getGradeColor(grade);
          return (
            <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.student?.user?.name || 'Unknown'}</Text>
                <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{item.subject} • {item.testName} • {item.score}/{item.total}</Text>
              </View>
              <View style={[s.gradeBadge, { backgroundColor: gradeColor + '22' }]}>
                <Text style={{ color: gradeColor, fontWeight: '700', fontSize: 12 }}>{grade}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Icon name="close-circle" size={20} color={colors.red} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};

export default ManageMarksScreen;
