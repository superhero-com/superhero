import type { ShortsQuality } from './shorts-quality';
import { PresentationFreezes } from './shorts-presentation-freezes';

export const QOE_BUCKETS = [250, 500, 1000, 2000, 5000, 10000, 30000, 600000] as const;
export type QualityFailure = 'none' | 'network' | 'media' | 'session' | 'unsupported';
export type QualitySignal = { type: 'source' } | { type: 'blocked' } | { type: 'generation' } | { type: 'switch'; width: number; height: number; frameRate?: number }
  | { type: 'fatal'; reason: Exclude<QualityFailure, 'none'> };
export type QualitySnapshot = {
  version: 3; id: string; seq: number; mode: ShortsQuality; engine: 'mse' | 'native-hls';
  warm: boolean; origin: 'activation' | 'replacement'; method: 'frame' | 'playing'; elapsedMs: number; playingMs: number; startupMs: number;
  width: number; height: number; stalls: number[]; stallMs: number; switches: number[]; switchMs: number;
  switchCount: number; renditionMs: number[]; fatal: QualityFailure; totalFrames: number; droppedFrames: number;
  freezeMs: number | null; freezes: number[] | null;
};
type Settings = Pick<QualitySnapshot, 'mode' | 'engine' | 'warm' | 'method'> & { origin?: 'activation' | 'replacement' };

/** One bounded, in-memory observation window. No content, wallet or URL fields. */
export class PlaybackQuality {
  private readonly created: number;

  private at: number;

  private eligible = 0;

  private playing = 0;

  private presenting = false;

  private expected: boolean;

  private seeking = false;

  private sourceLoading = false;

  private waitingAt?: number;

  private switchAt?: { at: number; width?: number; height?: number };

  private previousFrames?: { totalVideoFrames: number; droppedVideoFrames: number };

  private state: QualitySnapshot;

  private readonly presentation = new PresentationFreezes();

  constructor(settings: Settings, expected: boolean, private now = () => performance.now(), id = crypto.randomUUID()) {
    this.created = now(); this.at = this.created; this.expected = expected;
    this.state = {
      ...settings,
      origin: settings.origin || 'activation',
      version: 3,
      id,
      seq: 0,
      elapsedMs: 0,
      playingMs: 0,
      startupMs: -1,
      width: 0,
      height: 0,
      stalls: QOE_BUCKETS.map(() => 0),
      stallMs: 0,
      switches: QOE_BUCKETS.map(() => 0),
      switchMs: 0,
      switchCount: 0,
      renditionMs: Array(7).fill(0),
      fatal: 'none',
      totalFrames: 0,
      droppedFrames: 0,
      freezeMs: null,
      freezes: null,
    };
  }

  private clock() {
    const now = Math.min(this.created + 600000, Math.max(this.at, this.now()));
    if (this.expected && !this.seeking) {
      this.eligible += now - this.at;
      if (this.presenting && this.waitingAt === undefined) {
        this.playing += now - this.at;
        const { width, height } = this.state;
        const size = Math.max(Math.min(width, height), Math.max(width, height) * (9 / 16));
        const tier = width ? [192, 361, 481, 721, 1081, 4096].findIndex((limit) => size <= limit) + 1 : 0;
        this.state.renditionMs[tier] += now - this.at;
      }
    }
    this.at = now;
    return now;
  }

  private bucket(field: 'stalls' | 'switches', ms: number) {
    this.state[field][QOE_BUCKETS.findIndex((limit) => ms <= limit)] += 1;
  }

  private endWait(now: number) {
    if (this.waitingAt !== undefined) {
      const ms = now - this.waitingAt;
      if (ms >= 250) { this.state.stallMs += ms; this.bucket('stalls', ms); }
      this.waitingAt = undefined;
    }
  }

  intent(playing: boolean) {
    const now = this.clock();
    if (!playing) {
      this.endWait(now); this.presenting = false; this.switchAt = undefined; this.presentation.reset();
    }
    this.expected = playing;
  }

  wait() {
    const now = this.clock();
    if (this.expected && !this.seeking && this.state.startupMs >= 0 && this.waitingAt === undefined) this.waitingAt = now;
    this.presenting = false;
  }

  seek(seeking: boolean) {
    if (this.sourceLoading) return;
    const now = this.clock(); this.endWait(now); this.seeking = seeking; this.presenting = false;
    this.switchAt = undefined; this.presentation.reset();
  }

  signal(event: QualitySignal) {
    const now = this.clock();
    if (event.type === 'generation') return;
    if (event.type === 'blocked') { this.intent(false); return; }
    if (event.type === 'fatal') {
      if (this.state.fatal === 'none') this.state.fatal = event.reason;
      this.intent(false); return;
    }
    if (event.type === 'source') {
      this.presentation.reset(); this.presentation.frameRate();
      this.sourceLoading = true; this.wait();
      if (this.state.startupMs >= 0 && this.expected) this.switchAt = { at: now };
      return;
    }
    this.presentation.frameRate(event.frameRate);
    if (this.expected && this.state.startupMs >= 0) {
      if (event.width === this.state.width && event.height === this.state.height) this.switchAt = undefined;
      else if (this.switchAt?.width !== event.width || this.switchAt?.height !== event.height) {
        this.switchAt = { at: this.switchAt?.at ?? now, width: event.width, height: event.height };
      }
    }
  }

  frame(
    width: number,
    height: number,
    presentation?: VideoFrameCallbackMetadata,
    playbackRate = 1,
  ) {
    const now = this.clock();
    if (!width || !height || this.seeking) return;
    const changed = this.state.width > 0 && (width !== this.state.width || height !== this.state.height);
    if (changed) {
      this.state.switchCount += 1;
      if (this.switchAt && (this.switchAt.width === undefined
        || (this.switchAt.width === width && this.switchAt.height === height))) {
        const ms = now - this.switchAt.at; this.state.switchMs += ms;
        this.bucket('switches', ms); this.switchAt = undefined;
      }
    } else if (this.switchAt?.width === undefined) this.switchAt = undefined;
    this.state.width = width; this.state.height = height;
    this.sourceLoading = false;
    if (this.expected) {
      if (presentation && this.state.method === 'frame') {
        const gap = this.presentation.observe(presentation, playbackRate);
        if (gap !== undefined) {
          this.state.freezeMs ??= 0; this.state.freezes ??= QOE_BUCKETS.map(() => 0);
          const bounded = Math.min(gap, now - this.created - this.state.freezeMs);
          if (bounded >= 250) {
            this.state.freezeMs += bounded;
            this.state.freezes[QOE_BUCKETS.findIndex((limit) => bounded <= limit)] += 1;
          }
        }
      }
      if (this.state.startupMs < 0) this.state.startupMs = Math.floor(this.eligible);
      this.endWait(now); this.presenting = true;
    }
  }

  frames(value: { totalVideoFrames: number; droppedVideoFrames: number }) {
    if (![value.totalVideoFrames, value.droppedVideoFrames].every((n) => Number.isSafeInteger(n) && n >= 0)) return;
    if (value.droppedVideoFrames > value.totalVideoFrames) return;
    if (this.previousFrames && this.expected && !this.seeking) {
      this.state.totalFrames += value.totalVideoFrames >= this.previousFrames.totalVideoFrames
        ? value.totalVideoFrames - this.previousFrames.totalVideoFrames : value.totalVideoFrames;
      this.state.droppedFrames += value.droppedVideoFrames >= this.previousFrames.droppedVideoFrames
        ? value.droppedVideoFrames - this.previousFrames.droppedVideoFrames : value.droppedVideoFrames;
    }
    this.previousFrames = value;
  }

  snapshot(final = false): QualitySnapshot {
    const now = this.clock();
    if (final) this.endWait(now);
    const pending = this.waitingAt === undefined ? 0 : now - this.waitingAt;
    this.state.seq += 1;
    return {
      ...this.state,
      elapsedMs: Math.floor(now - this.created),
      playingMs: Math.floor(this.playing),
      stallMs: Math.floor(this.state.stallMs + (pending >= 250 ? pending : 0)),
      switchMs: Math.floor(this.state.switchMs),
      stalls: [...this.state.stalls],
      switches: [...this.state.switches],
      renditionMs: this.state.renditionMs.map(Math.floor),
      freezeMs: this.state.freezeMs === null ? null : Math.floor(this.state.freezeMs),
      freezes: this.state.freezes && [...this.state.freezes],
    };
  }
}
