import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { getCurrentSocialGraphConfig, getSocialGraphCounts, withSocialGraphTimeout } from '../socialGraphPolicy';
import { CancelablePromise } from '../generated/core/CancelablePromise';

const request = vi.hoisted(() => vi.fn());
vi.mock('../generated/core/request', () => ({ request }));
const policy = {
  network: 'ae_mainnet',
  contract: 'ct_social',
  config_version: '4',
  config: { max_following: '10000', max_blocked: '10000', follow_cooldown: '0' },
  frozen: false,
  importing: false,
};

describe('social graph policy and count responses', () => {
  it('cancels a stalled read and returns an actionable error', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const pending = new CancelablePromise((_resolve, _reject, onCancel) => { onCancel(cancel); });
    const assertion = expect(withSocialGraphTimeout(pending, 100)).rejects.toThrow('Social graph is unavailable');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(cancel).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  beforeEach(() => request.mockReset());
  it('retains lifecycle and identity with safely parsed adjustable limits', async () => {
    request.mockResolvedValue(policy);
    expect(await getCurrentSocialGraphConfig()).toEqual({
      contract_address: 'ct_social',
      network_id: 'ae_mainnet',
      config_version: '4',
      max_following: 10000,
      max_blocked: 10000,
      follow_cooldown: 0,
      frozen: false,
      importing: false,
    });
  });
  it.each(['-1', '1.5', '9007199254740992', 'NaN'])('rejects unsafe integer %s', async (value) => {
    request.mockResolvedValue({ ...policy, config: { ...policy.config, max_following: value } });
    await expect(getCurrentSocialGraphConfig()).rejects.toThrow();
  });
  it('fails closed when lifecycle identity is incomplete', async () => {
    request.mockResolvedValue({ ...policy, frozen: undefined });
    await expect(getCurrentSocialGraphConfig()).rejects.toThrow();
  });
  it('rejects counts returned for a different contract after cutover', async () => {
    request.mockResolvedValue({
      network: 'ae_mainnet', contract: 'ct_other', address: 'ak_user', followers: '3', following: '2', completed_height: '9',
    });
    await expect(getSocialGraphCounts('ak_user', 'ae_mainnet', 'ct_social')).rejects.toThrow('identity changed');
  });
  it('requests scoped projection counters updated through websocket ingestion', async () => {
    request.mockResolvedValue({
      network: 'ae_mainnet',
      contract: 'ct_social',
      address: 'ak_user',
      followers: '0',
      following: '2',
      completed_height: '10',
      generation: '1',
    });
    expect(await getSocialGraphCounts('ak_user', 'ae_mainnet', 'ct_social')).toEqual({
      followers: 0, following: 2, stateHeight: 10, generation: '1',
    });
    expect(request).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      query: { account: 'ak_user' },
    }));
  });
});
