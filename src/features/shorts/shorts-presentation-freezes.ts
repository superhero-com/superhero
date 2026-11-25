type Presentation = Pick<VideoFrameCallbackMetadata, 'expectedDisplayTime' | 'mediaTime' | 'presentedFrames'>;

/** Completed presentation gaps, independent of media-clock/rebuffering time. */
export class PresentationFreezes {
  private period?: number;

  private samples: number[] = [];

  private previous?: { time: number; media: number; frames: number; period?: number; rate: number };

  frameRate(fps?: number) {
    this.period = fps && Number.isFinite(fps) && fps >= 1 && fps <= 240 ? 1000 / fps : undefined;
  }

  reset() {
    this.previous = undefined; this.samples = [];
  }

  observe(value: Presentation, rate: number): number | undefined {
    const { expectedDisplayTime: time, mediaTime: media, presentedFrames: frames } = value;
    if (![time, media, rate].every(Number.isFinite) || time < 0 || media < 0 || rate <= 0
      || !Number.isSafeInteger(frames) || frames < 1) {
      this.reset(); return undefined;
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const inferred = sorted.length >= 3 ? sorted[Math.floor(sorted.length / 2)] : undefined;
    const cadence = this.period ?? inferred;
    const period = cadence === undefined ? undefined : cadence / rate;
    const { previous } = this;
    this.previous = {
      time, media, frames, period, rate,
    };
    if (!previous) return undefined;
    const count = frames - previous.frames;
    if (time <= previous.time || media <= previous.media || count <= 0 || previous.rate !== rate) {
      this.samples = []; return undefined;
    }
    const sample = ((media - previous.media) * 1000) / count;
    if (sample >= 1000 / 240 && sample <= 1000) {
      this.samples.push(sample); if (this.samples.length > 8) this.samples.shift();
    }
    if (period === undefined) return undefined;
    // presentedFrames accounts for frames displayed while a busy main thread
    // delayed callbacks. A cadence change gets the larger boundary allowance.
    const gap = time - previous.time - count * Math.max(period, previous.period ?? period);
    return gap >= 250 ? gap : 0;
  }
}
