// Count unique played intervals. Replaying a fragment cannot complete the whole Short.
export class PlaybackProgress {
  private ranges: [number, number][] = [];

  private position = 0;

  private at = 0;

  constructor(private duration: number) {}

  resetPosition(position: number, now = performance.now()) {
    this.position = position;
    this.at = now;
  }

  sample(position: number, playing: boolean, now = performance.now()) {
    const start = this.position;
    const delta = position - start;
    const elapsed = Math.max(0, (now - this.at) / 1000);
    this.resetPosition(position, now);
    if (playing && delta > 0 && delta <= Math.min(2, elapsed + 0.15)) {
      const ranges = [...this.ranges, [Math.max(0, start), Math.min(this.duration, position)] as [number, number]]
        .sort((a, b) => a[0] - b[0]);
      this.ranges = [];
      ranges.forEach(([from, to]) => {
        const last = this.ranges[this.ranges.length - 1];
        if (last && from <= last[1]) last[1] = Math.max(last[1], to);
        else if (to > from) this.ranges.push([from, to]);
      });
    }
    return this.seconds;
  }

  get seconds() { return this.ranges.reduce((total, [from, to]) => total + to - from, 0); }
}
