// Implements the Socket.IO v4 / Engine.IO v4 wire protocol over native WebSocket.
// This avoids socket.io-client entirely — no Metro bundler compatibility issues.
//
// Protocol cheat-sheet:
//   "0{…}"     EIO OPEN handshake (server → client) → then we send SIO CONNECT
//   "2"        EIO PING  (server → client)  → respond with "3" PONG
//   "40{auth}" EIO MSG + SIO CONNECT with auth token
//   "40{…}"    EIO MSG + SIO CONNECT ack (server → client)
//   "42[…]"   EIO MSG + SIO EVENT           ← events we receive/emit
//   "44{…}"   EIO MSG + SIO CONNECT_ERROR   ← auth rejected

import { AppState, AppStateStatus } from 'react-native';

const SOCKET_URL = 'https://amsa-learning-management-system-production.up.railway.app';

type Listener = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private token = '';
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectAttempt = 0;
  private connected = false; // SIO namespace connected (auth accepted)
  private joinedRooms = new Set<string>(); // re-joined automatically on reconnect
  private appStateSub: { remove: () => void } | null = null;

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.token === token) return;
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectAttempt = 0;
    if (!this.appStateSub) {
      this.appStateSub = AppState.addEventListener('change', this._onAppStateChange);
    }
    this._open();
  }

  private _onAppStateChange = (state: AppStateStatus): void => {
    if (state === 'active') {
      // Resume immediately if the connection died while backgrounded
      if (this.shouldReconnect && this.token && this.ws?.readyState !== WebSocket.OPEN) {
        this._clearReconnectTimer();
        this.reconnectAttempt = 0;
        this._open();
      }
    } else {
      // Don't burn battery reconnecting in the background; the socket itself
      // is left alone — the OS will kill it if it wants to.
      this._clearReconnectTimer();
    }
  };

  private _open(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return;
    const wsBase = SOCKET_URL.replace(/^http/, 'ws');
    try {
      this.ws = new WebSocket(`${wsBase}/socket.io/?EIO=4&transport=websocket`);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.ws.onmessage = ({ data }: { data: string }) => {
      if (!data) return;
      const eioType = data[0];
      if (eioType === '0') {
        // EIO OPEN handshake received — now it's safe to send SIO CONNECT
        this.ws?.send(`40${JSON.stringify({ token: this.token })}`);
        return;
      }
      if (data === '2') { this.ws?.send('3'); return; }   // PING → PONG
      if (eioType !== '4') return;                        // ignore other EIO packets
      const sioType = data[1];
      if (sioType === '0') {
        console.log('[Socket] Connected');
        this.connected = true;
        this.reconnectAttempt = 0;
        // Re-join any rooms we were in before the connection dropped
        this.joinedRooms.forEach(id => this._emit('join', id));
        return;
      }
      if (sioType === '4') {
        console.warn('[Socket] Auth error:', data.slice(2));
        // Bad/expired token — reconnecting with the same token would loop forever
        this.shouldReconnect = false;
        this.ws?.close();
        return;
      }
      if (sioType === '2') {
        try {
          const [event, arg] = JSON.parse(data.slice(2)) as [string, any];
          this.listeners.get(event)?.forEach(cb => {
            try { cb(arg); } catch (err) { console.warn('[Socket] listener error', err); }
          });
        } catch { /* malformed packet */ }
      }
    };

    this.ws.onclose  = () => {
      this.connected = false;
      if (this.shouldReconnect) this._scheduleReconnect();
    };
    this.ws.onerror  = () => { console.warn('[Socket] WebSocket error'); };
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    // Exponential backoff with jitter: ~3s, 6s, 12s, 24s, capped at 30s.
    // Jitter avoids every client stampeding the server after a restart.
    const base = Math.min(3000 * 2 ** this.reconnectAttempt, 30000);
    const delay = base + Math.random() * 1000;
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.token) this._open();
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.token = '';
    this.connected = false;
    this._clearReconnectTimer();
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.joinedRooms.clear();
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }

  private _emit(event: string, arg?: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN || !this.connected) return;
    this.ws.send(`42${JSON.stringify(arg !== undefined ? [event, arg] : [event])}`);
  }

  joinConversation(id: string): void {
    this.joinedRooms.add(id);
    this._emit('join', id);
  }

  leaveConversation(id: string): void {
    this.joinedRooms.delete(id);
    this._emit('leave', id);
  }

  onMessage(cb: Listener): void            { this._on('message:new', cb); }
  onConversationUpdated(cb: Listener): void { this._on('conversation:updated', cb); }

  private _on(event: string, cb: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: string, cb?: Listener): void {
    if (cb) this.listeners.get(event)?.delete(cb);
    else    this.listeners.delete(event);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.connected;
  }
}

export const socketService = new SocketService();
