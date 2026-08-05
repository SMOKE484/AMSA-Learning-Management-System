// src/screens/admin/TapAttendanceScreen.tsx
// The flagship "reader" screen — tap a student's NFC card against the phone
// to sign the register. Shows the student's photo/name and computed status.
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator,
  Modal, FlatList, Platform, AppState,
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { attendanceAdminService, TapAttendanceResult, TapAmbiguousClass, TodayScheduleEntry } from '../../services/attendanceAdmin';

type ScreenState = 'idle' | 'scanning' | 'processing' | 'result' | 'error';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  classSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 14,
  },
  classSelectorLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  classSelectorValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '700', marginTop: 2 },

  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  scanRing: {
    width: 220, height: 220, borderRadius: 110,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  scanHint: { marginTop: 24, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },

  actionBtn: {
    marginTop: 32, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  resultCard: { width: '100%', padding: 24, alignItems: 'center' },
  resultPhoto: { width: 96, height: 96, borderRadius: 48, marginBottom: 16, borderWidth: 3 },
  resultName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  resultGrade: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  statusBadgeText: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultMeta: { fontSize: 13, color: colors.textMuted, marginTop: 10, textAlign: 'center' },

  errorText: { fontSize: 15, color: colors.red, textAlign: 'center', marginTop: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  modalOptionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  modalOptionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

const STATUS_COLORS: Record<string, string> = { present: '#2E9E5B', late: '#F5A800' };

const TapAttendanceScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [result, setResult] = useState<TapAttendanceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [ambiguousClasses, setAmbiguousClasses] = useState<TapAmbiguousClass[] | null>(null);
  const [pendingCardToken, setPendingCardToken] = useState<string | null>(null);

  const [todaySchedules, setTodaySchedules] = useState<TodayScheduleEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<TodayScheduleEntry | null>(null);
  const [classPickerVisible, setClassPickerVisible] = useState(false);

  const stopRequested = useRef(false);

  useEffect(() => {
    NfcManager.start().catch(() => {});
    attendanceAdminService.getTodaySchedules().then(r => setTodaySchedules(r.schedules || [])).catch(() => {});
    return () => {
      stopRequested.current = true;
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const submitTap = useCallback(async (cardToken: string, classId?: string) => {
    setScreenState('processing');
    try {
      const res = await attendanceAdminService.tapAttendance(cardToken, classId);
      setResult(res);
      setAmbiguousClasses(null);
      setPendingCardToken(null);
      setScreenState('result');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.classes) {
        setAmbiguousClasses(err.response.data.classes);
        setPendingCardToken(cardToken);
        setScreenState('error');
        setErrorMessage(err.response.data.message || 'Multiple active classes found — please select one');
        return;
      }
      setErrorMessage(err.response?.data?.message || 'Could not process this tap');
      setScreenState('error');
    }
  }, []);

  const armScan = useCallback(async () => {
    stopRequested.current = false;
    setScreenState('scanning');
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      if (stopRequested.current) {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
        return;
      }
      const tag = await NfcManager.getTag();
      const record = tag?.ndefMessage?.[0];
      await NfcManager.cancelTechnologyRequest().catch(() => {});

      if (!record) {
        setErrorMessage('Could not read this card — try again');
        setScreenState('error');
        return;
      }

      const token = Ndef.text.decodePayload(Uint8Array.from(record.payload));
      await submitTap(token, selectedClass?._id);
    } catch (err: any) {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      if (stopRequested.current) return;
      // User cancelling the iOS system sheet (or Android back) is not an error worth alarming over.
      setScreenState('idle');
    }
  }, [selectedClass, submitTap]);

  const handleScanNext = useCallback(() => {
    setResult(null);
    setErrorMessage('');
    armScan();
  }, [armScan]);

  const handleStop = useCallback(() => {
    stopRequested.current = true;
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setScreenState('idle');
  }, []);

  const handleAmbiguousPick = useCallback((classId: string) => {
    if (pendingCardToken) submitTap(pendingCardToken, classId);
  }, [pendingCardToken, submitTap]);

  const renderIdle = () => (
    <View style={s.centerArea}>
      <View style={[s.scanRing, { borderColor: colors.border }]}>
        <Icon name="card-outline" size={72} color={colors.textMuted} />
      </View>
      <Text style={s.scanHint}>Tap "Start Scanning" then hold a student's card to the back of the phone.</Text>
      <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.teal }]} onPress={armScan}>
        <Icon name="finger-print" size={20} color="#fff" />
        <Text style={s.actionBtnText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScanning = () => (
    <View style={s.centerArea}>
      <View style={[s.scanRing, { borderColor: colors.teal }]}>
        <Icon name="finger-print" size={80} color={colors.teal} />
      </View>
      <Text style={s.scanHint}>
        {Platform.OS === 'ios' ? 'Hold the card near the top of your iPhone…' : 'Waiting for a card tap…'}
      </Text>
      <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]} onPress={handleStop}>
        <Text style={[s.actionBtnText, { color: colors.textPrimary }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProcessing = () => (
    <View style={s.centerArea}>
      <ActivityIndicator size="large" color={colors.teal} />
      <Text style={s.scanHint}>Marking attendance…</Text>
    </View>
  );

  const renderResult = () => {
    if (!result) return null;
    const statusColor = STATUS_COLORS[result.status] || colors.textMuted;
    return (
      <View style={s.centerArea}>
        <GlassCard style={s.resultCard} accentColor={statusColor}>
          {result.student.photoUrl ? (
            <Image source={{ uri: result.student.photoUrl }} style={[s.resultPhoto, { borderColor: statusColor }]} />
          ) : (
            <View style={[s.resultPhoto, { borderColor: statusColor, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="person-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <Text style={s.resultName}>{result.student.name}</Text>
          <Text style={s.resultGrade}>Grade {result.student.grade}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[s.statusBadgeText, { color: statusColor }]}>
              {result.alreadyMarked ? `Already marked ${result.status}` : result.status}
            </Text>
          </View>
          <Text style={s.resultMeta}>
            {result.class.subject} • {new Date(result.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </GlassCard>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.teal }]} onPress={handleScanNext}>
          <Icon name="finger-print" size={20} color="#fff" />
          <Text style={s.actionBtnText}>Scan Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderError = () => (
    <View style={s.centerArea}>
      <Icon name="close-circle" size={64} color={colors.red} />
      <Text style={s.errorText}>{errorMessage}</Text>
      {ambiguousClasses && (
        <View style={{ width: '100%', marginTop: 16 }}>
          {ambiguousClasses.map(c => (
            <TouchableOpacity
              key={c._id}
              style={[s.modalOption, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={() => handleAmbiguousPick(c._id)}
            >
              <Text style={s.modalOptionText}>{c.title}</Text>
              <Text style={s.modalOptionSub}>{c.subject} • {c.startTime}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.teal }]} onPress={handleScanNext}>
        <Text style={s.actionBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Tap Attendance</Text>
        <Text style={s.subtitle}>Tap a student card to sign the register</Text>
      </View>

      <TouchableOpacity
        style={[s.classSelector, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        onPress={() => setClassPickerVisible(true)}
      >
        <View>
          <Text style={s.classSelectorLabel}>CLASS</Text>
          <Text style={s.classSelectorValue}>
            {selectedClass ? `${selectedClass.subject} — ${selectedClass.title}` : 'Auto-detect from tap'}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {screenState === 'idle' && renderIdle()}
      {screenState === 'scanning' && renderScanning()}
      {screenState === 'processing' && renderProcessing()}
      {screenState === 'result' && renderResult()}
      {screenState === 'error' && renderError()}

      <Modal visible={classPickerVisible} transparent animationType="slide" onRequestClose={() => setClassPickerVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setClassPickerVisible(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Select a Class</Text>
            <FlatList
              data={[{ _id: '', title: 'Auto-detect from tap', subject: '', startTime: '', endTime: '', grade: '' }, ...todaySchedules]}
              keyExtractor={(item) => item._id || 'auto'}
              contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalOption, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  onPress={() => {
                    setSelectedClass(item._id ? item : null);
                    setClassPickerVisible(false);
                  }}
                >
                  <Text style={s.modalOptionText}>{item.title}</Text>
                  {item.subject ? <Text style={s.modalOptionSub}>{item.subject} • {item.startTime}–{item.endTime}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default TapAttendanceScreen;
