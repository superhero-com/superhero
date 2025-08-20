import { io, Socket } from 'socket.io-client';
import { CONFIG } from '../config';

export type WebSocketChannelName = 'TokenCreated' | 'TokenUpdated' | 'TokenTransaction' | 'TokenHistory' | string;

type Subscriber = (payload: any) => void;

class WebSocketClient {
  private static instance: WebSocketClient;
  private socket?: Socket;
  private isConnected = false;
  private queue: Array<{ channel: string; cb: Subscriber }>[] = [] as any;
  private subscribers: Record<string, Record<string, Subscriber>> = {};

  connect(url = CONFIG.TRENDMINER_WS_URL || '') {
    if (!url) return;
    if (this.socket) this.disconnect();
    this.socket = io(url, { autoConnect: false, reconnection: false });
    this.socket.on('connect', () => this.onOpen());
    this.socket.on('disconnect', () => this.onClose());
    this.socket.on('connect_error', () => {
      // Stop further attempts on DNS/host errors to avoid console spam
      this.onClose();
      this.disconnect();
    });
    this.socket.on('error', () => {
      this.onClose();
      this.disconnect();
    });
    this.socket.onAny((event, message) => this.onMessage(event as string, message));
    this.socket.connect();
  }

  disconnect() {
    if (!this.socket) return;
    try {
      this.socket.disconnect();
      this.socket.removeAllListeners();
    } catch {}
    this.socket = undefined;
    this.isConnected = false;
  }

  private onOpen() {
    this.isConnected = true;
  }

  private onClose() {
    this.isConnected = false;
  }

  private onMessage(event: string, message: any) {
    // The Vue app namespaces messages like `${Channel}::${sale_address}` for targeted streams
    const fire = (channel: string, payload: any) => {
      const map = this.subscribers[channel];
      if (!map) return;
      Object.values(map).forEach((cb) => cb(payload));
    };
    try {
      // Try both generic and namespaced delivery based on payload
      const payload = message?.payload ?? message;
      if (payload?.sale_address) fire(`${event}::${payload.sale_address}`, payload);
      fire(event, payload);
    } catch {
      fire(event, message);
    }
  }

  subscribe(channel: string, cb: Subscriber) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (!this.subscribers[channel]) this.subscribers[channel] = {};
    this.subscribers[channel][id] = cb;
    return () => {
      delete this.subscribers[channel][id];
      if (Object.keys(this.subscribers[channel]).length === 0) delete this.subscribers[channel];
    };
  }

  static getInstance() {
    if (!WebSocketClient.instance) WebSocketClient.instance = new WebSocketClient();
    return WebSocketClient.instance;
  }
}

export default WebSocketClient.getInstance();


