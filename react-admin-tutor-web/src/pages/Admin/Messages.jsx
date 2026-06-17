import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress,
  List, ListItemButton, ListItemText, ListItemAvatar, Avatar,
  Badge, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, IconButton, Autocomplete,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../services/apiService';
import { useSnackbar } from '../../context/SnackbarContext';

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
};

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export default function Messages() {
  const { showSnackbar } = useSnackbar();

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [draft, setDraft]                 = useState('');

  // New conversation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parents, setParents]       = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [startingConv, setStartingConv]     = useState(false);

  const bottomRef = useRef(null);
  const adminId = JSON.parse(localStorage.getItem('user') || '{}').id;

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await api.get('/messages');
      setConversations(res.data.conversations || []);
    } catch {
      showSnackbar('Failed to load conversations', 'error');
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  // Load messages when a conversation is selected
  const openConversation = async (conv) => {
    setSelected(conv);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await api.get(`/messages/${conv._id}`);
      setMessages(res.data.messages || []);
      await api.patch(`/messages/${conv._id}/read`);
      setConversations(prev =>
        prev.map(c => c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c)
      );
    } catch {
      showSnackbar('Failed to load messages', 'error');
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    try {
      const res = await api.post(`/messages/${selected._id}`, { content: draft.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setDraft('');
      setConversations(prev =>
        prev.map(c => c._id === selected._id
          ? { ...c, lastMessage: draft.trim().slice(0, 120), lastMessageAt: new Date().toISOString() }
          : c
        )
      );
    } catch {
      showSnackbar('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // New conversation dialog
  const openDialog = async () => {
    setDialogOpen(true);
    setSelectedParent(null);
    if (parents.length === 0) {
      try {
        const res = await api.get('/admin/parents');
        setParents(res.data.parents || []);
      } catch {
        showSnackbar('Failed to load parents', 'error');
      }
    }
  };

  const handleStartConversation = async () => {
    if (!selectedParent) return showSnackbar('Please select a parent', 'warning');
    setStartingConv(true);
    try {
      const res = await api.post('/messages', { parentId: selectedParent._id });
      const conv = res.data.conversation;
      setConversations(prev => {
        const exists = prev.find(c => c._id === conv._id);
        return exists ? prev : [conv, ...prev];
      });
      setDialogOpen(false);
      openConversation(conv);
    } catch {
      showSnackbar('Failed to open conversation', 'error');
    } finally {
      setStartingConv(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── LEFT PANEL — conversation list ─────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          width: 300, flexShrink: 0,
          borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Messages</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            fullWidth
            onClick={openDialog}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            New Conversation
          </Button>
        </Box>

        {/* List */}
        {loadingConvs ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" fontSize={14}>
              No conversations yet. Start one with a parent.
            </Typography>
          </Box>
        ) : (
          <List sx={{ overflow: 'auto', flex: 1, p: 1 }}>
            {conversations.map(conv => {
              const parent = conv.parent;
              const isActive = selected?._id === conv._id;
              return (
                <ListItemButton
                  key={conv._id}
                  selected={isActive}
                  onClick={() => openConversation(conv)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conv.unreadByAdmin || 0}
                      color="error"
                      invisible={!conv.unreadByAdmin}
                    >
                      <Avatar sx={{ bgcolor: '#007B8C', width: 40, height: 40, fontSize: 15 }}>
                        {initials(parent?.name)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={conv.unreadByAdmin ? 700 : 500} fontSize={14} noWrap>
                        {parent?.name || 'Parent'}
                      </Typography>
                    }
                    secondary={
                      <Typography fontSize={12} color="text.secondary" noWrap>
                        {conv.lastMessage || 'No messages yet'}&nbsp;·&nbsp;{fmt(conv.lastMessageAt)}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Paper>

      {/* ── RIGHT PANEL — thread ───────────────────────────────────────── */}
      {!selected ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
          <Box sx={{ textAlign: 'center', color: '#94a3b8' }}>
            <Typography fontSize={40}>💬</Typography>
            <Typography fontWeight={600} mt={1}>Select a conversation</Typography>
            <Typography fontSize={13} mt={0.5}>or start a new one with a parent</Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Thread header */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#fff' }}>
            <IconButton size="small" onClick={() => setSelected(null)} sx={{ mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Avatar sx={{ bgcolor: '#007B8C', width: 36, height: 36, fontSize: 14 }}>
              {initials(selected.parent?.name)}
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={15}>{selected.parent?.name}</Typography>
              <Typography fontSize={12} color="text.secondary">{selected.parent?.email}</Typography>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {loadingMsgs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', mt: 6, color: '#94a3b8' }}>
                <Typography fontSize={13}>No messages yet. Say hello!</Typography>
              </Box>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderRole === 'admin';
                return (
                  <Box key={msg._id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <Box
                      sx={{
                        maxWidth: '70%',
                        px: 2, py: 1.2,
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        bgcolor: isMe ? '#007B8C' : '#fff',
                        color: isMe ? '#fff' : '#1e293b',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Typography fontSize={14} lineHeight={1.5}>{msg.content}</Typography>
                      <Typography fontSize={10} sx={{ mt: 0.5, opacity: 0.7, textAlign: 'right' }}>
                        {fmt(msg.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={bottomRef} />
          </Box>

          {/* Compose bar */}
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              sx={{ bgcolor: '#007B8C', color: '#fff', '&:hover': { bgcolor: '#006470' }, '&:disabled': { bgcolor: '#e2e8f0' }, width: 42, height: 42, flexShrink: 0 }}
            >
              {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      )}

      {/* ── NEW CONVERSATION DIALOG ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New Conversation</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Autocomplete
            options={parents}
            value={selectedParent}
            onChange={(_, val) => setSelectedParent(val)}
            getOptionLabel={p => p.name || p.email || ''}
            isOptionEqualToValue={(opt, val) => opt._id === val._id}
            renderInput={params => (
              <TextField
                {...params}
                label="Search parents…"
                size="small"
                autoFocus
                placeholder="Type a name or email"
              />
            )}
            renderOption={(props, p) => (
              <li {...props} key={p._id}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography fontSize={14} fontWeight={600}>{p.name}</Typography>
                  <Typography fontSize={12} color="text.secondary">{p.email}</Typography>
                </Box>
              </li>
            )}
            noOptionsText="No parents found"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartConversation}
            disabled={!selectedParent || startingConv}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {startingConv ? <CircularProgress size={18} color="inherit" /> : 'Open Chat'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
