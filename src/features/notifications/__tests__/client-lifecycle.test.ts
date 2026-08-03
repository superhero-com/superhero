/**
 * Unit tests for the client run/teardown rules (ClientLifecycle).
 *
 * The rules live here so the client's behaviour tests only have to prove it CALLS
 * them, not re-derive what they mean. No sockets, no fake timers, no fetch.
 */
import { describe, expect, it } from 'vitest';
import { ClientLifecycle } from '../client-lifecycle';

describe('ClientLifecycle', () => {
  it('is runnable before any begin() — refresh() works off a cached session', () => {
    expect(new ClientLifecycle().isRunning).toBe(true);
  });

  it('stops running at end() and runs again after begin()', () => {
    const life = new ClientLifecycle();
    life.end();
    expect(life.isRunning).toBe(false);
    life.begin();
    expect(life.isRunning).toBe(true);
  });

  it('owns the run it just began', () => {
    const life = new ClientLifecycle();
    const run = life.begin();
    expect(life.owns(run)).toBe(true);
  });

  it('disowns a run after end() — the "published after teardown" case', () => {
    const life = new ClientLifecycle();
    const run = life.begin();
    life.end();
    expect(life.owns(run)).toBe(false);
  });

  it('disowns a superseded run even though the client is running again', () => {
    // The zombie-bootstrap case: `isRunning` is true for the NEW run, so it alone
    // cannot tell the resumed old one to stand down.
    const life = new ClientLifecycle();
    const first = life.begin();
    life.end();
    const second = life.begin();
    expect(life.isRunning).toBe(true);
    expect(life.owns(first)).toBe(false);
    expect(life.owns(second)).toBe(true);
  });

  it('disowns a superseded run even without an intervening end()', () => {
    const life = new ClientLifecycle();
    const first = life.begin();
    const second = life.begin();
    expect(life.owns(first)).toBe(false);
    expect(life.owns(second)).toBe(true);
  });

  it('never reuses a run id, so an old id cannot alias a later run', () => {
    const life = new ClientLifecycle();
    const ids = [life.begin(), life.begin()];
    life.end();
    ids.push(life.begin());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tolerates a redundant end()', () => {
    const life = new ClientLifecycle();
    const run = life.begin();
    life.end();
    life.end();
    expect(life.isRunning).toBe(false);
    expect(life.owns(run)).toBe(false);
  });
});
