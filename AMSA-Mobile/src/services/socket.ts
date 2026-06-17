import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://amsa-learning-management-system-production.up.railway.app';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('join', conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave', conversationId);
  }

  onMessage(cb: (message: any) => void): void {
    this.socket?.on('message:new', cb);
  }

  onConversationUpdated(cb: (data: any) => void): void {
    this.socket?.on('conversation:updated', cb);
  }

  off(event: string, cb?: (...args: any[]) => void): void {
    if (cb) this.socket?.off(event, cb);
    else this.socket?.off(event);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
