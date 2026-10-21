import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  isRoomSessionUnlocked, lockRoomSession, retainRoomSessionForAccount,
  roomKeySession, unlockRoomSession,
} from '../session/room-session';

const mocks = vi.hoisted(() => ({
  load: vi.fn(async () => ({ version: 1 })),
  derive: vi.fn(),
}));
vi.mock('@/features/wallet/manifest-store', () => ({ indexForAddress: () => 0 }));
vi.mock('@/features/wallet/vault-store', () => ({
  createIndexedDbVaultStore: () => ({ load: mocks.load }),
}));
vi.mock('@/features/wallet/nostr-key', () => ({ deriveNostrIdentity: mocks.derive }));

const keys = {
  privateKey: 'aa'.repeat(32), publicKey: 'bb'.repeat(32), npub: 'npub_test', nsec: 'nsec_test',
};
beforeEach(() => {
  lockRoomSession();
  mocks.load.mockClear();
  mocks.derive.mockReset().mockResolvedValue(keys);
});
afterEach(() => lockRoomSession());

describe('one chat unlock per account session', () => {
  it('reuses an unlocked identity instead of requesting verification again', async () => {
    await unlockRoomSession('ak_alice');
    await unlockRoomSession('ak_alice');
    expect(mocks.derive).toHaveBeenCalledTimes(1);
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });

  it('shares the verification when multiple chat entry points unlock together', async () => {
    await Promise.all([unlockRoomSession('ak_alice'), unlockRoomSession('ak_alice')]);
    expect(mocks.derive).toHaveBeenCalledTimes(1);
    expect(roomKeySession.keys).toBe(keys);
  });

  it('requires a new verification after explicit lock', async () => {
    await unlockRoomSession('ak_alice');
    lockRoomSession();
    await unlockRoomSession('ak_alice');
    expect(mocks.derive).toHaveBeenCalledTimes(2);
  });

  it('does not reuse another account’s unlocked identity', async () => {
    await unlockRoomSession('ak_alice');
    expect(isRoomSessionUnlocked('ak_bob')).toBe(false);
    await unlockRoomSession('ak_bob');
    expect(mocks.derive).toHaveBeenCalledTimes(2);
    expect(isRoomSessionUnlocked('ak_alice')).toBe(false);
  });

  it('cancels pending verification when the active account changes', async () => {
    let finish!: (value: typeof keys) => void;
    mocks.derive.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = unlockRoomSession('ak_alice');
    const rejected = expect(pending).rejects.toThrow('cancelled');
    await vi.waitFor(() => expect(mocks.derive).toHaveBeenCalledTimes(1));
    retainRoomSessionForAccount('ak_bob');
    finish(keys);
    await rejected;
    expect(roomKeySession.isUnlocked).toBe(false);
  });

  it('does not restore a session if it was locked while verification was pending', async () => {
    let finish!: (value: typeof keys) => void;
    mocks.derive.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = unlockRoomSession('ak_alice');
    const rejected = expect(pending).rejects.toThrow('cancelled');
    await vi.waitFor(() => expect(mocks.derive).toHaveBeenCalledTimes(1));
    lockRoomSession();
    finish(keys);
    await rejected;
    expect(roomKeySession.isUnlocked).toBe(false);
  });

  it('allows another attempt after verification is cancelled', async () => {
    mocks.derive.mockRejectedValueOnce(new Error('cancelled'));
    await expect(unlockRoomSession('ak_alice')).rejects.toThrow('cancelled');
    await unlockRoomSession('ak_alice');
    expect(roomKeySession.isUnlocked).toBe(true);
    expect(mocks.derive).toHaveBeenCalledTimes(2);
  });
});
