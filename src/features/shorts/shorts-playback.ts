import { ShortsApiError } from './api';

export interface PlaybackPayload { id: string; session: string; seconds: number; source: string }
export interface PlaybackResult { accepted: boolean; views: number; engagement: { score: number } }
type Pending = { shortId: string; payload: PlaybackPayload; sent: number; attempts: number; timer?: ReturnType<typeof setTimeout>; running: boolean; stopped: boolean };

// Serial delivery per browser/Short/day; failures retry the same event without adding a view.
export class PlaybackDelivery {
  private events = new Map<string, Pending>();

  private disposed = false;

  constructor(
    private send: (shortId: string, payload: PlaybackPayload) => Promise<PlaybackResult>,
    private confirmed: (shortId: string, result: PlaybackResult) => void,
  ) {}

  enqueue(shortId: string, payload: PlaybackPayload) {
    if (this.disposed) return;
    let entry = this.events.get(payload.id);
    if (!entry) {
      entry = {
        shortId, payload, sent: -1, attempts: 0, running: false, stopped: false,
      };
      this.events.set(payload.id, entry);
    } else entry.payload = { ...entry.payload, seconds: Math.max(entry.payload.seconds, payload.seconds) };
    if (!entry.running && !entry.timer && !entry.stopped && entry.sent < entry.payload.seconds) this.flush(entry.payload.id);
  }

  private async flush(id: string) {
    const entry = this.events.get(id);
    if (this.disposed || !entry || entry.stopped) return;
    entry.running = true;
    // Establish the server clock even when the first available update is a final flush.
    const seconds = entry.sent < 0 ? 0 : entry.payload.seconds;
    try {
      const result = await this.send(entry.shortId, { ...entry.payload, seconds });
      if (this.disposed) return;
      this.confirmed(entry.shortId, result);
      entry.sent = seconds;
      entry.attempts = 0;
      entry.stopped = !result.accepted;
    } catch (error) {
      if (this.disposed) return;
      entry.attempts += 1;
      if ((error instanceof ShortsApiError && error.status < 500 && error.status !== 429) || entry.attempts >= 5) entry.stopped = true;
      else entry.timer = setTimeout(() => { entry.timer = undefined; this.flush(entry.payload.id); }, Math.min(8000, 500 * 2 ** (entry.attempts - 1)));
    } finally {
      entry.running = false;
    }
    if (!this.disposed && !entry.stopped && !entry.timer && entry.sent < entry.payload.seconds) this.flush(entry.payload.id);
  }

  retry() {
    if (this.disposed) return;
    this.events.forEach((entry) => {
      if (entry.attempts >= 5) { Object.assign(entry, { stopped: false, attempts: 0 }); }
      if (!entry.running && !entry.timer && !entry.stopped && entry.sent < entry.payload.seconds) this.flush(entry.payload.id);
    });
  }

  flushPending() {
    if (this.disposed) return;
    // On page exit, hand the latest progress directly to keepalive fetch even if a heartbeat is in flight.
    this.events.forEach((entry) => {
      if (entry.sent >= 0 && !entry.stopped && entry.payload.seconds > entry.sent) {
        this.send(entry.shortId, { ...entry.payload }).then((result) => {
          if (!this.disposed) this.confirmed(entry.shortId, result);
        }).catch(() => undefined);
      }
    });
  }

  dispose() {
    this.disposed = true;
    this.events.forEach((entry) => { if (entry.timer) clearTimeout(entry.timer); });
    this.events.clear();
  }
}
