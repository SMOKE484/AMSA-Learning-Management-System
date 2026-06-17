// Implements the Socket.IO v4 / Engine.IO v4 wire protocol over native WebSocket.
// This avoids socket.io-client entirely — no Metro bundler compatibility issues.
//
// Protocol cheat-sheet:
//   "2"        EIO PING  (server → client)  → respond with "3" PONG
//   "40{auth}" EIO MSG + SIO CONNECT with auth token
//   "42[…]"   EIO MSG + SIO EVENT           ← events we receive/emit
//   "44{…}"   EIO MSG + SIO CONNECT_ERROR   ← auth rejected

const SOCKET_URL = 'https://amsa-learning-management-system-production.up.railway.app';

type Listener = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private token = '';
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.token = token;
    this.shouldReconnect = true;
    this._open();
  }

  private _open(): void {
    const wsBase = SOCKET_URL.replace(/^http/, 'ws');
    try {
      this.ws = new WebSocket(`${wsBase}/socket.io/?EIO=4&transport=websocket`);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      // Send SIO CONNECT with JWT auth
      this.ws!.send(`40${JSON.stringify({ token: this.token })}`);
    };

    this.ws.onmessage = ({ data }: { data: string }) => {
      if (!data) return;
      if (data === '2') { this.ws?.send('3'); return; }   // PING → PONG
      if (!data.startsWith('4')) return;                   // ignore non-MSG EIO packets
      const sioType = data[1];
      if (sioType === '0') { console.log('[Socket] Connected'); return; }
      if (sioType === '4') { console.warn('[Socket] Auth error:', data.slice(2)); return; }
      if (sioType === '2') {
        try {
          const [event, arg] = JSON.parse(data.slice(2)) as [string, any];
          this.listeners.get(event)?.forEach(cb => cb(arg));
        } catch { /* malformed packet */ }
      }
    };

    this.ws.onclose  = () => { if (this.shouldReconnect) this._scheduleReconnect(); };
    this.ws.onerror  = () => { console.warn('[Socket] WebSocket error'); };
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.token) this._open();
    }, 3000);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.token = '';
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
  }

  private _emit(event: string, arg?: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(`42${JSON.stringify(arg !== undefined ? [event, arg] : [event])}`);
  }

  joinConversation(id: string): void   { this._emit('join', id); }
  leaveConversation(id: string): void  { this._emit('leave', id); }

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
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
