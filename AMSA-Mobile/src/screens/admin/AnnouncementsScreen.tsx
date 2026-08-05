// src/screens/admin/AnnouncementsScreen.tsx
// Mirrors react-admin-tutor-web's Announcements.jsx: broadcast a message to
// students/parents, optionally filtered by grade.
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { GlassCard } from '../../components/GlassCard';
import { ChipSelector } from '../../components/ChipSelector';
import { formInputStyle } from '../../components/FormModal';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService } from '../../services/admin';
import { academicService } from '../../services/academic';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  card: { margin: 20, padding: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  messageInput: { minHeight: 100, textAlignVertical: 'top' },
  sendBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const TARGETS = ['students', 'parents', 'both'] as const;

const AnnouncementsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<string>('both');
  const [grades, setGrades] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => { academicService.getConfig().then(c => setGrades(c.grades || [])).catch(() => {}); }, []);

  const toggleGrade = (v: string | number) => {
    const value = String(v);
    setSelectedGrades(prev => prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in a title and message'); return;
    }
    try {
      setSending(true);
      const res = await adminService.postAnnouncement({
        title: title.trim(), message: message.trim(), target: target as any,
        grades: selectedGrades.length > 0 ? selectedGrades : undefined,
      });
      Alert.alert('Sent', `Announcement sent to ${res.notificationsSent ?? 0} recipient(s)`);
      setTitle(''); setMessage(''); setSelectedGrades([]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Announcements</Text>
      </View>
      <ScrollView>
        <GlassCard style={s.card} accentColor={colors.blue}>
          <TextInput style={formInputStyle(colors)} placeholder="Title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
          <TextInput
            style={[formInputStyle(colors), s.messageInput]}
            placeholder="Message" placeholderTextColor={colors.textMuted}
            value={message} onChangeText={setMessage} multiline
          />

          <Text style={[s.label, { color: colors.textMuted }]}>Send To</Text>
          <ChipSelector options={TARGETS as unknown as string[]} selected={[target]} onToggle={v => setTarget(String(v))} accentColor={colors.blue} />

          <Text style={[s.label, { color: colors.textMuted }]}>Grades (optional — leave empty for all)</Text>
          <ChipSelector options={grades} selected={selectedGrades} onToggle={toggleGrade} accentColor={colors.blue} />

          <TouchableOpacity style={[s.sendBtn, { backgroundColor: colors.blue }]} onPress={handleSend} disabled={sending}>
            <Text style={s.sendBtnText}>{sending ? 'Sending…' : 'Send Announcement'}</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

export default AnnouncementsScreen;
