// src/screens/admin/AdminDashboardScreen.tsx
// Mirrors react-admin-tutor-web's AdminDashboard.jsx: summary counts, plus
// doubles as the navigation hub into every Stack-level admin screen (the
// bottom tab bar only has room for a handful of destinations).
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService } from '../../services/admin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  tile: { width: '31%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  tileIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tileLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

interface NavTile { label: string; icon: string; screen: string; color: string }

const ManageTiles: NavTile[] = [
  { label: 'Students', icon: 'people-outline', screen: 'ManageStudents', color: '#3ABFBF' },
  { label: 'Tutors', icon: 'school-outline', screen: 'ManageTutors', color: '#2B6E9E' },
  { label: 'Parents', icon: 'person-outline', screen: 'ManageParents', color: '#F5A800' },
  { label: 'Schedules', icon: 'calendar-outline', screen: 'ManageSchedules', color: '#3ABFBF' },
  { label: 'Attendance', icon: 'checkmark-circle', screen: 'ClassAttendanceMirror', color: '#2E9E5B' },
  { label: 'Marks', icon: 'bar-chart-outline', screen: 'ManageMarks', color: '#2B6E9E' },
  { label: 'Subjects', icon: 'book', screen: 'ManageSubjects', color: '#F5A800' },
  { label: 'Admins', icon: 'lock-closed-outline', screen: 'ManageAdmins', color: '#E8341C' },
  { label: 'Staff', icon: 'person-outline', screen: 'ManageStaff', color: '#E8341C' },
  { label: 'School Config', icon: 'help-circle-outline', screen: 'SchoolConfig', color: '#2B6E9E' },
  { label: 'Announcements', icon: 'megaphone', screen: 'Announcements', color: '#F5A800' },
  { label: 'Messages', icon: 'chatbubble-outline', screen: 'AdminMessages', color: '#3ABFBF' },
  { label: 'Enroll Card', icon: 'card-outline', screen: 'Enroll', color: '#3ABFBF' },
  { label: 'Manage Cards', icon: 'card-outline', screen: 'ManageCards', color: '#2B6E9E' },
];

const AdminDashboardScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();

  const [stats, setStats] = useState({ students: 0, tutors: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [studentsRes, tutorsRes, schedulesRes] = await Promise.all([
        adminService.getStudents(),
        adminService.getTutors(),
        adminService.getSchedules({ limit: 1 }),
      ]);
      setStats({
        students: studentsRes.students?.length || 0,
        tutors: tutorsRes.tutors?.length || 0,
        classes: schedulesRes.pagination?.total || 0,
      });
    } catch {
      Alert.alert('Error', 'Could not load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Dashboard</Text>
        <Text style={s.subtitle}>School overview</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.statsRow}>
          <GlassCard style={s.statCard} accentColor={colors.teal}>
            <Text style={[s.statValue, { color: colors.textPrimary }]}>{stats.students}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Students</Text>
          </GlassCard>
          <GlassCard style={s.statCard} accentColor={colors.blue}>
            <Text style={[s.statValue, { color: colors.textPrimary }]}>{stats.tutors}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Tutors</Text>
          </GlassCard>
          <GlassCard style={s.statCard} accentColor={colors.yellow}>
            <Text style={[s.statValue, { color: colors.textPrimary }]}>{stats.classes}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Classes</Text>
          </GlassCard>
        </View>

        <Text style={s.sectionLabel}>Manage</Text>
        <View style={s.grid}>
          {ManageTiles.map(tile => (
            <TouchableOpacity
              key={tile.screen}
              style={[s.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => (navigation as any).navigate(tile.screen)}
            >
              <View style={[s.tileIcon, { backgroundColor: tile.color + '22' }]}>
                <Icon name={tile.icon as any} size={20} color={tile.color} />
              </View>
              <Text style={[s.tileLabel, { color: colors.textPrimary }]}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminDashboardScreen;
