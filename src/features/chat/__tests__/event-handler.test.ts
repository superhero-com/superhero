import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { NostrEventHandler } from '../nostr/event-handler';
import type { NostrIdentityProvider } from '../identity/nostr-identity';
import type { NostrEvent } from '../core/types';

const message = (id: string): NostrEvent => ({
  id, kind: 4, pubkey: 'peer', tags: [['p', 'me']], content: id, created_at: 1, sig: '',
});
function setup(decrypt: NostrIdentityProvider['nip04Decrypt']) {
  const received = vi.fn();
  const handler = new NostrEventHandler({
    getPublicKey: async () => 'me', nip04Decrypt: decrypt,
  } as NostrIdentityProvider, {
    onDirectMessage: received, onProfile: () => {}, onReaction: () => {}, onEventDeleted: () => {},
  });
  return { handler, received };
}
afterEach(() => vi.useRealTimers());
describe('DM receive queue', () => {
  it('continues after malformed ciphertext', async () => {
    vi.useFakeTimers();
    const { handler, received } = setup(async (_, text) => {
      if (text === 'bad') throw new Error('Invalid ciphertext');
      return text;
    });
    handler.queueEvent(message('bad'));
    handler.queueEvent(message('good'));
    await vi.runAllTimersAsync();
    expect(received).toHaveBeenCalledTimes(1);
    expect(received.mock.calls[0][1]).toBe('good');
  });
  it('drains messages arriving while decryption is pending without needing another event', async () => {
    vi.useFakeTimers();
    let release: (text: string) => void;
    const first = new Promise<string>((resolve) => { release = resolve; });
    const { handler, received } = setup(async (_, text) => (text === 'first' ? first : text));
    handler.queueEvent(message('first'));
    await vi.runAllTimersAsync();
    handler.queueEvent(message('second'));
    release!('first');
    await vi.runAllTimersAsync();
    expect(received.mock.calls.map((call) => call[1])).toEqual(['first', 'second']);
  });
  it('ignores DMs addressed to someone else', async () => {
    vi.useFakeTimers();
    const decrypt = vi.fn();
    const { handler } = setup(decrypt);
    handler.queueEvent({ ...message('other'), tags: [['p', 'someone else']] });
    await vi.runAllTimersAsync();
    expect(decrypt).not.toHaveBeenCalled();
  });
});
