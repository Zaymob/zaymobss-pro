/**
 * Realtime Event Streaming Client for Yunø
 * Handles persistent Server-Sent Events (SSE) connection, auto-reconnection,
 * channel subscriptions, WebRTC signaling dispatching, and dev logging.
 */

export interface RealtimeMessageEvent {
  type: string;
  channelId?: string;
  targetUser?: string;
  from?: string;
  data: any;
  timestamp: number;
}

export type RealtimeEventHandler = (event: RealtimeMessageEvent) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private username: string = '';
  private currentChannel: string = 'general';
  private currentCallRoom: string = '';
  private tabId: string = '';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();

    constructor() {
    try {
      let tid = sessionStorage.getItem('yuno_realtime_tab_id');
      if (!tid) {
        tid = `tab_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('yuno_realtime_tab_id', tid);
      }
      this.tabId = tid;
    } catch {
      this.tabId = `tab_${Math.random().toString(36).substring(2, 9)}`;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.isConnected) {
          this.connect();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
          this.connect();
        }
      });
    }
  }

  public init(username: string, initialChannel: string = 'general') {
    this.username = username || 'Guest';
    this.currentChannel = initialChannel;
    this.connect();
  }

  public updateProfile(username: string) {
    if (this.username !== username) {
      this.username = username || 'Guest';
      this.reconnect();
    }
  }

  public setUsername(username: string) {
    this.updateProfile(username);
  }

  public getUsername() {
    return this.username;
  }

  public setChannel(channelId: string) {
    this.currentChannel = channelId;
    if (this.isConnected && this.eventSource) {
      fetch('/api/realtime/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: this.tabId,
          channelId: this.currentChannel,
          callRoomId: this.currentCallRoom,
        }),
      }).catch(() => {});
    }
  }

  public setCallRoom(callRoomId: string) {
    this.currentCallRoom = callRoomId;
    if (this.isConnected && this.eventSource) {
      fetch('/api/realtime/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: this.tabId,
          channelId: this.currentChannel,
          callRoomId: this.currentCallRoom,
        }),
      }).catch(() => {});
    }
  }

  public connect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const params = new URLSearchParams({
      username: this.username || 'Guest',
      tabId: this.tabId,
      channelId: this.currentChannel || 'general',
      callRoomId: this.currentCallRoom || '',
      _t: String(Date.now()),
      _r: Math.random().toString(36).substring(2, 9),
    });

    const sseUrl = `/api/realtime/stream?${params.toString()}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log(`%c[REALTIME_CONNECTED] Connected to SSE Stream as @${this.username} (${this.tabId})`, 'color: #10b981; font-weight: bold;');
        this.emit('connection_change', { isConnected: true });
      };

      // General message receiver
      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(':')) return;
          const parsed = JSON.parse(e.data);
          this.handleIncomingEvent(parsed);
        } catch (err) {
          console.warn('[REALTIME] Failed to parse message event:', err);
        }
      };

      // Specific named event types
      const registeredEvents = [
        'CHAT_MESSAGE',
        'DM_MESSAGE',
        'DM_NOTIFICATION',
        'MESSAGE_REACTION',
        'MESSAGE_DELETE',
        'WEBRTC_SIGNAL',
        'CALL_INVITE',
        'CALL_RESPONSE',
        'CALL_PRESENCE',
        'USER_PRESENCE',
        'FRIEND_REQUEST',
        'FRIEND_UPDATE',
      ];

      registeredEvents.forEach((evtName) => {
        this.eventSource?.addEventListener(evtName, (e: MessageEvent) => {
          try {
            if (!e.data) return;
            const parsed = JSON.parse(e.data);
            this.handleIncomingEvent({ type: evtName, ...parsed });
          } catch (err) {
            console.warn(`[REALTIME] Failed to parse ${evtName}:`, err);
          }
        });
      });

      this.eventSource.onerror = (err) => {
        if (this.isConnected) {
          console.log('%c[REALTIME_DISCONNECTED] SSE Connection lost, attempting reconnect...', 'color: #f59e0b; font-weight: bold;');
          this.isConnected = false;
          this.emit('connection_change', { isConnected: false });
        }
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.scheduleReconnect();
      };
    } catch (e) {
      console.warn('[REALTIME] Failed to create EventSource:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public reconnect() {
    this.connect();
  }

  private handleIncomingEvent(event: RealtimeMessageEvent) {
    if (!event || !event.type) return;

    // Development Console Logging
    switch (event.type) {
      case 'CHAT_MESSAGE':
        console.log('%c[CHAT_RECEIVED]', 'color: #3b82f6; font-weight: bold;', event.data);
        break;
      case 'DM_MESSAGE':
        console.log('%c[DM_RECEIVED]', 'color: #8b5cf6; font-weight: bold;', event.data);
        break;
      case 'DM_NOTIFICATION':
        console.log('%c[DM_NOTIFICATION]', 'color: #ec4899; font-weight: bold;', event.data);
        break;
      case 'WEBRTC_SIGNAL':
        console.log('%c[SIGNAL_RECEIVED]', 'color: #06b6d4; font-weight: bold;', event.data?.type, event.data);
        break;
      case 'CALL_INVITE':
        console.log('%c[CALL_INVITE]', 'color: #10b981; font-weight: bold;', event.data);
        break;
      case 'CALL_PRESENCE':
        console.log('%c[CALL_PRESENCE]', 'color: #eab308; font-weight: bold;', event.data);
        break;
    }

    // Trigger local listeners
    this.emit(event.type, event);
    this.emit('*', event);

    // Also dispatch a browser DOM event for global decoupling
    try {
      window.dispatchEvent(
        new CustomEvent(`yuno:realtime:${event.type.toLowerCase()}`, {
          detail: event,
        })
      );
    } catch (e) {}
  }

  public on(event: string, handler: RealtimeEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: string, handler: RealtimeEventHandler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error('[REALTIME] Listener error:', e);
        }
      });
    }
  }

  public getTabId() {
    return this.tabId;
  }

  public getIsConnected() {
    return this.isConnected;
  }
}

export const realtime = new RealtimeClient();
