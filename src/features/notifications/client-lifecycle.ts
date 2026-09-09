/**
 * Which run of a {@link NotificationFeedClient} is current, and whether it is
 * still live.
 *
 * A client instance belongs to one account, but the callbacks it publishes
 * through are shared by all instances (one NotificationsProvider for the app, a
 * new client per account). So "may this continuation still act?" is the question
 * every async path in the client has to answer — and it is really two questions:
 *   - {@link isRunning}: has this client been torn down? Publishing anyway lands
 *     on whichever account is on screen now.
 *   - {@link owns}: is the run I belong to still the current one? After a
 *     stop()+start(), `isRunning` is true again, yet a bootstrap resumed from the
 *     OLD run must not open a second socket for the new one to tear down.
 *
 * Both used to be loose fields (`stopped`, `startGeneration`) that each call site
 * had to remember to check together, which is how a socket handler came to publish
 * after teardown and a resumed bootstrap came to adopt a dead run. Nothing here
 * touches the network, the DOM or the clock.
 */
export class ClientLifecycle {
  private runId = 1;

  private running = true;

  /**
   * Begin (or restart) a run. The returned id is what continuations carry so they
   * can tell later whether they still own the lifecycle.
   */
  begin(): number {
    this.runId += 1;
    this.running = true;
    return this.runId;
  }

  /** End the current run: nothing belonging to it may publish or connect again. */
  end(): void {
    this.runId += 1;
    this.running = false;
  }

  /**
   * False from end() until the next begin(). A freshly constructed client is
   * already runnable: refresh() and markRead() are supported before any start(),
   * since a cached session needs no bootstrap.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * The current run id, for work that starts outside {@link begin} — a refresh
   * triggered by a socket 'connect', a mark-read from a click, a recovery timer —
   * and has to prove later that it still belongs to the run it started in.
   */
  get currentRun(): number {
    return this.runId;
  }

  /** True only while `id` is the current run AND that run is still live. */
  owns(id: number): boolean {
    return this.running && this.runId === id;
  }
}
