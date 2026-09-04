/**
 * Unit tests for live-layer escalation (RecoveryLadder).
 *
 * The rules live here so the client's behaviour tests only have to prove it CALLS
 * them, not re-derive what they mean. No sockets, no fake timers, no fetch.
 */
import { describe, expect, it } from 'vitest';
import { HEALTHY_CONNECTION_MS, RecoveryLadder } from '../recovery-ladder';

describe('RecoveryLadder', () => {
  const T0 = 1_000_000;

  it('escalates reconnect → reauth → give-up', () => {
    const ladder = new RecoveryLadder();
    expect(ladder.nextStep()).toBe('reconnect');
    expect(ladder.nextStep()).toBe('reauth');
    ladder.noteReauth(); // the client spends the budget when the timer fires
    expect(ladder.nextStep()).toBe('give-up');
    expect(ladder.nextStep()).toBe('give-up'); // and stays there
  });

  it('keeps offering reauth until the budget is actually spent', () => {
    // nextStep() must not consume the re-sign itself: the client schedules a timer
    // and only then commits, so a stop() before it fires spends nothing.
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    expect(ladder.nextStep()).toBe('reauth');
    expect(ladder.nextStep()).toBe('reauth');
  });

  it('does NOT clear the ladder for a connection that was kicked straight back', () => {
    // The reported loop: the gateway sends CONNECT and only then rejects, so every
    // failed attempt looks like connect-then-kick. Crediting that as a success
    // reset the ladder forever and revalidation was never reached.
    const ladder = new RecoveryLadder();
    ladder.noteConnected(T0);
    ladder.noteDisconnected(T0 + 5); // kicked after 5ms
    expect(ladder.nextStep()).toBe('reconnect');
    ladder.noteConnected(T0 + 1000);
    ladder.noteDisconnected(T0 + 1005);
    expect(ladder.nextStep()).toBe('reauth');
  });

  it('clears the ladder for a connection that held', () => {
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    ladder.nextStep();
    ladder.noteReauth(); // ladder now exhausted
    ladder.noteConnected(T0);
    ladder.noteDisconnected(T0 + HEALTHY_CONNECTION_MS);
    expect(ladder.nextStep()).toBe('reconnect'); // clean episode, cheap rung again
  });

  it('treats the threshold as inclusive and anything under it as a rejection', () => {
    const held = new RecoveryLadder();
    held.nextStep();
    held.noteConnected(T0);
    held.noteDisconnected(T0 + HEALTHY_CONNECTION_MS);
    expect(held.nextStep()).toBe('reconnect');

    const short = new RecoveryLadder();
    short.nextStep();
    short.noteConnected(T0);
    short.noteDisconnected(T0 + HEALTHY_CONNECTION_MS - 1);
    expect(short.nextStep()).toBe('reauth');
  });

  it('does not credit uptime to a socket that never connected', () => {
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    ladder.noteDisconnected(T0 + 10 * HEALTHY_CONNECTION_MS); // no noteConnected
    expect(ladder.nextStep()).toBe('reauth');
  });

  it('forgetConnection() drops uptime without crediting it', () => {
    // A socket being REPLACED must not hand its uptime to its successor.
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    ladder.noteConnected(T0);
    ladder.forgetConnection();
    ladder.noteDisconnected(T0 + 10 * HEALTHY_CONNECTION_MS);
    expect(ladder.nextStep()).toBe('reauth');
  });

  it('allowCheapRetry() re-opens the cheap rung but mints no wallet prompt', () => {
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    ladder.nextStep();
    ladder.noteReauth();
    expect(ladder.nextStep()).toBe('give-up');

    ladder.allowCheapRetry(); // tab-return
    expect(ladder.nextStep()).toBe('reconnect');
    expect(ladder.nextStep()).toBe('give-up'); // re-sign budget stays spent
  });

  it('reset() gives a full clean slate', () => {
    const ladder = new RecoveryLadder();
    ladder.nextStep();
    ladder.nextStep();
    ladder.noteReauth();
    ladder.reset();
    expect(ladder.nextStep()).toBe('reconnect');
    expect(ladder.nextStep()).toBe('reauth');
  });

  it('reset() also drops any in-progress connection uptime', () => {
    const ladder = new RecoveryLadder();
    ladder.noteConnected(T0);
    ladder.reset();
    ladder.nextStep();
    ladder.noteDisconnected(T0 + 10 * HEALTHY_CONNECTION_MS);
    expect(ladder.nextStep()).toBe('reauth');
  });
});
