import Hls, { type Fragment, type HlsListeners, type LevelDetails } from 'hls.js';

/** Complete an appended AAC padding tail that HLS cannot match to the media buffer. */
export function completeShortsHlsEos(hls: Hls, media: HTMLVideoElement, active: () => boolean) {
  let generation = 0;
  let disposed = false;
  let sourceReady = false;
  let main: Fragment | undefined;
  let audio: Fragment | undefined;
  let videoEnded = false;
  let audioEnded = false;
  let videoBuffer: SourceBuffer | undefined;
  let audioBuffer: SourceBuffer | undefined;
  const flushing = new Set<string>();
  const remove: (() => void)[] = [];
  const listen = <E extends keyof HlsListeners>(event: E, handler: HlsListeners[E]) => {
    hls.on(event, handler);
    remove.push(() => hls.off(event, handler));
  };
  const final = (frag: Fragment | undefined, details: LevelDetails | null | undefined) => (
    !!frag && typeof frag.sn === 'number' && frag.endList && details?.live === false
    && details.fragments?.at(-1) === frag
  );
  const currentMain = (frag: Fragment | undefined) => (
    sourceReady && frag?.level === hls.loadLevel && final(frag, hls.latestLevelDetails)
  );
  const currentAudio = (frag: Fragment | undefined) => (
    sourceReady && final(frag, hls.audioTracks[hls.audioTrack]?.details)
  );
  const coversEnd = (ranges: TimeRanges) => {
    const last = ranges.length - 1;
    return last >= 0 && ranges.start(last) <= media.currentTime
      && ranges.end(last) >= media.duration - 0.001;
  };
  const check = () => {
    const expected = generation;
    // FRAG_BUFFERED runs inside HLS's append-queue barrier. Let that callback
    // finish before asking its buffer controller to perform queue-aware EOS.
    queueMicrotask(() => {
      const { duration } = media;
      if (disposed || expected !== generation || !active() || document.hidden
        || media.paused || media.seeking || media.error || media.ended
        || !Number.isFinite(duration) || duration <= 0 || media.currentTime <= 0
        || media.currentTime >= duration || !videoEnded || audioEnded
        || !currentMain(main) || !currentAudio(audio)
        || !videoBuffer || !audioBuffer || videoBuffer.updating || audioBuffer.updating
        || flushing.size
        || !coversEnd(media.buffered) || !coversEnd(videoBuffer.buffered)
        || !coversEnd(audioBuffer.buffered)) return;
      // Only the observed padding case: the actual final audio fragment was
      // appended, but its parsed samples lie just beyond the finite VOD buffer.
      // Never infer completion from a missing, partial or ordinary audio tail.
      if (!Number.isFinite(audio.startPTS) || !Number.isFinite(audio.endPTS)
        || audio.startPTS! < duration || audio.endPTS! <= audio.startPTS!
        || audio.endPTS! > duration + 0.1) return;
      hls.trigger(Hls.Events.BUFFER_EOS, { type: 'audio' });
    });
  };
  const reset = () => {
    generation += 1;
    main = undefined; audio = undefined; videoEnded = false; audioEnded = false;
    flushing.clear();
  };
  listen(Hls.Events.MANIFEST_LOADING, () => { sourceReady = false; reset(); });
  listen(Hls.Events.MANIFEST_PARSED, () => { sourceReady = true; });
  const resetBuffers = () => { reset(); videoBuffer = undefined; audioBuffer = undefined; };
  listen(Hls.Events.MEDIA_DETACHING, resetBuffers);
  listen(Hls.Events.BUFFER_RESET, resetBuffers);
  listen(Hls.Events.BUFFER_CREATED, (_event, data) => {
    reset(); videoBuffer = data.tracks.video?.buffer; audioBuffer = data.tracks.audio?.buffer;
  });
  listen(Hls.Events.LEVEL_SWITCHING, () => {
    generation += 1; main = undefined; videoEnded = false;
  });
  listen(Hls.Events.AUDIO_TRACK_SWITCHING, () => {
    generation += 1; audio = undefined; audioEnded = false;
  });
  listen(Hls.Events.BUFFER_APPENDING, (_event, data) => {
    generation += 1;
    if (data.type === 'video') { main = undefined; videoEnded = false; }
    if (data.type === 'audio') { audio = undefined; audioEnded = false; }
  });
  listen(Hls.Events.BUFFER_APPENDED, check);
  listen(Hls.Events.FRAG_BUFFERED, (_event, data) => {
    if (data.part) return;
    if (data.frag.type === 'main' && currentMain(data.frag)) main = data.frag;
    if (data.frag.type === 'audio' && currentAudio(data.frag)) audio = data.frag;
    check();
  });
  listen(Hls.Events.BUFFER_EOS, (_event, data) => {
    if (!data.type || data.type === 'video') videoEnded = true;
    if (!data.type || data.type === 'audio') audioEnded = true;
    check();
  });
  listen(Hls.Events.BUFFER_FLUSHING, (_event, data) => {
    generation += 1;
    const overlaps = (frag: Fragment | undefined) => frag
      && data.startOffset < frag.end && data.endOffset > frag.start;
    if (!data.type || data.type === 'video') {
      flushing.add('video');
      if (overlaps(main)) { main = undefined; videoEnded = false; }
    }
    if (!data.type || data.type === 'audio') {
      flushing.add('audio');
      if (overlaps(audio)) { audio = undefined; audioEnded = false; }
    }
  });
  listen(Hls.Events.BUFFER_FLUSHED, (_event, data) => { flushing.delete(data.type); check(); });
  const cancel = () => { generation += 1; };
  media.addEventListener('pause', cancel);
  media.addEventListener('seeking', cancel);
  media.addEventListener('playing', check);
  media.addEventListener('seeked', check);
  document.addEventListener('visibilitychange', check);
  return {
    check,
    destroy: () => {
      disposed = true; reset(); remove.forEach((off) => off());
      media.removeEventListener('pause', cancel);
      media.removeEventListener('seeking', cancel);
      media.removeEventListener('playing', check);
      media.removeEventListener('seeked', check);
      document.removeEventListener('visibilitychange', check);
    },
  };
}
