import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api$/, '');

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    this.socket.on('connect', () => console.log('[Socket] Connected'));
    this.socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    this.socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId) {
    this.socket?.emit('join', conversationId);
  }

  leaveConversation(conversationId) {
    this.socket?.emit('leave', conversationId);
  }

  onMessage(cb) {
    this.socket?.on('message:new', cb);
  }

  onConversationUpdated(cb) {
    this.socket?.on('conversation:updated', cb);
  }

  off(event, cb) {
    if (cb) this.socket?.off(event, cb);
    else this.socket?.off(event);
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
