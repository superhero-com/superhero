// Lightweight event bus for app-wide notifications
// Currently used for trade events to refresh token performance data

type TradeEventPayload = { addresses: string[] };

type Listener<T> = (payload: T) => void;

class EventBus {
  private listeners: Map<string, Set<Listener<any>>> = new Map();

  on<T>(event: string, cb: Listener<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(cb as Listener<any>);
    return () => {
      set.delete(cb as Listener<any>);
      if (set.size === 0) this.listeners.delete(event);
    };
  }

  emit<T>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch {
        // ignore listener errors
      }
    }
  }
}

const bus = new EventBus();

const TRADE_EVENT = 'trade';

export function onTrade(cb: Listener<TradeEventPayload>): () => void {
  return bus.on<TradeEventPayload>(TRADE_EVENT, cb);
}

export function emitTrade(addresses: string[]): void {
  const unique = Array.from(new Set(addresses.filter(Boolean)));
  if (unique.length === 0) return;
  bus.emit<TradeEventPayload>(TRADE_EVENT, { addresses: unique });
}


