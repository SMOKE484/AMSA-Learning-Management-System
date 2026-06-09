import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Application from 'expo-application';
import { studentService, ClassSchedule, Attendance } from '../../services/student';
import { BRAND, BrandPalette } from '../../components/theme';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import { RootStackParamList } from '../../types/navigation';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

type ClassDetailsRouteProp = RouteProp<RootStackParamList, 'ClassDetails'>;

// Accent-only maps — identical in both themes, safe as module-level constants
const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics':      BRAND.blue,
  'Physics':          '#8b5cf6',
  'Chemistry':        BRAND.teal,
  'Biology':          '#ec4899',
  'English':          BRAND.yellow,
  'History':          BRAND.red,
  'Geography':        BRAND.teal,
  'Computer Science': '#8b5cf6',
  'Art':              '#ec4899',
  'Music':            BRAND.yellow,
};
const subjectColor = (s: string) => SUBJECT_COLORS[s] || BRAND.blue;

const ATTENDANCE_COLORS: Record<string, string> = {
  present:    BRAND.teal,
  absent:     BRAND.red,
  late:       BRAND.yellow,
  excused:    BRAND.blue,
  left_early: BRAND.yellow,
};
const ATTENDANCE_LABELS: Record<string, string> = {
  present: 'Present', absent: 'Absent', late: 'Late',
  excused: 'Excused', left_early: 'Left Early',
};

// ─── Alert ────────────────────────────────────────────────────────────────────
const makeAlertStyles = (colors: BrandPalette) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    borderRadius: 28, overflow: 'hidden',
    width: '100%', maxWidth: 380,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderStrong,
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1,
  },
  title:   { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  message: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: {
    width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});

const ProfessionalAlert = ({
  visible, onClose, title, message,
  type = 'info', actionText = 'OK', onAction,
}: {
  visible: boolean; onClose: () => void;
  title: string; message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionText?: string; onAction?: () => void;
}) => {
  const { colors, mode } = useTheme();
  const al = useMemo(() => makeAlertStyles(colors), [colors]);
  const palette = {
    info:    { color: colors.blue,   dim: colors.blueDim   },
    success: { color: colors.teal,   dim: colors.tealDim   },
    warning: { color: colors.yellow, dim: colors.yellowDim },
    error:   { color: colors.red,    dim: colors.redDim    },
  };
  const iconMap = {
    info: 'information-circle', success: 'checkmark-circle',
    warning: 'warning', error: 'close-circle',
  };
  const { color, dim } = palette[type];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={al.overlay}>
        <View style={al.card}>
          {Platform.OS === 'ios'
            ? <BlurView intensity={40} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />}
          <View style={[al.iconRing, { backgroundColor: dim, borderColor: color + '40' }]}>
            <Icon name={iconMap[type] as any} size={38} color={color} />
          </View>
          <Text style={al.title}>{title}</Text>
          <Text style={al.message}>{message}</Text>
          <TouchableOpacity
            style={[al.btn, { backgroundColor: color }]}
            onPress={() => { onClose(); onAction?.(); }}
          >
            <Text style={al.btnText}>{actionText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const formatDate = (d?: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ─── Styles factory ───────────────────────────────────────────────────────────
const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg },
  scroll:     { padding: 20, paddingBottom: 40 },
  loadingWrap:{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },

  header:      { marginBottom: 20, alignItems: 'flex-start' },
  subjectChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, marginBottom: 10 },
  subjectText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  classTitle:  { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusText:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  card: { marginBottom: 16, padding: 18 },
  row:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowText: { color: colors.textSecondary, fontSize: 15, flex: 1 },

  sectionLabel: {
    fontSize: 12, color: colors.textMuted, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },
  attRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attDot:    { width: 10, height: 10, borderRadius: 5 },
  attLabel:  { fontSize: 16, fontWeight: '700' },
  checkInTime: { marginLeft: 'auto', fontSize: 13, color: colors.textMuted },

  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.teal, borderRadius: 18, paddingVertical: 18, marginTop: 8,
    shadowColor: colors.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  checkInBtnLoading: { backgroundColor: '#059669' },
  checkInBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  presentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.tealDim, borderRadius: 14, padding: 16, marginTop: 8,
  },
  presentText: { color: colors.teal, fontSize: 15, fontWeight: '600', flex: 1 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
const ClassDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ClassDetailsRouteProp>();
  const { classId, className, subject, classData: passedClassData } = route.params;

  const [classInfo, setClassInfo] = useState<ClassSchedule | null>(passedClassData || null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(!passedClassData);
  const [checkingIn, setCheckingIn] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '', message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    actionText: 'OK',
    onAction: undefined as (() => void) | undefined,
  });

  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const showAlert = (
    title: string, message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    actionText?: string, onAction?: () => void,
  ) => {
    setAlertConfig({ title, message, type, actionText: actionText || 'OK', onAction });
    setAlertVisible(true);
  };

  const getDeviceId = async (): Promise<string> => {
    if (Platform.OS === 'android') return Application.getAndroidId() || 'android-device';
    return (await Application.getIosIdForVendorAsync()) || 'ios-device';
  };

  useEffect(() => { loadData(); }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, attRes] = await Promise.allSettled([
        passedClassData
          ? Promise.resolve({ class: passedClassData })
          : studentService.getClassDetails(classId),
        studentService.getMyAttendanceForClass(classId),
      ]);
      if (classRes.status === 'fulfilled' && classRes.value?.class) {
        setClassInfo(classRes.value.class);
      }
      if (attRes.status === 'fulfilled') {
        setAttendance(attRes.value?.attendance || null);
      }
    } catch (err) {
      console.error('ClassDetailsScreen loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn) return;
    try {
      setCheckingIn(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location permission is required to sign the register.', 'warning');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await studentService.checkIn(classId, await getDeviceId(), {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      });
      showAlert('Register Signed', 'Your attendance has been recorded successfully.', 'success', 'OK', loadData);
    } catch (err: any) {
      showAlert(
        'Check-in Failed',
        err.response?.data?.message || 'Could not verify your attendance.',
        'error',
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const cls = classInfo;
  const subj = cls?.subject || subject || '';
  const color = subjectColor(subj);
  const isAlreadyPresent = attendance?.status === 'present';
  const canCheckIn = cls
    && (cls.status === 'scheduled' || cls.status === 'ongoing')
    && !isAlreadyPresent;

  const attColor = attendance ? (ATTENDANCE_COLORS[attendance.status] || BRAND.textMuted) : BRAND.textMuted;
  const attLabel = attendance ? (ATTENDANCE_LABELS[attendance.status] || attendance.status) : 'Not recorded';

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={BRAND.red} />
      </View>
    );
  }

  const classStatusColor = cls?.status === 'ongoing'
    ? BRAND.teal : cls?.status === 'completed'
    ? BRAND.red : BRAND.blue;
  const classStatusDim = cls?.status === 'ongoing'
    ? BRAND.tealDim : cls?.status === 'completed'
    ? BRAND.redDim : BRAND.blueDim;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Subject chip + title */}
        <View style={s.header}>
          <View style={[s.subjectChip, { backgroundColor: color + '22', borderColor: color + '44' }]}>
            <Text style={[s.subjectText, { color }]}>{subj || 'General'}</Text>
          </View>
          <Text style={s.classTitle}>{cls?.title || className || 'Class'}</Text>
          {cls?.status && (
            <View style={[s.statusBadge, { backgroundColor: classStatusDim }]}>
              <Text style={[s.statusText, { color: classStatusColor }]}>
                {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <GlassCard style={s.card} accentColor={color}>
          {cls?.scheduledDate && (
            <View style={s.row}>
              <Icon name="calendar" size={18} color={BRAND.textSecondary} />
              <Text style={s.rowText}>{formatDate(cls.scheduledDate)}</Text>
            </View>
          )}
          {(cls?.startTime || cls?.endTime) && (
            <View style={s.row}>
              <Icon name="time" size={18} color={BRAND.textSecondary} />
              <Text style={s.rowText}>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</Text>
            </View>
          )}
          {cls?.room && (
            <View style={s.row}>
              <Icon name="location" size={18} color={BRAND.textSecondary} />
              <Text style={s.rowText}>{cls.room}</Text>
            </View>
          )}
          {cls?.tutor?.user?.name && (
            <View style={s.row}>
              <Icon name="person" size={18} color={BRAND.textSecondary} />
              <Text style={s.rowText}>{cls.tutor.user.name}</Text>
            </View>
          )}
          {cls?.description ? (
            <View style={[s.row, { alignItems: 'flex-start', borderBottomWidth: 0 }]}>
              <Icon name="document-text" size={18} color={BRAND.textSecondary} />
              <Text style={[s.rowText, { flex: 1 }]}>{cls.description}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Attendance status */}
        <GlassCard style={s.card}>
          <Text style={s.sectionLabel}>Attendance</Text>
          <View style={s.attRow}>
            <View style={[s.attDot, { backgroundColor: attColor }]} />
            <Text style={[s.attLabel, { color: attColor }]}>{attLabel}</Text>
            {attendance?.checkIn?.time ? (
              <Text style={s.checkInTime}>
                {new Date(attendance.checkIn.time).toLocaleTimeString('en-ZA', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            ) : null}
          </View>
        </GlassCard>

        {/* Check-in button */}
        {canCheckIn && (
          <TouchableOpacity
            style={[s.checkInBtn, checkingIn && s.checkInBtnLoading]}
            onPress={handleCheckIn}
            disabled={checkingIn}
            activeOpacity={0.8}
          >
            {checkingIn ? (
              <>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                <Text style={s.checkInBtnText}>Recording…</Text>
              </>
            ) : (
              <>
                <Icon name="checkmark-circle" size={22} color="#fff" />
                <Text style={s.checkInBtnText}>Sign Register</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isAlreadyPresent && (
          <View style={s.presentBanner}>
            <Icon name="checkmark-circle" size={20} color={BRAND.teal} />
            <Text style={s.presentText}>You're marked as present for this class</Text>
          </View>
        )}

      </ScrollView>

      <ProfessionalAlert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        actionText={alertConfig.actionText}
        onAction={alertConfig.onAction}
      />
    </View>
  );
};

export default ClassDetailsScreen;
