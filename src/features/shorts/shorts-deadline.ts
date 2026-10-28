/** Bounds preparation only. Stop before asking a wallet to sign; never retry on expiry. */
export class ShortsDeadline {
  readonly signal: AbortSignal;

  private readonly controller = new AbortController();

  private readonly expired: Promise<never>;

  private timer?: ReturnType<typeof setTimeout>;

  private failure?: Error;

  constructor(message: string) {
    this.signal = this.controller.signal;
    this.expired = new Promise((_, reject) => {
      this.timer = setTimeout(() => {
        this.failure = new Error(message);
        this.controller.abort();
        reject(this.failure);
      }, 20000);
    });
  }

  assertActive() {
    if (this.failure) throw this.failure;
  }

  wait<T>(operation: Promise<T>): Promise<T> {
    return Promise.race([operation, this.expired]);
  }

  stop() {
    clearTimeout(this.timer);
  }

  close() {
    this.stop();
    this.controller.abort();
  }
}
