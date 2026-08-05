// src/screens/admin/EnrollCardScreen.tsx
// Admin picks a student, taps a blank NFC card, and the app writes the
// server-issued opaque token onto it. Also supports revoking a lost card.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { adminService, AdminStudent } from '../../services/admin';
import { cardsService, Card } from '../../services/cards';

type WriteState = 'idle' | 'requestingToken' | 'waitingForTap' | 'writing' | 'success' | 'error';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  searchWrap: { marginHorizontal: 20, marginBottom: 12 },
  searchInput: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15,
  },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1,
  },
  studentName: { fontSize: 15, fontWeight: '700' },
  studentGrade: { fontSize: 12, marginTop: 2 },

  detailCard: { margin: 20, padding: 20 },
  detailName: { fontSize: 20, fontWeight: '800' },
  detailGrade: { fontSize: 13, marginTop: 2, marginBottom: 16 },

  cardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardStatusText: { fontSize: 14, fontWeight: '600' },

  actionBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 8, marginTop: 8,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  backBtn: { paddingHorizontal: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { fontSize: 14, fontWeight: '600' },

  statusText: { fontSize: 14, textAlign: 'center', marginTop: 12 },
});

const EnrollCardScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [existingCard, setExistingCard] = useState<Card | null>(null);
  const [writeState, setWriteState] = useState<WriteState>('idle');
  const [writeMessage, setWriteMessage] = useState('');

  useEffect(() => {
    NfcManager.start().catch(() => {});
    adminService.getStudents()
      .then(r => setStudents(r.students || []))
      .catch(() => Alert.alert('Error', 'Could not load students'))
      .finally(() => setLoading(false));
    return () => { NfcManager.cancelTechnologyRequest().catch(() => {}); };
  }, []);

  const filtered = students.filter(st =>
    !query || st.user?.name?.toLowerCase().includes(query.toLowerCase())
  );

  const selectStudent = useCallback(async (student: AdminStudent) => {
    setSelectedStudent(student);
    setWriteState('idle');
    setWriteMessage('');
    try {
      const res = await cardsService.getCardForStudent(student._id);
      setExistingCard(res.card);
    } catch {
      setExistingCard(null);
    }
  }, []);

  const handleWriteCard = useCallback(async () => {
    if (!selectedStudent) return;
    try {
      setWriteState('requestingToken');
      const { token } = await cardsService.enrollCard(selectedStudent._id);

      setWriteState('waitingForTap');
      await NfcManager.requestTechnology(NfcTech.Ndef);

      setWriteState('writing');
      const bytes = Ndef.encodeMessage([Ndef.textRecord(token)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      await NfcManager.cancelTechnologyRequest().catch(() => {});

      setWriteState('success');
      setWriteMessage('Card written successfully');
      const res = await cardsService.getCardForStudent(selectedStudent._id);
      setExistingCard(res.card);
    } catch (err: any) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      setWriteState('error');
      setWriteMessage(err.response?.data?.message || err.message || 'Failed to write card');
    }
  }, [selectedStudent]);

  const handleRevoke = useCallback(() => {
    if (!existingCard) return;
    Alert.alert('Revoke Card', 'This card will stop working immediately. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          try {
            await cardsService.revokeCard(existingCard._id, 'Reported lost/stolen');
            setExistingCard(null);
            Alert.alert('Done', 'Card revoked. You can now enroll a new one.');
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to revoke card');
          }
        }
      },
    ]);
  }, [existingCard]);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (selectedStudent) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Enroll Card</Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={() => setSelectedStudent(null)}>
          <Icon name="chevron-back" size={18} color={colors.teal} />
          <Text style={[s.backBtnText, { color: colors.teal }]}>Back to student list</Text>
        </TouchableOpacity>

        <GlassCard style={s.detailCard} accentColor={colors.blue}>
          <Text style={[s.detailName, { color: colors.textPrimary }]}>{selectedStudent.user?.name || '(no linked account)'}</Text>
          <Text style={[s.detailGrade, { color: colors.textSecondary }]}>Grade {selectedStudent.grade}</Text>

          <View style={s.cardStatusRow}>
            <Icon name="card-outline" size={18} color={existingCard ? colors.teal : colors.textMuted} />
            <Text style={[s.cardStatusText, { color: existingCard ? colors.teal : colors.textMuted }]}>
              {existingCard ? 'Has an active card' : 'No card enrolled'}
            </Text>
          </View>

          {writeState === 'idle' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.teal }]} onPress={handleWriteCard}>
              <Icon name="card-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>{existingCard ? 'Write Replacement Card' : 'Write New Card'}</Text>
            </TouchableOpacity>
          )}

          {(writeState === 'requestingToken' || writeState === 'waitingForTap' || writeState === 'writing') && (
            <>
              <ActivityIndicator size="small" color={colors.teal} style={{ marginTop: 16 }} />
              <Text style={[s.statusText, { color: colors.textSecondary }]}>
                {writeState === 'waitingForTap' ? 'Hold a blank card to the phone…' : writeState === 'writing' ? 'Writing…' : 'Preparing…'}
              </Text>
            </>
          )}

          {writeState === 'success' && (
            <Text style={[s.statusText, { color: colors.teal, fontWeight: '700' }]}>{writeMessage}</Text>
          )}
          {writeState === 'error' && (
            <Text style={[s.statusText, { color: colors.red, fontWeight: '600' }]}>{writeMessage}</Text>
          )}

          {existingCard && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.red }]} onPress={handleRevoke}>
              <Icon name="close-circle" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Report Lost / Revoke</Text>
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Enroll Card</Text>
        <Text style={s.subtitle}>Select a student to write or replace their attendance card</Text>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={[s.searchInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
          placeholder="Search students…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.studentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => selectStudent(item)}
          >
            <View>
              <Text style={[s.studentName, { color: colors.textPrimary }]}>{item.user?.name || '(no linked account)'}</Text>
              <Text style={[s.studentGrade, { color: colors.textSecondary }]}>Grade {item.grade}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default EnrollCardScreen;
