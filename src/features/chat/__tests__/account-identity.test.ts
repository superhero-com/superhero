import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { deriveInlineLinkIdentity } from '@/features/nostr-link/identity-source';
import { lockRoomSession, unlockRoomSession } from '../session/room-session';

const mocks = vi.hoisted(() => ({
  index: vi.fn<() => number | null>(),
  load: vi.fn(async () => ({ version: 1 })),
  derive: vi.fn(),
}));
vi.mock('@/features/wallet/manifest-store', () => ({
  indexForAddress: mocks.index,
}));
vi.mock('@/features/wallet/vault-store', () => ({
  createIndexedDbVaultStore: () => ({ load: mocks.load }),
}));
vi.mock('@/features/wallet/nostr-key', () => ({
  deriveNostrIdentity: mocks.derive,
}));

beforeEach(() => {
  lockRoomSession();
  mocks.index.mockReset().mockReturnValue(null);
  mocks.load.mockClear();
  mocks.derive.mockReset();
});

describe('chat identity belongs to the selected wallet account', () => {
  it.each([
    ['chat unlock', unlockRoomSession],
    ['identity linking', deriveInlineLinkIdentity],
  ])('%s rejects an extension account even when another in-app vault exists', async (_, unlock) => {
    await expect(unlock('ak_external')).rejects.toThrow('for this account');
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it.each([
    ['chat unlock', unlockRoomSession],
    ['identity linking', deriveInlineLinkIdentity],
  ])('%s uses the selected in-app account index', async (_, unlock) => {
    mocks.index.mockReturnValue(3);
    // Stop at the key boundary; only the account selection is under test.
    mocks.derive.mockRejectedValue(new Error('derivation reached'));
    await expect(unlock('ak_inline')).rejects.toThrow('derivation reached');
    expect(mocks.derive).toHaveBeenCalledWith({ version: 1 }, expect.any(Function), 3);
  });
});
