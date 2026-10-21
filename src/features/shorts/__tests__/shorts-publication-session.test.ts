import {
  afterEach, expect, it, vi,
} from 'vitest';
import { ShortsApiError } from '../api';
import { PublicationReviewPending, publishAndWait } from '../shorts-publication-session';
import type { Short } from '../types';

const draft = { id: 'owned', publicationStatus: 'draft' } as Short;
const queued = { ...draft, publicationRequest: 'queued' as const };
const published = { ...draft, publicationStatus: 'published' as const, publicationRequest: 'confirmed' as const };
function options() {
  const abort = new AbortController();
  return {
    read: vi.fn<() => Promise<Short>>().mockResolvedValueOnce(draft).mockResolvedValue(published),
    submit: vi.fn<() => Promise<Short>>().mockResolvedValue(queued),
    assertCurrent: vi.fn(),
    onWaiting: vi.fn(),
    signal: abort.signal,
    abort,
  };
}
afterEach(() => vi.useRealTimers());

it('keeps pending review separate from publication failure and allows publication after approval', async () => {
  const opts = options();
  opts.read.mockReset().mockResolvedValue({ ...draft, moderation: 'pending' });
  await expect(publishAndWait('owned', opts)).rejects.toBeInstanceOf(PublicationReviewPending);
  expect(opts.submit).not.toHaveBeenCalled();
  vi.useFakeTimers();
  opts.read.mockReset().mockResolvedValueOnce({ ...draft, moderation: 'approved' }).mockResolvedValue(published);
  const promise = publishAndWait('owned', opts);
  await vi.runAllTimersAsync();
  expect(await promise).toEqual(published);
  expect(opts.submit).toHaveBeenCalledOnce();
});

it('waits for confirmation instead of treating an accepted request as published', async () => {
  vi.useFakeTimers(); const opts = options();
  const promise = publishAndWait('owned', opts);
  await vi.runAllTimersAsync();
  expect(await promise).toEqual(published);
  expect(opts.submit).toHaveBeenCalledTimes(1);
  expect(opts.read).toHaveBeenCalledTimes(2);
  expect(opts.onWaiting).toHaveBeenCalledOnce();
});
it('resumes a saved request after reload without submitting again', async () => {
  vi.useFakeTimers(); const opts = options();
  opts.read.mockReset().mockResolvedValueOnce({ ...queued, publicationRequest: 'signed' }).mockResolvedValue(published);
  const promise = publishAndWait('owned', opts); await vi.runAllTimersAsync();
  expect(await promise).toEqual(published); expect(opts.submit).not.toHaveBeenCalled();
});
it('resumes storage preparation after reload and waits through the signing queue', async () => {
  vi.useFakeTimers(); const opts = options();
  opts.read.mockReset().mockResolvedValueOnce({ ...draft, publicationPending: true, publicationRequest: 'preparing' })
    .mockResolvedValueOnce(queued).mockResolvedValue(published);
  const promise = publishAndWait('owned', opts); await vi.runAllTimersAsync();
  expect(await promise).toEqual(published);
  expect(opts.submit).not.toHaveBeenCalled(); expect(opts.onWaiting).toHaveBeenCalledTimes(2);
});
it('recovers a lost acknowledgement before storage preparation finishes without a second publish', async () => {
  vi.useFakeTimers(); const opts = options();
  opts.submit.mockRejectedValue(new TypeError('connection reset'));
  opts.read.mockReset().mockResolvedValueOnce(draft)
    .mockResolvedValueOnce({ ...draft, publicationPending: true, publicationRequest: 'preparing' }).mockResolvedValue(published);
  const promise = publishAndWait('owned', opts); await vi.runAllTimersAsync();
  expect(await promise).toEqual(published); expect(opts.submit).toHaveBeenCalledOnce();
});
it('recovers a lost submission acknowledgement using status reads only', async () => {
  vi.useFakeTimers(); const opts = options();
  opts.submit.mockRejectedValue(new TypeError('connection reset'));
  opts.read.mockReset().mockResolvedValueOnce(draft).mockResolvedValueOnce(queued).mockResolvedValue(published);
  const promise = publishAndWait('owned', opts); await vi.runAllTimersAsync();
  expect(await promise).toEqual(published); expect(opts.submit).toHaveBeenCalledOnce();
});
it('rejects a different video without submitting', async () => {
  const opts = options(); opts.read.mockReset().mockResolvedValue({ ...draft, id: 'another' });
  await expect(publishAndWait('owned', opts)).rejects.toThrow('did not match'); expect(opts.submit).not.toHaveBeenCalled();
});
it('stops polling after an account change or unmount', async () => {
  vi.useFakeTimers(); const opts = options();
  opts.onWaiting.mockImplementation(() => opts.abort.abort());
  const promise = publishAndWait('owned', opts);
  const rejection = expect(promise).rejects.toThrow(); await vi.runAllTimersAsync(); await rejection;
  expect(opts.read).toHaveBeenCalledOnce();
});
it('keeps pending publication recoverable when the waiting deadline expires', async () => {
  vi.useFakeTimers(); const opts = options(); opts.read.mockReset().mockResolvedValue(queued);
  const promise = publishAndWait('owned', { ...opts, timeoutMs: 10, intervalMs: 5 });
  const rejection = expect(promise).rejects.toThrow('still pending'); await vi.runAllTimersAsync(); await rejection;
  expect(opts.submit).not.toHaveBeenCalled();
});
it('does not retry an authorization failure or a terminal rejection', async () => {
  const opts = options(); opts.read.mockReset().mockResolvedValue({ ...queued, publicationRequest: 'cancelled' });
  await expect(publishAndWait('owned', opts)).rejects.toThrow('could not be published');
  opts.read.mockReset().mockResolvedValue(draft); opts.submit.mockRejectedValue(new ShortsApiError('expired', 401));
  await expect(publishAndWait('owned', opts)).rejects.toThrow('expired'); expect(opts.submit).toHaveBeenCalledOnce();
});
