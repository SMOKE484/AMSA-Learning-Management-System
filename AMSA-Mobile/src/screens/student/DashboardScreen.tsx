// src/screens/student/DashboardScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform, Animated, Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { studentService, ClassSchedule } from '../../services/student';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Application from 'expo-application';
import * as Location from 'expo-location';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import * as Notifications from 'expo-notifications';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';



// ─── Professional Alert ──────────────────────────────────────────────────────
const ProfessionalAlert = ({
  visible, onClose, title, message,
  type = 'info', actionText = 'OK', onAction,
}: {
  visible: boolean; onClose: () => void;
  title: string; message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionText?: string; onAction?: () => void;
}) => {
  const palette = {
    info:    { color: BRAND.blue,   dim: BRAND.blueDim  },
    success: { color: BRAND.teal,   dim: BRAND.tealDim  },
    warning: { color: BRAND.yellow, dim: BRAND.yellowDim},
    error:   { color: BRAND.red,    dim: BRAND.redDim   },
  };
  const iconMap = {
    info: 'information-circle', success: 'checkmark-circle',
    warning: 'warning', error: 'close-circle',
  };
  const { color, dim } = palette[type];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]} />
          )}
          <View style={[alertStyles.iconRing, { backgroundColor: dim, borderColor: color + '40' }]}>
            <Icon name={iconMap[type] as any} size={38} color={color} />
          </View>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity
            style={[alertStyles.btn, { backgroundColor: color }]}
            onPress={() => { onClose(); onAction?.(); }}
          >
            <Text style={alertStyles.btnText}>{actionText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    borderRadius: 28, overflow: 'hidden',
    width: '100%', maxWidth: 380,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.borderStrong,
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 1,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: BRAND.textPrimary,
    textAlign: 'center', marginBottom: 10, letterSpacing: -0.3,
  },
  message: {
    fontSize: 15, color: BRAND.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  btn: {
    width: '100%', paddingVertical: 15, borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Subject colour map ──────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics':    BRAND.blue,
  'Physics':        '#8b5cf6',
  'Chemistry':      BRAND.teal,
  'Biology':        '#ec4899',
  'English':        BRAND.yellow,
  'History':        BRAND.red,
  'Geography':      BRAND.teal,
  'Computer Science': '#8b5cf6',
  'Art':            '#ec4899',
  'Music':          BRAND.yellow,
};
const subjectColor = (s: string) => SUBJECT_COLORS[s] || BRAND.blue;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface DashboardStats {
  newNotes: number;
  averageScore: number;
  subjectCount: number;
}

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const StudentDashboardScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [stats, setStats]               = useState<DashboardStats>({ newNotes: 0, averageScore: 0, subjectCount: 0 });
  const [refreshing, setRefreshing]     = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classSchedule, setClassSchedule] = useState<ClassSchedule[]>([]);
  const [currentWeek, setCurrentWeek]   = useState<Date[]>([]);
  const [checkingIn, setCheckingIn]     = useState<string | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig]   = useState({
    title: '', message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    actionText: 'OK',
    onAction: undefined as (() => void) | undefined,
  });

  const swipeableRefs  = useRef<{ [key: string]: Swipeable | null }>({});
  const notifListener  = useRef<Notifications.Subscription | null>(null);

  // pulse animation for the greeting accent bar
  const accentPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(accentPulse, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(accentPulse, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    registerForPushNotificationsAsync().catch(console.error);
    notifListener.current = Notifications.addNotificationReceivedListener(() => loadDashboardData());
    return () => { notifListener.current?.remove(); };
  }, []);

  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    setCurrentWeek(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    }));
  }, []);

  useEffect(() => { loadDashboardData(); }, []);

  // ── helpers ────────────────────────────────────────────────────────────────
  const showAlert = (
    title: string, message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    actionText?: string, onAction?: () => void
  ) => {
    setAlertConfig({ title, message, type, actionText: actionText || 'OK', onAction });
    setAlertVisible(true);
  };

  const formatTimeAgo = (dateString: string) => {
    const ts = new Date(dateString).getTime();
    if (!dateString || isNaN(ts)) return 'recently';
    const diffMs = Date.now() - ts;
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const d = Math.floor(diffMs / 86400000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // ── data ───────────────────────────────────────────────────────────────────
  const loadDashboardData = async () => {
    try {
      const [notesData, marksData, profileData, upcomingData] = await Promise.all([
        studentService.getNotes(),
        studentService.getMarks(),
        studentService.getProfile(),
        studentService.getUpcomingClasses(),
      ]);

      const marks = marksData.marks || [];
      const avg = marks.length
        ? Math.round(marks.reduce((s: number, m: any) => s + (m.score / m.total * 100), 0) / marks.length)
        : 0;

      setStats({
        newNotes:     notesData.notes?.length || 0,
        averageScore: avg,
        subjectCount: profileData.student?.subjects?.length || 0,
      });

      const activity: any[] = [];
      if (notesData.notes?.length)
        activity.push({ type: 'note', title: `New ${notesData.notes[0].subject} Notes`,
          time: formatTimeAgo(notesData.notes[0].createdAt), icon: 'document-text', color: BRAND.blue });
      if (marksData.marks?.length)
        activity.push({ type: 'mark', title: `${marksData.marks[0].subject} Test Graded`,
          time: formatTimeAgo(marksData.marks[0].createdAt), icon: 'checkmark-circle', color: BRAND.teal });
      setRecentActivity(activity);
      setClassSchedule(upcomingData.upcomingClasses || []);

    } catch (err: any) {
      if (loading && err.response?.status === 401)
        showAlert('Session Expired', 'Please sign in again.', 'warning', 'Sign In', logout);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceId = async () => {
    if (Platform.OS === 'android') return Application.getAndroidId() || 'android-device';
    return (await Application.getIosIdForVendorAsync()) || 'ios-device';
  };

  const handleCheckIn = async (classId: string) => {
    try {
      setCheckingIn(classId);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location permission is required.', 'warning');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await studentService.checkIn(classId, await getDeviceId(), {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      });
      showAlert('Register Signed', 'Attendance registered successfully.', 'success', 'Ok',
        () => navigation.navigate('Dashboard'));
      loadDashboardData();
      setTimeout(() => swipeableRefs.current[classId]?.close(), 300);
    } catch (err: any) {
      showAlert('Check-in Failed', err.response?.data?.message || 'Attendance verification failed.', 'error');
    } finally {
      setCheckingIn(null);
    }
  };

  // ── schedule helpers ───────────────────────────────────────────────────────
  const getClassesForDate = () => {
    const ds = selectedDate.toISOString().split('T')[0];
    return classSchedule
      .filter(c => new Date(c.scheduledDate).toISOString().split('T')[0] === ds &&
        (c.status === 'scheduled' || c.status === 'ongoing'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getDayClasses = (date: Date) => {
    const ds = date.toISOString().split('T')[0];
    return classSchedule.filter(c =>
      new Date(c.scheduledDate).toISOString().split('T')[0] === ds && c.status === 'scheduled');
  };

  // ── swipe action ───────────────────────────────────────────────────────────
  const renderRightActions = (progress: any, dragX: any, classItem: ClassSchedule) => {
    if (classItem.status !== 'scheduled' && classItem.status !== 'ongoing') return null;
    const trans = dragX.interpolate({ inputRange: [-120, 0], outputRange: [0, 120], extrapolate: 'clamp' });
    const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.05, 1], extrapolate: 'clamp' });

    return (
      <View style={s.swipeOuter}>
        <Animated.View style={[s.swipeInner, {
          transform: [{ translateX: trans }, { scale }],
          backgroundColor: checkingIn === classItem._id ? '#059669' : BRAND.teal,
        }]}>
          {checkingIn === classItem._id ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.swipeLabel}>Recording…</Text>
            </>
          ) : (
            <>
              <Icon name="checkmark-circle" size={28} color="#fff" />
              <Text style={s.swipeLabel}>Sign Register</Text>
              <Text style={s.swipeSub}>Swipe to confirm</Text>
            </>
          )}
        </Animated.View>
      </View>
    );
  };

  // ── loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={BRAND.red} />
        <Text style={s.loadingTitle}>Loading dashboard…</Text>
        <Text style={s.loadingSubtitle}>Preparing your academic overview</Text>
      </View>
    );
  }

  const todayClasses = getClassesForDate();
  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: BOTTOM_PAD }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadDashboardData();
            setRefreshing(false);
          }} tintColor={BRAND.red} colors={[BRAND.red]} />
        }
      >

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          {/* coloured chevron accent strip */}
          <View style={s.headerAccentRow}>
            {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
              <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
            ))}
          </View>
          <View style={s.headerContent}>
            <View>
              <Text style={s.welcome}>Welcome back,</Text>
              <Text style={s.userName}>{user?.name}!</Text>
            </View>
            <TouchableOpacity style={s.notifBtn}>
              <Icon name="notifications-outline" size={22} color={BRAND.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATS ROW ──────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          {[
            { icon: 'document-text', value: stats.newNotes,     label: 'New Notes', color: BRAND.blue,   dim: BRAND.blueDim   },
            { icon: 'trophy',        value: `${stats.averageScore}%`, label: 'Avg. Score', color: BRAND.yellow, dim: BRAND.yellowDim },
            { icon: 'school',        value: stats.subjectCount, label: 'Subjects',  color: BRAND.red,    dim: BRAND.redDim    },
          ].map((item, i) => (
            <GlassCard key={i} style={s.statCard} accentColor={item.color} accentSide="top">
              <View style={[s.statIconWrap, { backgroundColor: item.dim }]}>
                <Icon name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={s.statValue}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* ── TODAY'S CLASSES ────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionAccent, { backgroundColor: BRAND.red }]} />
              <Text style={s.sectionTitle}>Today's Classes</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={[s.viewAll, { color: BRAND.teal }]}>Full Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Week strip */}
          <View style={s.weekStrip}>
            {currentWeek.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday    = date.toDateString() === new Date().toDateString();
              const hasCls     = getDayClasses(date).length > 0;
              const DAY_NAMES  = ['S','M','T','W','T','F','S'];
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.dayBtn,
                    isSelected && { backgroundColor: BRAND.red, borderColor: BRAND.red },
                    isToday && !isSelected && { borderColor: BRAND.teal },
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[s.dayName, isSelected && s.dayTextActive, isToday && !isSelected && { color: BRAND.teal }]}>
                    {DAY_NAMES[date.getDay()]}
                  </Text>
                  <Text style={[s.dayNum, isSelected && s.dayTextActive, isToday && !isSelected && { color: BRAND.teal }]}>
                    {date.getDate()}
                  </Text>
                  {hasCls && <View style={[s.dot, { backgroundColor: isSelected ? '#fff' : BRAND.teal }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Class cards */}
          {todayClasses.length > 0 ? todayClasses.map(cls => {
            const accent = subjectColor(cls.subject);
            return (
              <View key={cls._id} style={{ marginBottom: 12 }}>
                <Swipeable
                  ref={ref => { swipeableRefs.current[cls._id] = ref; }}
                  renderRightActions={(p, d) => renderRightActions(p, d, cls)}
                  onSwipeableOpen={dir => { if (dir === 'right') handleCheckIn(cls._id); }}
                  overshootRight={false} friction={2}
                  enableTrackpadTwoFingerGesture rightThreshold={40}
                >
                  <GlassCard accentColor={accent} accentSide="left" style={{ borderRadius: 18 }}>
                    <TouchableOpacity
                      style={s.classCardInner}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('ClassDetails', {
                        classId: cls._id, className: cls.title,
                      } as any)}
                    >
                      <View style={s.classTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.classSubject, { color: accent }]}>{cls.subject}</Text>
                          <Text style={s.classTitle}>{cls.title}</Text>
                        </View>
                        <View style={[s.timePill, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
                          <Text style={[s.timePillText, { color: accent }]}>{formatTime(cls.startTime)}</Text>
                        </View>
                      </View>

                      <View style={s.classMeta}>
                        <View style={s.classMetaRow}>
                          <Icon name="time-outline" size={14} color={BRAND.textSecondary} />
                          <Text style={s.classMetaText}>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</Text>
                        </View>
                        {cls.room && (
                          <View style={s.classMetaRow}>
                            <Icon name="location-outline" size={14} color={BRAND.textSecondary} />
                            <Text style={s.classMetaText}>{cls.room}</Text>
                          </View>
                        )}
                      </View>

                      <View style={s.classFooter}>
                        <View style={[
                          s.statusPill,
                          cls.status === 'ongoing'   && { backgroundColor: BRAND.yellowDim, borderColor: BRAND.yellow + '44' },
                          cls.status === 'completed' && { backgroundColor: BRAND.tealDim,   borderColor: BRAND.teal + '44'   },
                          cls.status === 'scheduled' && { backgroundColor: BRAND.blueDim,   borderColor: BRAND.blue + '44'   },
                        ]}>
                          <Text style={[
                            s.statusText,
                            cls.status === 'ongoing'   && { color: BRAND.yellow },
                            cls.status === 'completed' && { color: BRAND.teal   },
                            cls.status === 'scheduled' && { color: BRAND.blue   },
                          ]}>
                            {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                          </Text>
                        </View>
                        {(cls.status === 'scheduled' || cls.status === 'ongoing') && (
                          <View style={s.swipeHint}>
                            <Text style={s.swipeHintText}>Swipe left to sign</Text>
                            <Icon name="chevron-back" size={12} color={BRAND.textMuted} />
                            <Icon name="chevron-back" size={12} color={BRAND.textMuted} style={{ marginLeft: -6 }} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                </Swipeable>
              </View>
            );
          }) : (
            <View style={s.empty}>
              <Icon name="calendar-outline" size={44} color={BRAND.textMuted} />
              <Text style={s.emptyText}>No classes scheduled</Text>
              <Text style={s.emptySub}>Enjoy your free time!</Text>
            </View>
          )}
        </View>

        {/* ── RECENT ACTIVITY ────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionAccent, { backgroundColor: BRAND.teal }]} />
              <Text style={s.sectionTitle}>Recent Activity</Text>
            </View>
          </View>

          {recentActivity.length > 0 ? recentActivity.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => {
              if (item.type === 'note') navigation.navigate('Notes');
              else if (item.type === 'mark') navigation.navigate('Marks');
            }}>
              <GlassCard style={[s.activityCard, { marginBottom: 10 }]}>
                <View style={s.activityInner}>
                  <View style={[s.activityIconWrap, { backgroundColor: item.color + '22', borderColor: item.color + '44' }]}>
                    <Icon name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{item.title}</Text>
                    <Text style={s.activityTime}>{item.time}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={BRAND.textMuted} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )) : (
            <View style={s.empty}>
              <Icon name="time-outline" size={44} color={BRAND.textMuted} />
              <Text style={s.emptyText}>No recent activity</Text>
            </View>
          )}
        </View>

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
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BRAND.bg },
  loadingWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.bg },
  loadingTitle:  { marginTop: 16, fontSize: 17, color: BRAND.textPrimary, fontWeight: '600' },
  loadingSubtitle:{ fontSize: 13, color: BRAND.textSecondary, marginTop: 4 },

  // Header
  header: { backgroundColor: BRAND.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  headerAccentRow: { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
  welcome:       { fontSize: 14, color: BRAND.textSecondary, letterSpacing: 0.3 },
  userName:      { fontSize: 28, fontWeight: '800', color: BRAND.textPrimary, marginTop: 2, letterSpacing: -0.5 },
  notifBtn:      { width: 44, height: 44, borderRadius: 14, backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center' },

  // Stats
  statsRow:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  statCard:      { flex: 1, padding: 14, alignItems: 'center' },
  statIconWrap:  { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue:     { fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  statLabel:     { fontSize: 11, color: BRAND.textSecondary, marginTop: 2, fontWeight: '600', textAlign: 'center' },

  // Section
  section:       { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:  { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },
  viewAll:       { fontSize: 13, fontWeight: '600' },

  // Week strip
  weekStrip:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: BRAND.surface, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: BRAND.border },
  dayBtn:        { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, minWidth: 40, borderWidth: 1, borderColor: 'transparent' },
  dayName:       { fontSize: 11, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 4 },
  dayNum:        { fontSize: 15, fontWeight: '700', color: BRAND.textPrimary },
  dayTextActive: { color: '#fff' },
  dot:           { width: 4, height: 4, borderRadius: 2, marginTop: 4 },

  // Class card
  classCardInner:{ padding: 16 },
  classTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  classSubject:  { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  classTitle:    { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  timePill:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, marginLeft: 8 },
  timePillText:  { fontSize: 12, fontWeight: '700' },
  classMeta:     { marginBottom: 12 },
  classMetaRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 },
  classMetaText: { fontSize: 13, color: BRAND.textSecondary },
  classFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: BRAND.border, paddingTop: 10 },
  statusPill:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  swipeHint:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  swipeHintText: { fontSize: 11, color: BRAND.textMuted },

  // Swipe action
  swipeOuter:    { backgroundColor: BRAND.teal, justifyContent: 'center', alignItems: 'flex-end', flex: 1, borderRadius: 18, overflow: 'hidden' },
  swipeInner:    { width: 120, height: '100%', justifyContent: 'center', alignItems: 'center', gap: 4 },
  swipeLabel:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  swipeSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  // Activity
  activityCard:  {},
  activityInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activityIconWrap:{ width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: BRAND.textPrimary, marginBottom: 3 },
  activityTime:  { fontSize: 12, color: BRAND.textSecondary },

  // Empty
  empty:         { alignItems: 'center', paddingVertical: 40 },
  emptyText:     { marginTop: 12, fontSize: 15, color: BRAND.textSecondary, fontWeight: '500' },
  emptySub:      { fontSize: 13, color: BRAND.textMuted, marginTop: 4 },
});

export default StudentDashboardScreen;