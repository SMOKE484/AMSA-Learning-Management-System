// src/screens/admin/AdminMessagesScreen.tsx
// Mirrors react-admin-tutor-web's Messages.jsx: conversation list + thread,
// plus starting a new conversation with a parent (admin-only capability).
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { messageService, Conversation, Message } from '../../services/messages';
import { adminService, AdminParent } from '../../services/admin';
import { socketService } from '../../services/socket';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { Icon } from '../../components/Icon';
import { GlassCard } from '../../components/GlassCard';
import { FormModal } from '../../components/FormModal';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';

const fmt = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

const initials = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerBack: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  convItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  convAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  convAvatarTx: { color: '#fff', fontWeight: '700', fontSize: 15 },
  convName: { fontSize: 15, fontWeight: '700' },
  convPreview: { fontSize: 12, marginTop: 2 },
  convTime: { fontSize: 11 },
  unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700' },

  bubbleRow: { marginBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', maxWidth: '78%', borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  bubbleTheirs: { alignSelf: 'flex-start', maxWidth: '78%', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4 },

  composeRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

  parentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
});

const AdminMessagesScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [view, setView] = useState<'list' | 'thread'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newConvVisible, setNewConvVisible] = useState(false);
  const [parents, setParents] = useState<AdminParent[]>([]);

  const listRef = useRef<FlatList>(null);

  const loadConversations = async () => {
    try {
      const res = await messageService.getConversations();
      setConversations(res.conversations || []);
    } catch {
      // allow empty state
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const onRefreshList = async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); };

  useEffect(() => {
    if (view !== 'thread' || !selectedConv) return;
    const convId = selectedConv._id;
    const onNewMessage = (msg: Message) => {
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      if (msg.senderRole !== 'admin') {
        messageService.markRead(convId).catch(() => {});
        setConversations(prev => prev.map(c => c._id === convId ? { ...c, unreadByAdmin: 0 } : c));
      }
    };
    const onConvUpdated = (data: any) => {
      setConversations(prev => prev.map(c => c._id === data.conversationId
        ? { ...c, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt, unreadByAdmin: data.unreadByAdmin }
        : c));
    };
    socketService.joinConversation(convId);
    socketService.onMessage(onNewMessage);
    socketService.onConversationUpdated(onConvUpdated);
    return () => {
      socketService.leaveConversation(convId);
      socketService.off('message:new', onNewMessage);
      socketService.off('conversation:updated', onConvUpdated);
    };
  }, [view, selectedConv?._id]);

  const openThread = async (conv: Conversation) => {
    setSelectedConv(conv);
    setView('thread');
    setLoadingThread(true);
    setMessages([]);
    try {
      const res = await messageService.getMessages(conv._id);
      setMessages(res.messages || []);
      await messageService.markRead(conv._id);
      setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c));
    } catch {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoadingThread(false);
    }
  };

  const closeThread = () => { setView('list'); setSelectedConv(null); };

  const handleSend = async () => {
    if (!draft.trim() || !selectedConv || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const res = await messageService.sendMessage(selectedConv._id, text);
      setMessages(prev => prev.some(m => m._id === res.message._id) ? prev : [...prev, res.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send message');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const openNewConversation = async () => {
    setNewConvVisible(true);
    try {
      const res = await adminService.getParents();
      setParents(res.parents || []);
    } catch {
      Alert.alert('Error', 'Could not load parents');
    }
  };

  const startConversation = async (parent: AdminParent) => {
    try {
      const res = await messageService.createOrGetConversation(parent._id);
      setNewConvVisible(false);
      await loadConversations();
      openThread(res.conversation);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start conversation');
    }
  };

  if (view === 'list') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={[s.title, { color: colors.textPrimary }]}>Messages</Text>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.blue }]} onPress={openNewConversation}>
            <Icon name="add-circle-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {loadingList ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><BouncingDotsLoader size={20} /></View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshList} tintColor={colors.blue} colors={[colors.blue]} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Icon name="chatbubble-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>No conversations yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              const unread = item.unreadByAdmin || 0;
              return (
                <TouchableOpacity onPress={() => openThread(item)} style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                  <GlassCard accentColor={unread ? colors.blue : undefined}>
                    <View style={s.convItem}>
                      <View style={[s.convAvatar, { backgroundColor: colors.blue }]}>
                        <Text style={s.convAvatarTx}>{initials(item.parent?.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.convName, { color: unread ? colors.blue : colors.textPrimary }]}>{item.parent?.name || 'Parent'}</Text>
                        <Text style={[s.convPreview, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[s.convTime, { color: colors.textMuted }]}>{fmt(item.lastMessageAt)}</Text>
                        {unread > 0 && (
                          <View style={[s.unreadBadge, { backgroundColor: colors.red }]}><Text style={s.unreadCount}>{unread > 9 ? '9+' : unread}</Text></View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <FormModal visible={newConvVisible} title="New Conversation" onClose={() => setNewConvVisible(false)} onSave={() => setNewConvVisible(false)} saveLabel="Close">
          {parents.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No parents found</Text>
          ) : (
            parents.map(p => (
              <TouchableOpacity key={p._id} style={[s.parentRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]} onPress={() => startConversation(p)}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{p.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{p.email}</Text>
              </TouchableOpacity>
            ))
          )}
        </FormModal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <View style={s.headerBack}>
          <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={closeThread}>
            <Icon name="arrow-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[s.convAvatar, { backgroundColor: colors.blue }]}>
            <Text style={s.convAvatarTx}>{initials(selectedConv?.parent?.name)}</Text>
          </View>
          <Text style={[s.title, { color: colors.textPrimary, fontSize: 18 }]} numberOfLines={1}>{selectedConv?.parent?.name || 'Parent'}</Text>
        </View>
      </View>

      {loadingThread ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><BouncingDotsLoader size={20} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: colors.textMuted }}>No messages yet — say hello!</Text></View>}
          renderItem={({ item }) => {
            const isMe = item.senderRole === 'admin';
            return (
              <View style={[s.bubbleRow, { alignItems: isMe ? 'flex-end' : 'flex-start' }]}>
                <View style={isMe ? [s.bubbleMine, { backgroundColor: colors.blue }] : [s.bubbleTheirs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[s.bubbleText, { color: isMe ? '#fff' : colors.textPrimary }]}>{item.content}</Text>
                  <Text style={[s.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{fmt(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[s.composeRow, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[s.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="Type a message…" placeholderTextColor={colors.textMuted}
          value={draft} onChangeText={setDraft} multiline
        />
        <TouchableOpacity style={[s.sendBtn, { backgroundColor: (!draft.trim() || sending) ? colors.border : colors.blue }]} onPress={handleSend} disabled={!draft.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AdminMessagesScreen;
