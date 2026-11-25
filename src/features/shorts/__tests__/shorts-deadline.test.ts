import {
  afterEach, expect, it, vi,
} from 'vitest';
import { ShortsDeadline } from '../shorts-deadline';

afterEach(() => vi.useRealTimers());

it('rejects a stuck SDK promise even if transport cancellation is ignored', async () => {
  vi.useFakeTimers();
  const deadline = new ShortsDeadline('Read timed out');
  const result = deadline.wait(new Promise(() => {})).catch((error: Error) => error);
  await vi.advanceTimersByTimeAsync(20000);
  expect(await result).toMatchObject({ message: 'Read timed out' });
  expect(deadline.signal.aborted).toBe(true);
  expect(() => deadline.assertActive()).toThrow('Read timed out');
  deadline.close();
});

it('does not time out user confirmation once signing starts', async () => {
  vi.useFakeTimers();
  const deadline = new ShortsDeadline('Preparation timed out');
  let approve!: () => void;
  const result = deadline.wait(new Promise<void>((resolve) => { approve = resolve; }));
  deadline.stop();
  await vi.advanceTimersByTimeAsync(120000);
  expect(() => deadline.assertActive()).not.toThrow();
  approve();
  await expect(result).resolves.toBeUndefined();
  deadline.close();
});
