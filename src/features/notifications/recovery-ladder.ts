/**
 * How long a socket must stay up before its connection counts as genuinely
 * accepted (see {@link RecoveryLadder}).
 *
 * The gateway authorises in `handleConnection`, which Nest runs AFTER socket.io
 * has already sent the namespace CONNECT packet — so a socket it rejects still
 * fires 'connect' and only then 'disconnect' ("io server disconnect"), a few
 * milliseconds later. A 'connect' event is therefore NOT proof of acceptance, and
 * anything this short-lived is a rejection rather than a session.
 */
export const HEALTHY_CONNECTION_MS = 5_000;

/** What one more live-layer failure earns. */
export type RecoveryStep = 'reconnect' | 'reauth' | 'give-up';

/**
 * Escalation state for the best-effort live layer. Server kick-outs, denied
 * handshakes and an exhausted auto-reconnect budget are the three ways the socket
 * ends up dead with nothing scheduled to retry it, and they share one ladder:
 *
 *   1st failure → reconnect reusing the token (transient drop, a freed cap slot,
 *                 a backgrounded tab) — never prompts the wallet
 *   2nd failure → revalidate the session, re-signing only if the server says the
 *                 token is dead, then rebuild the socket
 *   after that  → stop; the feed still works over REST, the source of truth
 *
 * The rules used to be spread across a 'connect' handler, a 'disconnect' handler,
 * the visibility handler and doStart, and every bug here was two of them
 * disagreeing:
 *   - only a connection that HELD ({@link HEALTHY_CONNECTION_MS}) clears the
 *     ladder. A 'connect' event does not, or a socket that is accepted and kicked
 *     straight back resets the ladder on every attempt and loops forever.
 *   - the re-sign budget is one per episode: the gateway also kicks for reasons no
 *     new signature can fix (per-address cap, failed join).
 *   - a tab-return re-opens the cheap rung ONLY, so tab switching cannot mint
 *     fresh wallet prompts.
 *
 * Callers pass `now` in, so all of this is testable without fake timers.
 */
export class RecoveryLadder {
  private failures = 0;

  private reauths = 0;

  private connectedAt: number | null = null;

  /** Note a 'connect'. NOT proof of acceptance — see HEALTHY_CONNECTION_MS. */
  noteConnected(now: number): void {
    this.connectedAt = now;
  }

  /**
   * Note a disconnect, starting a clean episode if the connection held long enough
   * to prove the token and the cap slot. Call this for EVERY disconnect reason: a
   * transport drop is socket.io's own to retry, but it still ends a healthy
   * session.
   */
  noteDisconnected(now: number): void {
    const heldFor = this.connectedAt === null ? 0 : now - this.connectedAt;
    this.connectedAt = null;
    if (heldFor >= HEALTHY_CONNECTION_MS) this.reset();
  }

  /**
   * Drop the current connection's uptime WITHOUT judging it — for a socket being
   * replaced, whose time must not be credited to its successor.
   */
  forgetConnection(): void {
    this.connectedAt = null;
  }

  /** Count one failure and say which rung of recovery it earns. */
  nextStep(): RecoveryStep {
    this.failures += 1;
    if (this.failures <= 1) return 'reconnect';
    // Not consumed here: the client schedules a timer and commits when it fires,
    // so a teardown before then spends nothing.
    return this.reauths < 1 ? 'reauth' : 'give-up';
  }

  /** Spend the episode's single re-sign. */
  noteReauth(): void {
    this.reauths += 1;
  }

  /** Tab-return: one more token-reuse attempt, but no new re-sign budget. */
  allowCheapRetry(): void {
    this.failures = 0;
  }

  /** Clean slate — a new run, or a connection that proved itself. */
  reset(): void {
    this.failures = 0;
    this.reauths = 0;
    this.connectedAt = null;
  }
}
