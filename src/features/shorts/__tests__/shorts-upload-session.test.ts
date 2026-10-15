import {
  afterEach, expect, it, vi,
} from 'vitest';
import { ShortsApiError } from '../api';
import { uploadResumeKey, waitForPreparedShort, type UploadSession } from '../shorts-upload-session';

const queued: UploadSession = {
  id: 'owned', parts: [0], partSize: 1024, expires: 1000, complete: false, status: 'queued',
};
const ready = {
  ...queued, complete: true, status: 'ready' as const, video: { id: 'owned' } as UploadSession['video'],
};
function options(read = vi.fn<() => Promise<UploadSession>>().mockResolvedValue(ready)) {
  const abort = new AbortController();
  return {
    read, assertCurrent: vi.fn(), onStatus: vi.fn(), signal: abort.signal, abort,
  };
}
afterEach(() => vi.useRealTimers());

it('follows queued and processing states to the same ready video using only status reads', async () => {
  vi.useFakeTimers();
  const opts = options(vi.fn().mockResolvedValueOnce({ ...queued, status: 'processing' }).mockResolvedValue(ready));
  const result = waitForPreparedShort(queued, opts);
  await vi.runAllTimersAsync();
  expect(await result).toEqual(ready.video);
  expect(opts.read).toHaveBeenCalledTimes(2);
  expect(opts.onStatus.mock.calls.map(([status]) => status)).toEqual(['queued', 'processing']);
});

it('recovers from temporary status-read failures without replaying any mutation', async () => {
  vi.useFakeTimers();
  const opts = options(vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(new ShortsApiError('busy', 503)).mockResolvedValue(ready));
  const result = waitForPreparedShort(queued, opts);
  await vi.runAllTimersAsync();
  expect(await result).toEqual(ready.video);
  expect(opts.read).toHaveBeenCalledTimes(3);
});

it('stops polling on account change, abort and authentication expiry', async () => {
  vi.useFakeTimers();
  const changed = options();
  const work = waitForPreparedShort(queued, changed);
  changed.assertCurrent.mockImplementation(() => { throw new Error('Wallet changed'); });
  const denied = expect(work).rejects.toThrow('Wallet changed');
  await vi.runAllTimersAsync(); await denied;
  expect(changed.read).not.toHaveBeenCalled();
  const aborted = options();
  const stopped = waitForPreparedShort(queued, aborted);
  const abortResult = expect(stopped).rejects.toMatchObject({ name: 'AbortError' });
  aborted.abort.abort(); await abortResult;
  await vi.runAllTimersAsync(); expect(aborted.read).not.toHaveBeenCalled();
  const expired = options(vi.fn().mockRejectedValue(new ShortsApiError('sign in', 401)));
  const expiry = expect(waitForPreparedShort(queued, expired)).rejects.toMatchObject({ status: 401 });
  await vi.runAllTimersAsync(); await expiry;
  expect(expired.read).toHaveBeenCalledTimes(1);
});

it('does not accept mismatched results, failed preparation or endless waiting as a publishable video', async () => {
  await expect(waitForPreparedShort({ ...ready, video: { id: 'another' } as UploadSession['video'] }, options())).rejects.toThrow('has not finished');
  await expect(waitForPreparedShort({ ...queued, status: 'failed', error: 'Choose a valid file' }, options())).rejects.toThrow('Choose a valid file');
  vi.useFakeTimers();
  const opts = options(vi.fn().mockResolvedValue(queued));
  const result = expect(waitForPreparedShort(queued, { ...opts, timeoutMs: 2500 })).rejects.toThrow('video is saved');
  await vi.runAllTimersAsync(); await result;
  expect(opts.read).toHaveBeenCalledTimes(3);
});

it('namespaces saved upload IDs by API, network, contract and wallet', () => {
  const scope = ['https://api.example.com', 'ae_uat', 'ct_contract', 'ak_creator'];
  const key = uploadResumeKey(...scope as [string, string, string, string]);
  for (let i = 0; i < scope.length; i += 1) {
    const changed = [...scope]; changed[i] += '-other';
    expect(uploadResumeKey(...changed as [string, string, string, string])).not.toBe(key);
  }
});
