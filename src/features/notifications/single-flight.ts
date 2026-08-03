/**
 * Collapses concurrent calls onto a single run: callers that arrive while one is
 * in flight join it rather than starting their own — one wallet prompt, one fetch.
 *
 * The notification client needs this three times over (session bootstrap, start,
 * refresh) and each hand-rolled copy had to get the same subtlety right: the slot
 * is released only by the run that OWNS it. A run that settles late — after
 * {@link abandon} and a newer run took the slot — must not clear the newer one, or
 * a third caller would start a duplicate of work already in flight.
 */
export class SingleFlight<T> {
  private current: Promise<T> | null = null;

  /** Join the in-flight run if there is one, otherwise start `fn`. */
  run(fn: () => Promise<T>): Promise<T> {
    if (this.current) return this.current;
    const started = fn().finally(() => {
      if (this.current === started) this.current = null;
    });
    this.current = started;
    return started;
  }

  /**
   * Forget the in-flight run. It keeps going — a promise cannot be cancelled — but
   * no later caller will join it. The client's stop() uses this so a start() after
   * a teardown does the work itself instead of adopting a run that teardown already
   * neutered (which would resolve having done nothing at all).
   */
  abandon(): void {
    this.current = null;
  }

  get pending(): boolean {
    return this.current !== null;
  }
}
