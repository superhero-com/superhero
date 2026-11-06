export type ShortsQuality = 'auto' | 'high' | 'data-saver';
export type QualityLevel = {
  width: number; height: number; bitrate: number; frameRate?: number; videoCodec?: string;
};
export type QualityChoice = { key: string; index: number; label: string; size: number };
export const qualityModes = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High quality' },
  { value: 'data-saver', label: 'Data Saver' },
] as const;
export const isShortsQuality = (value: unknown): value is ShortsQuality => qualityModes.some((mode) => mode.value === value);

// Hls.js has already filtered these levels for the current MediaSource codecs.
// Use real dimensions, never assume manifest order or a fixed 1080p ladder.
export function qualityChoices(levels: readonly QualityLevel[]): QualityChoice[] {
  const seen = new Set<string>();
  return levels.flatMap((level, index) => {
    const { width, height } = level;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) return [];
    const fps = Number.isFinite(level.frameRate) && level.frameRate! > 0 ? level.frameRate! : 0;
    const key = `level:${width}x${height}:${fps}:${level.videoCodec || ''}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      key,
      index,
      label: `${width} × ${height}${fps ? ` · ${Math.round(fps * 100) / 100} fps` : ''}`,
      size: Math.max(Math.min(width, height), Math.max(width, height) * (9 / 16)),
    }];
  });
}
export function startupQuality(choices: readonly QualityChoice[], mode: ShortsQuality, active = true): number {
  const sorted = [...choices].sort((a, b) => a.size - b.size || a.index - b.index);
  if (mode === 'high' && active) return sorted.at(-1)?.index ?? 0;
  if (mode === 'data-saver') return sorted.filter((choice) => choice.size <= 360).at(-1)?.index ?? sorted[0]?.index ?? 0;
  const target = active ? 720 : 480;
  return sorted.reduce<QualityChoice | undefined>((best, choice) => (
    !best || Math.abs(choice.size - target) < Math.abs(best.size - target) ? choice : best
  ), undefined)?.index ?? 0;
}
export function qualityManifest(manifest: string, mode: ShortsQuality): string {
  const url = new URL(manifest);
  if (mode === 'auto') url.searchParams.delete('quality');
  else url.searchParams.set('quality', mode);
  return url.href;
}
