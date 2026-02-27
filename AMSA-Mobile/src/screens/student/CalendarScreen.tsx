// src/screens/student/CalendarScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Platform,
} from 'react-native';
import { studentService } from '../../services/student';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { Icon } from '../../components/Icon';
import { BlurView } from 'expo-blur';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { getSubjectColor } from '../../utils/formatting';




// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDateToLocalString = (date: Date): string => {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string): Date => {
  const clean = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date(NaN);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const isSameDay = (d1: Date, d2: Date): boolean =>
  formatDateToLocalString(d1) === formatDateToLocalString(d2);

const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES  = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const CalendarScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [loading, setLoading]             = useState(true);
  const [schedule, setSchedule]           = useState<any[]>([]);
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [modalVisible, setModalVisible]   = useState(false);

  useEffect(() => { loadSchedule(); }, [currentDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const data = await studentService.getSchedule({
        startDate: formatDateToLocalString(startDate),
        endDate:   formatDateToLocalString(endDate),
        status: 'scheduled',
      });
      setSchedule(data.schedules || []);
    } catch {
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getClassesForDate = (date: Date) => {
    if (!date) return [];
    const target = formatDateToLocalString(date);
    return schedule.filter(cls => {
      if (!cls.scheduledDate) return false;
      try {
        const parsed = parseDateString(cls.scheduledDate);
        return !isNaN(parsed.getTime()) && formatDateToLocalString(parsed) === target;
      } catch {
        return false;
      }
    });
  };

  const getDaysInMonth = (): (Date | null)[] => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstDayOfWeek).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const classes = getClassesForDate(date);
    if (classes.length > 0) {
      setSelectedClass(classes[0]);
      setModalVisible(true);
    }
  };

  const handleClassSelect = (classItem: any) => {
    navigation.navigate('ClassDetails', {
      classId:   classItem._id,
      className: classItem.title,
      subject:   classItem.subject,
      classData: classItem,
    });
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <BouncingDotsLoader size={20} />
        <Text style={s.loadingText}>Loading schedule…</Text>
      </View>
    );
  }

  const selectedClasses = getClassesForDate(selectedDate);

  return (
    <View style={s.container}>
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Icon name="arrow-back" size={22} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Class Calendar</Text>
          <TouchableOpacity onPress={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t); }}>
            <Text style={s.todayBtn}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MONTH NAVIGATION ───────────────────────────────────────────── */}
      <View style={s.monthNav}>
        <TouchableOpacity
          style={s.monthNavBtn}
          onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
        >
          <Icon name="chevron-back" size={22} color={BRAND.teal} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <TouchableOpacity
          style={s.monthNavBtn}
          onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
        >
          <Icon name="chevron-forward" size={22} color={BRAND.teal} />
        </TouchableOpacity>
      </View>

      {/* ── DAYS OF WEEK ───────────────────────────────────────────────── */}
      <View style={s.daysOfWeek}>
        {DAYS_OF_WEEK.map(d => (
          <Text key={d} style={s.dayOfWeekText}>{d}</Text>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── CALENDAR GRID ──────────────────────────────────────────── */}
        <View style={s.calendarGrid}>
          {getDaysInMonth().map((date, index) => {
            const isToday    = date ? isSameDay(date, new Date()) : false;
            const isSelected = date ? isSameDay(date, selectedDate) : false;
            const classes    = date ? getClassesForDate(date) : [];
            return (
              <TouchableOpacity
                key={index}
                style={[
                  s.dayCell,
                  isToday    && s.todayCell,
                  isSelected && s.selectedCell,
                  !date      && s.emptyCell,
                ]}
                onPress={() => date && handleDateSelect(date)}
                disabled={!date}
              >
                {date && (
                  <>
                    <Text style={[
                      s.dayNumber,
                      isToday    && { color: BRAND.teal },
                      isSelected && { color: '#fff' },
                    ]}>
                      {date.getDate()}
                    </Text>
                    {classes.length > 0 && (
                      <View style={s.dotRow}>
                        {classes.slice(0, 3).map((cls, i) => (
                          <View key={i} style={[s.dot, { backgroundColor: isSelected ? '#fff' : getSubjectColor(cls.subject) }]} />
                        ))}
                        {classes.length > 3 && (
                          <Text style={[s.moreDots, isSelected && { color: '#fff' }]}>+{classes.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SELECTED DATE CLASSES ──────────────────────────────────── */}
        {selectedClasses.length > 0 ? (
          <View style={s.classesSection}>
            <View style={s.sectionHeaderRow}>
              <View style={[s.sectionAccent, { backgroundColor: BRAND.teal }]} />
              <Text style={s.sectionTitle}>{formatDate(selectedDate)}</Text>
            </View>
            {selectedClasses.map(cls => {
              const color = getSubjectColor(cls.subject);
              return (
                <TouchableOpacity key={cls._id} onPress={() => handleClassSelect(cls)}>
                  <GlassCard accentColor={color} style={s.classCard}>
                    <View style={s.classInner}>
                      <View style={s.classTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.classSubject, { color }]}>{cls.subject}</Text>
                          <Text style={s.classTitle}>{cls.title}</Text>
                        </View>
                        <View style={[s.timePill, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                          <Text style={[s.timePillText, { color }]}>{formatTime(cls.startTime)}</Text>
                        </View>
                      </View>
                      <View style={s.classMeta}>
                        <View style={s.classMetaRow}>
                          <Icon name="time-outline" size={13} color={BRAND.textSecondary} />
                          <Text style={s.classMetaText}>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</Text>
                        </View>
                        {cls.tutor?.user?.name && (
                          <View style={s.classMetaRow}>
                            <Icon name="person-outline" size={13} color={BRAND.textSecondary} />
                            <Text style={s.classMetaText}>{cls.tutor.user.name}</Text>
                          </View>
                        )}
                        {cls.room && (
                          <View style={s.classMetaRow}>
                            <Icon name="location-outline" size={13} color={BRAND.textSecondary} />
                            <Text style={s.classMetaText}>{cls.room}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Icon name="calendar-outline" size={40} color={BRAND.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No classes on {formatDate(selectedDate)}</Text>
            <Text style={s.emptySub}>Enjoy your free time!</Text>
          </View>
        )}
      </ScrollView>

      {/* ── CLASS DETAIL MODAL ─────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND.surfaceAlt }]} />
            )}
            {selectedClass && (
              <>
                <View style={s.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalSubject, { color: getSubjectColor(selectedClass.subject) }]}>
                      {selectedClass.subject}
                    </Text>
                    <Text style={s.modalTitle}>{selectedClass.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={s.modalClose}>
                    <Icon name="close" size={18} color={BRAND.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={s.modalDetails}>
                  <View style={s.modalRow}>
                    <Icon name="time-outline" size={18} color={BRAND.teal} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalRowLabel}>Time</Text>
                      <Text style={s.modalRowValue}>{formatTime(selectedClass.startTime)} – {formatTime(selectedClass.endTime)}</Text>
                    </View>
                  </View>
                  {selectedClass.tutor?.user?.name && (
                    <View style={s.modalRow}>
                      <Icon name="person-outline" size={18} color={BRAND.blue} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.modalRowLabel}>Tutor</Text>
                        <Text style={s.modalRowValue}>{selectedClass.tutor.user.name}</Text>
                      </View>
                    </View>
                  )}
                  {selectedClass.room && (
                    <View style={s.modalRow}>
                      <Icon name="location-outline" size={18} color={BRAND.yellow} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.modalRowLabel}>Room</Text>
                        <Text style={s.modalRowValue}>{selectedClass.room}</Text>
                      </View>
                    </View>
                  )}
                  {selectedClass.description && (
                    <View style={s.modalRow}>
                      <Icon name="document-text-outline" size={18} color={BRAND.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.modalRowLabel}>Description</Text>
                        <Text style={s.modalRowValue}>{selectedClass.description}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={s.modalBtn}
                  onPress={() => { setModalVisible(false); handleClassSelect(selectedClass); }}
                >
                  <Text style={s.modalBtnText}>View Full Details</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BRAND.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: BRAND.textSecondary },

  // Header
  header:           { backgroundColor: BRAND.surface, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56 },
  backBtn:          { width: 38, height: 38, borderRadius: 12, backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center' },
  title:            { fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },
  todayBtn:         { fontSize: 14, fontWeight: '700', color: BRAND.teal },

  // Month nav
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: BRAND.surface, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  monthNavBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center' },
  monthLabel:  { fontSize: 17, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },

  // Days of week
  daysOfWeek:    { flexDirection: 'row', backgroundColor: BRAND.surface, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  dayOfWeekText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: BRAND.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  scroll: { flex: 1 },

  // Calendar grid
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: BRAND.surface, padding: 8, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  dayCell:      { width: '14.28%', aspectRatio: 1, padding: 4, alignItems: 'center', justifyContent: 'flex-start', borderRadius: 10 },
  emptyCell:    { opacity: 0 },
  todayCell:    { borderWidth: 1, borderColor: BRAND.teal + '55', backgroundColor: BRAND.tealDim, borderRadius: 10 },
  selectedCell: { backgroundColor: BRAND.red, borderRadius: 10 },
  dayNumber:    { fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginTop: 4 },
  dotRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 2 },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  moreDots:     { fontSize: 8, color: BRAND.textMuted },

  // Classes section
  classesSection:  { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent:   { width: 3, height: 20, borderRadius: 2 },
  sectionTitle:    { fontSize: 14, fontWeight: '600', color: BRAND.textSecondary, flex: 1 },
  classCard:       { marginBottom: 12 },
  classInner:      { padding: 14 },
  classTop:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  classSubject:    { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  classTitle:      { fontSize: 13, color: BRAND.textSecondary, marginTop: 2 },
  timePill:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, marginLeft: 8 },
  timePillText:    { fontSize: 12, fontWeight: '700' },
  classMeta:       { gap: 5 },
  classMetaRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  classMetaText:   { fontSize: 12, color: BRAND.textSecondary },

  // Empty
  empty:         { alignItems: 'center', paddingVertical: 48 },
  emptyIconRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 15, fontWeight: '600', color: BRAND.textSecondary, textAlign: 'center' },
  emptySub:      { fontSize: 13, color: BRAND.textMuted, textAlign: 'center', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', padding: 28,
    borderWidth: 1, borderColor: BRAND.borderStrong,
  },
  modalHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  modalSubject:  { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  modalTitle:    { fontSize: 20, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.3 },
  modalClose:    { width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND.surfaceAlt, borderWidth: 1, borderColor: BRAND.border, justifyContent: 'center', alignItems: 'center' },
  modalDetails:  { gap: 16, marginBottom: 24 },
  modalRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  modalRowLabel: { fontSize: 11, fontWeight: '600', color: BRAND.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  modalRowValue: { fontSize: 14, color: BRAND.textPrimary, fontWeight: '500' },
  modalBtn:      { backgroundColor: BRAND.teal, padding: 16, borderRadius: 16, alignItems: 'center' },
  modalBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CalendarScreen;
