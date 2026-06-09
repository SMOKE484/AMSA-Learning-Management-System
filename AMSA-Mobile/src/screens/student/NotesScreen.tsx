// src/screens/student/NotesScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { studentService, Note } from '../../services/student';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette, BRAND } from '../../components/theme';
import { Icon } from '../../components/Icon';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';
import { GlassCard } from '../../components/GlassCard';

// Accent colors are identical in both themes — safe as module-level constants
const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics':          BRAND.blue,
  'Physics':              '#8b5cf6',
  'Chemistry':            '#ec4899',
  'Biology':              BRAND.teal,
  'English':              BRAND.yellow,
  'Geography':            '#06b6d4',
  'Natural Sciences':     BRAND.teal,
  'Mathematical Literacy':BRAND.blue,
  'Physical Sciences':    '#ec4899',
  'Business Studies':     '#8b5cf6',
  'Agricultural Sciences':'#84cc16',
  'Life Sciences':        BRAND.red,
  'Accounting':           '#06b6d4',
};
const SUBJECT_ICONS: Record<string, string> = {
  'Mathematics':          'calculator',
  'Physics':              'rocket',
  'Chemistry':            'flask',
  'Biology':              'leaf',
  'English':              'book',
  'Geography':            'map',
  'Natural Sciences':     'leaf',
  'Mathematical Literacy':'calculator',
  'Physical Sciences':    'flask',
  'Business Studies':     'business',
  'Agricultural Sciences':'leaf',
  'Life Sciences':        'heart',
  'Accounting':           'calculator',
};
const getColor = (s: string) => SUBJECT_COLORS[s] || BRAND.blue;
const getIcon  = (s: string) => SUBJECT_ICONS[s]  || 'document-text';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  loadingWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText:{ marginTop: 12, fontSize: 15, color: colors.textSecondary },

  header:           { backgroundColor: colors.surface, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56 },
  title:            { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle:         { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  headerIconCluster:{ flexDirection: 'row', alignItems: 'center' },

  searchOuter: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  searchCard:  { borderRadius: 16 },
  searchRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  filterScroll:  { maxHeight: 52, marginTop: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipText:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  noteCard:    { marginBottom: 12 },
  noteInner:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconWrap:    { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
  noteBody:    { flex: 1, gap: 4 },
  noteTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.2 },
  noteTagRow:  { flexDirection: 'row' },
  subjectTag:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  subjectTagText:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  noteDesc:    { fontSize: 12, color: colors.textSecondary },
  noteMeta:    { fontSize: 11, color: colors.textMuted },
  dlBtn:       { width: 40, height: 40, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing:{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const StudentNotesScreen = () => {
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [notes,          setNotes]          = useState<Note[]>([]);
  const [filteredNotes,  setFilteredNotes]  = useState<Note[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [downloadingId,  setDownloadingId]  = useState<string | null>(null);
  const { logout } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const loadNotes = async () => {
    try {
      const res = await studentService.getNotes();
      setNotes(res.notes || []);
      setFilteredNotes(res.notes || []);
    } catch (err: any) {
      if (err.response?.status === 401) { Alert.alert('Session Expired', 'Please login again'); logout(); }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadNotes(); }, []);

  useEffect(() => {
    let f = notes;
    if (searchQuery)
      f = f.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    if (selectedFilter !== 'All') f = f.filter(n => n.subject === selectedFilter);
    setFilteredNotes(f);
  }, [searchQuery, selectedFilter, notes]);

  const handleOpenNote = async (note: Note) => {
    if (!note.fileUrl) { Alert.alert('No File', 'No file attached'); return; }
    try {
      await WebBrowser.openBrowserAsync(note.fileUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: colors.red,
        toolbarColor: colors.surface,
      });
    } catch { Alert.alert('Error', 'Failed to open note viewer'); }
  };

  const handleDownload = async (note: Note) => {
    if (!note.fileUrl) return;
    setDownloadingId(note._id);
    try {
      const fileName = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const fileUri  = FileSystem.cacheDirectory + fileName;
      const dl       = await FileSystem.downloadAsync(note.fileUrl, fileUri);
      const info     = await FileSystem.getInfoAsync(dl.uri);
      if (!info.exists) throw new Error('Download failed');
      if (!(await Sharing.isAvailableAsync())) { Alert.alert('Error', 'Sharing unavailable'); return; }
      await Sharing.shareAsync(dl.uri, { mimeType: 'application/pdf', dialogTitle: `Save ${fileName}`, UTI: 'com.adobe.pdf' });
    } catch { Alert.alert('Download Failed', 'Could not save the file. Check your connection.'); }
    finally { setDownloadingId(null); }
  };

  const uniqueSubjects = ['All', ...Array.from(new Set(notes.map(n => n.subject)))];
  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  if (loading) return (
    <View style={s.loadingWrap}>
      <BouncingDotsLoader size={20} />
      <Text style={s.loadingText}>Loading notes…</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[colors.red, colors.yellow, colors.teal, colors.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <View>
            <Text style={s.title}>My Notes</Text>
            <Text style={s.subtitle}>{notes.length} document{notes.length !== 1 ? 's' : ''} available</Text>
          </View>
          <View style={s.headerIconCluster}>
            {[colors.red, colors.yellow, colors.teal].map((c, i) => (
              <Icon key={i} name="chevron-forward" size={18} color={c}
                style={{ marginLeft: i === 0 ? 0 : -8, opacity: 1 - i * 0.25 }} />
            ))}
          </View>
        </View>
      </View>

      {/* ── SEARCH ─────────────────────────────────────────────────────── */}
      <View style={s.searchOuter}>
        <GlassCard style={s.searchCard}>
          <View style={s.searchRow}>
            <Icon name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by title or subject…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>
      </View>

      {/* ── FILTER CHIPS ───────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
        {uniqueSubjects.map(f => {
          const active = selectedFilter === f;
          const color  = f === 'All' ? colors.red : getColor(f);
          return (
            <TouchableOpacity
              key={f}
              style={[s.chip, active ? { backgroundColor: color, borderColor: color } : { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedFilter(f)}
            >
              {f !== 'All' && !active && (
                <View style={[s.chipDot, { backgroundColor: color }]} />
              )}
              <Text style={[s.chipText, active && { color: '#fff' }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── NOTES LIST ─────────────────────────────────────────────────── */}
      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.listContent, { paddingBottom: BOTTOM_PAD }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadNotes(); setRefreshing(false); }}
            tintColor={colors.red} colors={[colors.red]}
          />
        }
      >
        {filteredNotes.length > 0 ? filteredNotes.map(note => {
          const color = getColor(note.subject);
          return (
            <TouchableOpacity key={note._id} activeOpacity={0.8} onPress={() => handleOpenNote(note)}>
              <GlassCard accentColor={color} style={s.noteCard}>
                <View style={s.noteInner}>
                  <View style={[s.iconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                    <Icon name={getIcon(note.subject) as any} size={24} color={color} />
                  </View>
                  <View style={s.noteBody}>
                    <Text style={s.noteTitle} numberOfLines={1}>{note.title}</Text>
                    <View style={s.noteTagRow}>
                      <View style={[s.subjectTag, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                        <Text style={[s.subjectTagText, { color }]}>{note.subject}</Text>
                      </View>
                    </View>
                    {note.description ? <Text style={s.noteDesc} numberOfLines={1}>{note.description}</Text> : null}
                    <Text style={s.noteMeta}>
                      {new Date(note.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {note.tutor?.user?.name ? `  ·  ${note.tutor.user.name}` : ''}
                    </Text>
                  </View>
                  {note.fileUrl && (
                    <TouchableOpacity
                      style={[s.dlBtn, { backgroundColor: colors.blue + '22', borderColor: colors.blue + '55' }]}
                      onPress={() => handleDownload(note)}
                      disabled={downloadingId === note._id}
                    >
                      {downloadingId === note._id
                        ? <ActivityIndicator size="small" color={colors.blue} />
                        : <Icon name="cloud-download-outline" size={20} color={colors.blue} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        }) : (
          <View style={s.empty}>
            <View style={[s.emptyIconRing, { borderColor: colors.border }]}>
              <Icon name="document-text-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={s.emptyTitle}>
              {notes.length === 0 ? 'No notes available yet' : 'No notes match your search'}
            </Text>
            <Text style={s.emptySub}>
              {notes.length === 0 ? 'Check back later for new materials' : 'Try changing your filters'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StudentNotesScreen;
