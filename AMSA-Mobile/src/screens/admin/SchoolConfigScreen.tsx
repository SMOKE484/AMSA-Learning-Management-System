// src/screens/admin/SchoolConfigScreen.tsx
// Mirrors react-admin-tutor-web's SchoolConfig.jsx (numeric/toggle settings
// only — the geofence polygon map editor stays a web-only tool for now).
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import { formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, SchoolConfig as SchoolConfigType } from '../../services/admin';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  card: { margin: 20, padding: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  saveBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const SchoolConfigScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [config, setConfig] = useState<SchoolConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getSchoolConfig();
      setConfig(res.school);
    } catch {
      Alert.alert('Error', 'Could not load school configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (patch: Partial<SchoolConfigType>) => setConfig(c => (c ? { ...c, ...patch } : c));

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await adminService.updateSchoolConfig(config);
      Alert.alert('Saved', 'School configuration updated');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>School Config</Text>
      </View>
      <ScrollView>
        <GlassCard style={s.card} accentColor={colors.blue}>
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>School Name</Text>
          <TextInput style={formInputStyle(colors)} value={config.name} onChangeText={v => update({ name: v })} />

          <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Geofencing</Text>
          <View style={s.toggleRow}>
            <Text style={{ color: colors.textPrimary }}>Enabled</Text>
            <Switch value={config.geoFencingEnabled} onValueChange={v => update({ geoFencingEnabled: v })} trackColor={{ true: colors.blue }} />
          </View>
          <View style={s.toggleRow}>
            <Text style={{ color: colors.textPrimary }}>Require location accuracy</Text>
            <Switch value={config.requireLocationAccuracy} onValueChange={v => update({ requireLocationAccuracy: v })} trackColor={{ true: colors.blue }} />
          </View>
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Allowed radius (meters)</Text>
          <TextInput style={formInputStyle(colors)} keyboardType="numeric" value={String(config.allowedRadius)} onChangeText={v => update({ allowedRadius: Number(v) || 0 })} />
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Max location accuracy (meters)</Text>
          <TextInput style={formInputStyle(colors)} keyboardType="numeric" value={String(config.maxLocationAccuracy)} onChangeText={v => update({ maxLocationAccuracy: Number(v) || 0 })} />

          <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Attendance</Text>
          <View style={s.toggleRow}>
            <Text style={{ color: colors.textPrimary }}>Auto-mark absent</Text>
            <Switch value={config.autoMarkAbsentEnabled} onValueChange={v => update({ autoMarkAbsentEnabled: v })} trackColor={{ true: colors.blue }} />
          </View>
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Check-in buffer (minutes before class)</Text>
          <TextInput style={formInputStyle(colors)} keyboardType="numeric" value={String(config.defaultCheckInBuffer)} onChangeText={v => update({ defaultCheckInBuffer: Number(v) || 0 })} />
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Check-out buffer (minutes after class)</Text>
          <TextInput style={formInputStyle(colors)} keyboardType="numeric" value={String(config.defaultCheckOutBuffer)} onChangeText={v => update({ defaultCheckOutBuffer: Number(v) || 0 })} />
          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>NFC tap late-grace (minutes after class start)</Text>
          <TextInput style={formInputStyle(colors)} keyboardType="numeric" value={String(config.nfcLateGraceMinutes)} onChangeText={v => update({ nfcLateGraceMinutes: Number(v) || 0 })} />

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.blue }]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Configuration'}</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

export default SchoolConfigScreen;
