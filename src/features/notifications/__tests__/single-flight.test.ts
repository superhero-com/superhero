/**
 * Unit tests for call coalescing (SingleFlight).
 *
 * The rules live here so the client's behaviour tests only have to prove it CALLS
 * them, not re-derive what they mean. No sockets, no fake timers, no fetch.
 */
import { describe, expect, it } from 'vitest';
import { SingleFlight } from '../single-flight';

describe('SingleFlight', () => {
  /** A promise whose settling this test controls. */
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('runs the first caller and makes the rest join it', async () => {
    const flight = new SingleFlight<string>();
    const d = deferred<string>();
    let calls = 0;
    const fn = () => {
      calls += 1;
      return d.promise;
    };

    const a = flight.run(fn);
    const b = flight.run(fn);
    expect(calls).toBe(1);
    expect(a).toBe(b); // literally the same promise — one wallet prompt
    d.resolve('tok');
    await expect(a).resolves.toBe('tok');
    await expect(b).resolves.toBe('tok');
  });

  it('releases the slot once settled so the next caller runs fresh', async () => {
    const flight = new SingleFlight<number>();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return calls;
    };
    await flight.run(fn);
    expect(flight.pending).toBe(false);
    await flight.run(fn);
    expect(calls).toBe(2);
  });

  it('releases the slot when the run rejects', async () => {
    const flight = new SingleFlight<void>();
    await expect(flight.run(async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(flight.pending).toBe(false);
  });

  it('reports pending only while a run is in flight', async () => {
    const flight = new SingleFlight<string>();
    const d = deferred<string>();
    expect(flight.pending).toBe(false);
    const run = flight.run(() => d.promise);
    expect(flight.pending).toBe(true);
    d.resolve('x');
    await run;
    expect(flight.pending).toBe(false);
  });

  it('abandon() stops later callers joining, without cancelling the run', async () => {
    const flight = new SingleFlight<string>();
    const first = deferred<string>();
    const second = deferred<string>();

    const a = flight.run(() => first.promise);
    flight.abandon(); // e.g. stop()
    expect(flight.pending).toBe(false);
    const b = flight.run(() => second.promise);
    expect(b).not.toBe(a);

    second.resolve('second');
    first.resolve('first');
    await expect(a).resolves.toBe('first'); // still ran to completion
    await expect(b).resolves.toBe('second');
  });

  it('an abandoned run settling late does not clear the newer slot', async () => {
    // Otherwise a third caller starts a duplicate of the run already in flight.
    const flight = new SingleFlight<string>();
    const first = deferred<string>();
    const second = deferred<string>();

    const a = flight.run(() => first.promise);
    flight.abandon();
    const b = flight.run(() => second.promise);

    first.resolve('first');
    await a; // let the abandoned run's finally() run
    expect(flight.pending).toBe(true); // b still owns the slot
    expect(flight.run(() => Promise.resolve('third'))).toBe(b);

    second.resolve('second');
    await b;
    expect(flight.pending).toBe(false);
  });
});
