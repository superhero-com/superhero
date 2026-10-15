import Hls, {
  type HlsConfig, type Loader, type LoaderCallbacks, type LoaderConfiguration,
  type LoaderContext, type LoadPolicy, type LoaderStats,
} from 'hls.js';
import { playbackRetryDelay, PLAYBACK_RETRY_WINDOW_MS } from './playback-retry';

const DefaultLoader = Hls.DefaultConfig.loader;

// The loader owns 429/503 retries because it can read Retry-After. Prevent the
// playlist/fragment controllers from starting another retry cycle afterwards.
export function shortsLoadPolicy(policy: LoadPolicy): LoadPolicy {
  const { errorRetry } = policy.default;
  return {
    default: {
      ...policy.default,
      errorRetry: errorRetry && {
        ...errorRetry,
        shouldRetry: (config, count, timeout, response, retry) => (
          ![429, 503].includes(response?.code ?? 0)
          && (errorRetry.shouldRetry?.(config, count, timeout, response, retry) ?? retry)
        ),
      },
    },
  };
}

export class ShortsHlsLoader implements Loader<LoaderContext> {
  context: LoaderContext | null = null;

  stats: LoaderStats;

  private delegate: Loader<LoaderContext>;

  private timer?: ReturnType<typeof setTimeout>;

  private stopped = false;

  constructor(private readonly hlsConfig: HlsConfig) {
    this.delegate = new DefaultLoader(hlsConfig);
    this.stats = this.delegate.stats;
  }

  load(
    context: LoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<LoaderContext>,
  ) {
    if (this.context || this.stopped) throw new Error('Loader can only be used once');
    this.context = context;
    const deadline = Date.now() + PLAYBACK_RETRY_WINDOW_MS;
    let attempt = 0;
    const wrapped: LoaderCallbacks<LoaderContext> = {
      ...callbacks,
      onError: (error, current, details, stats) => {
        if (this.stopped) return;
        const header = details instanceof XMLHttpRequest ? details.getResponseHeader('Retry-After') : null;
        const delay = playbackRetryDelay(error.code, header, attempt);
        if (delay === null || Date.now() + delay > deadline) {
          callbacks.onError(error, current, details, stats);
          return;
        }
        attempt += 1;
        this.timer = setTimeout(() => {
          if (this.stopped) return;
          this.delegate.destroy();
          this.delegate = new DefaultLoader(this.hlsConfig);
          // Hls.js retains this stats object on the fragment. Keep that identity
          // while the new transport measures only the successful attempt.
          Object.assign(this.stats, this.delegate.stats, { retry: attempt });
          this.delegate.stats = this.stats;
          this.delegate.load(context, config, wrapped);
        }, delay);
      },
    };
    this.delegate.load(context, config, wrapped);
  }

  abort() { this.stopped = true; clearTimeout(this.timer); this.delegate.abort(); }

  destroy() { this.stopped = true; clearTimeout(this.timer); this.delegate.destroy(); }

  getCacheAge() { return this.delegate.getCacheAge?.() ?? null; }

  getResponseHeader(name: string) { return this.delegate.getResponseHeader?.(name) ?? null; }
}
