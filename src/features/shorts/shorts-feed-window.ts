import type { Short } from './types';
import { ShortsApiError } from './api';

export interface FeedPage { items: Short[]; next: string | null; revision?: string }
export interface FeedSnapshot {
  items: Short[]; next: string | null; ready: boolean; loading: boolean; error: string;
}
interface FeedIO {
  revisioned?: boolean;
  page(cursor: string | undefined, signal: AbortSignal): Promise<FeedPage>;
  state(ids: string[], signal: AbortSignal): Promise<{ items: Short[]; revision?: string }>;
  changed(snapshot: FeedSnapshot): void;
}

const WINDOW_SIZE = 60;
const PAGE_SIZE = 20;

/** One scope, one request at a time, with bounded metadata and automatic look-ahead. */
export class ShortsFeedWindow {
  private items: Short[] = [];

  private next: string | null = null;

  private ready = false;

  private revision?: string;

  private error = '';

  private active = '';

  private automaticPages = 0;

  private pending?: Promise<void>;

  private controller = new AbortController();

  constructor(private io: FeedIO) {}

  get stopped() { return this.controller.signal.aborted; }

  private emit(loading: boolean) {
    if (!this.stopped) {
      this.io.changed({
        items: this.items, next: this.next, ready: this.ready, loading, error: this.error,
      });
    }
  }

  private static checked(items: Short[], requested?: Set<string>) {
    if (!Array.isArray(items) || items.length > PAGE_SIZE
      || items.some((item) => !item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || (requested && !requested.has(item.id)))
      || new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Invalid feed response');
    return items;
  }

  private run(work: () => Promise<void>) {
    if (this.stopped) return Promise.resolve();
    if (this.pending) return this.pending;
    this.error = '';
    this.emit(true);
    this.pending = Promise.resolve().then(work).catch(() => {
      if (!this.stopped) this.error = 'Shorts couldn’t be updated. Please try again.';
    }).finally(() => { this.pending = undefined; this.emit(false); });
    return this.pending;
  }

  /** Retry temporary read admission only. Never replay a write or a policy denial. */
  private async read<T>(work: () => Promise<T>): Promise<T> {
    const { signal } = this.controller;
    for (let attempt = 0; ; attempt += 1) {
      signal.throwIfAborted();
      try {
        // eslint-disable-next-line no-await-in-loop -- Retry this read only after bounded backoff.
        return await work();
      } catch (error) {
        if (attempt >= 2 || !(error instanceof ShortsApiError) || error.status !== 503) throw error;
        // eslint-disable-next-line no-await-in-loop -- One cancellable backoff per read.
        await new Promise<void>((resolve, reject) => {
          let timer: ReturnType<typeof setTimeout>;
          const abort = () => { clearTimeout(timer); reject(signal.reason); };
          timer = setTimeout(() => {
            signal.removeEventListener('abort', abort); resolve();
          }, (attempt + 1) * 1000);
          if (signal.aborted) abort();
          else signal.addEventListener('abort', abort, { once: true });
        });
      }
    }
  }

  private async readPage(cursor?: string, reset = false) {
    const page = await this.read(() => this.io.page(cursor, this.controller.signal));
    if (this.stopped) return;
    const items = ShortsFeedWindow.checked(page.items);
    if (this.io.revisioned && (!/^[a-f0-9]{64}$/.test(page.revision || '')
      || (!reset && this.ready && page.revision !== this.revision))) throw new Error('Invalid feed revision');
    if (page.next !== null && (typeof page.next !== 'string' || !page.next || page.next.length > 512 || page.next === cursor)) throw new Error('Invalid feed continuation');
    const merged = reset ? items : [...this.items.filter((s) => !items.some((item) => item.id === s.id)), ...items];
    const active = merged.find((item) => item.id === this.active);
    const window = merged.slice(-WINDOW_SIZE);
    // Retaining the current ID preserves the mounted player when older metadata expires.
    if (active && !window.some((item) => item.id === active.id)) {
      window.shift(); window.unshift(active);
    }
    this.items = window;
    this.next = page.next;
    this.ready = true;
    this.revision = page.revision;
  }

  refresh() {
    return this.run(async () => {
      if (!this.ready) { await this.readPage(undefined, true); return; }
      const updated: Short[] = [];
      for (let i = 0; i < Math.max(this.items.length, this.io.revisioned ? 1 : 0); i += PAGE_SIZE) {
        const ids = this.items.slice(i, i + PAGE_SIZE).map((s) => s.id);
        // eslint-disable-next-line no-await-in-loop -- Bound upstream concurrency to one batch per feed window.
        const result = await this.read(() => this.io.state(ids, this.controller.signal));
        if (this.stopped) return;
        if (this.io.revisioned) {
          if (!/^[a-f0-9]{64}$/.test(result.revision || '')) throw new Error('Invalid feed revision');
          if (result.revision !== this.revision) {
            // A missed social update must also recover when this window is empty.
            // eslint-disable-next-line no-await-in-loop -- Replace the changed selection once, then stop.
            await this.readPage(undefined, true);
            return;
          }
        }
        updated.push(...ShortsFeedWindow.checked(result.items, new Set(ids)));
      }
      // Commit only after all batches succeed. A failure keeps the current view recoverable.
      const fresh = new Map(updated.map((s) => [s.id, s]));
      this.items = this.items.flatMap((s) => (fresh.has(s.id) ? [fresh.get(s.id)!] : []));
    });
  }

  more(automatic = false) {
    if (!this.ready || !this.next || this.pending || this.stopped) return this.pending || Promise.resolve();
    if (automatic && (this.error || this.automaticPages >= 3)) return Promise.resolve();
    if (automatic) this.automaticPages += 1; else this.automaticPages = 0;
    return this.run(() => this.readPage(this.next!));
  }

  focus(id: string) {
    if (id !== this.active) { this.active = id; this.automaticPages = 0; }
  }

  restart() {
    if (this.pending) return this.pending;
    this.automaticPages = 0;
    this.active = '';
    return this.run(() => this.readPage(undefined, true));
  }

  stop() { this.controller.abort(); }
}
