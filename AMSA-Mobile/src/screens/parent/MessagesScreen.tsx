// src/screens/parent/MessagesScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { messageService, Conversation, Message } from '../../services/messages';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../components/layout';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textSecondary },

  header:           { backgroundColor: colors.surface, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerAccentRow:  { flexDirection: 'row', height: 3 },
  headerAccentDash: { flex: 1 },
  headerContent:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, gap: 12 },
  backBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4, flex: 1 },
  headerSub:        { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Conversation list
  convItem:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  convAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  convAvatarTx: { color: '#fff', fontWeight: '700', fontSize: 15 },
  convBody:     { flex: 1 },
  convName:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  convPreview:  { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  convMeta:     { alignItems: 'flex-end', gap: 4 },
  convTime:     { fontSize: 11, color: colors.textMuted },
  unreadBadge:  { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadCount:  { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Thread
  threadContainer: { flex: 1 },
  messagesList:    { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  bubbleRow:       { marginBottom: 8 },
  bubbleAdmin:     { alignSelf: 'flex-start', maxWidth: '78%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12 },
  bubbleParent:    { alignSelf: 'flex-end',   maxWidth: '78%', backgroundColor: colors.teal, borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  bubbleText:      { fontSize: 14, lineHeight: 20 },
  bubbleTextAdmin: { color: colors.textPrimary },
  bubbleTextParent:{ color: '#fff' },
  bubbleTime:      { fontSize: 10, marginTop: 4 },
  bubbleTimeAdmin: { color: colors.textMuted },
  bubbleTimeParent:{ color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  composeRow:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input:        { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sendBtnOff:   { backgroundColor: colors.border },

  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIconRing:{ width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 32 },
});

// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ParentMessagesScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const [view, setView]                       = useState<'list' | 'thread'>('list');
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv]       = useState<Conversation | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [loadingList, setLoadingList]         = useState(true);
  const [loadingThread, setLoadingThread]     = useState(false);
  const [refreshing, setRefreshing]           = useState(false);
  const [draft, setDraft]                     = useState('');
  const [sending, setSending]                 = useState(false);

  const listRef = useRef<FlatList>(null);
  const BOTTOM_PAD = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  // ── Load conversations ────────────────────────────────────────────────
  const loadConversations = async () => {
    try {
      const res = await messageService.getConversations();
      setConversations(res.conversations || []);
    } catch (err: any) {
      if (err.response?.status === 401) { logout(); return; }
      // silently allow empty state
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const onRefreshList = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // ── Open thread ──────────────────────────────────────────────────────
  const openThread = async (conv: Conversation) => {
    setSelectedConv(conv);
    setView('thread');
    setLoadingThread(true);
    setMessages([]);
    try {
      const res = await messageService.getMessages(conv._id);
      setMessages(res.messages || []);
      await messageService.markRead(conv._id);
      setConversations(prev =>
        prev.map(c => c._id === conv._id ? { ...c, unreadByParent: 0 } : c)
      );
    } catch {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoadingThread(false);
    }
  };

  // ── Send reply ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !selectedConv || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const res = await messageService.sendMessage(selectedConv._id, text);
      setMessages(prev => [...prev, res.message]);
      setConversations(prev =>
        prev.map(c => c._id === selectedConv._id
          ? { ...c, lastMessage: text.slice(0, 120), lastMessageAt: new Date().toISOString() }
          : c
        )
      );
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send message');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  // ── Initials helper ───────────────────────────────────────────────────
  const initials = (name = '') =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // ════════════════════════════════════════════════════════════════════
  // RENDER — LIST VIEW
  // ════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <View style={s.headerAccentRow}>
            {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
              <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
            ))}
          </View>
          <View style={s.headerContent}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={18} color={BRAND.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Messages</Text>
            </View>
          </View>
        </View>

        {loadingList ? (
          <View style={s.loadingWrap}>
            <BouncingDotsLoader size={20} />
            <Text style={s.loadingText}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item._id}
            contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: BOTTOM_PAD }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshList} tintColor={BRAND.teal} colors={[BRAND.teal]} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconRing}>
                  <Icon name="chatbubble-outline" size={36} color={BRAND.textMuted} />
                </View>
                <Text style={s.emptyTitle}>No messages yet</Text>
                <Text style={s.emptySub}>Messages from your school admin will appear here</Text>
              </View>
            }
            renderItem={({ item }) => {
              const unread = item.unreadByParent || 0;
              return (
                <TouchableOpacity onPress={() => openThread(item)} activeOpacity={0.7} style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                  <GlassCard accentColor={unread ? BRAND.teal : undefined} accentSide="left">
                    <View style={s.convItem}>
                      <View style={s.convAvatar}>
                        <Text style={s.convAvatarTx}>{initials(item.admin?.name)}</Text>
                      </View>
                      <View style={s.convBody}>
                        <Text style={[s.convName, unread > 0 && { color: BRAND.teal }]}>
                          {item.admin?.name || 'School Admin'}
                        </Text>
                        <Text style={s.convPreview} numberOfLines={1}>
                          {item.lastMessage || 'No messages yet'}
                        </Text>
                      </View>
                      <View style={s.convMeta}>
                        <Text style={s.convTime}>{fmt(item.lastMessageAt)}</Text>
                        {unread > 0 && (
                          <View style={s.unreadBadge}>
                            <Text style={s.unreadCount}>{unread > 9 ? '9+' : unread}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDER — THREAD VIEW
  // ════════════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccentRow}>
          {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
            <View key={i} style={[s.headerAccentDash, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => setView('list')}>
            <Icon name="arrow-back" size={18} color={BRAND.textPrimary} />
          </TouchableOpacity>
          <View style={s.convAvatar}>
            <Text style={s.convAvatarTx}>{initials(selectedConv?.admin?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {selectedConv?.admin?.name || 'School Admin'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loadingThread ? (
        <View style={s.loadingWrap}>
          <BouncingDotsLoader size={20} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptySub}>No messages yet — say hello!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.senderRole === 'parent';
            return (
              <View style={[s.bubbleRow, { alignItems: isMe ? 'flex-end' : 'flex-start' }]}>
                <View style={isMe ? s.bubbleParent : s.bubbleAdmin}>
                  <Text style={[s.bubbleText, isMe ? s.bubbleTextParent : s.bubbleTextAdmin]}>
                    {item.content}
                  </Text>
                  <Text style={[s.bubbleTime, isMe ? s.bubbleTimeParent : s.bubbleTimeAdmin]}>
                    {fmt(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Compose */}
      <View style={s.composeRow}>
        <TextInput
          style={s.input}
          placeholder="Type a message…"
          placeholderTextColor={BRAND.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!draft.trim() || sending) && s.sendBtnOff]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Icon name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ParentMessagesScreen;
