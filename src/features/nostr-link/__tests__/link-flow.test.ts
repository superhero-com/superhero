// @vitest-environment node
//
// Uses the SDK's mnemonic account (tweetnacl) + real signature verification,
// which need Node's typed arrays — jsdom's break tweetnacl's Uint8Array check.
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { Buffer } from 'buffer';
import { ApiError } from '@/api/generated/core/ApiError';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import { verifyEvent } from 'nostr-tools/pure';
import { verifyMessageSignature, type Encoded } from '@aeternity/aepp-sdk';
import { mnemonicToSeedSync } from '@scure/bip39';

import { deriveSigner, deriveAccount } from '@/features/wallet/derivation';
import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import { createDerivedNostrIdentity } from '@/features/chat/identity/derived-identity';

const claim = vi.fn();
const submit = vi.fn();
const getAccount = vi.fn();

vi.mock('@/api/generated', () => ({
  NostrLinkService: {
    nostrLinkControllerClaim: (...a: unknown[]) => claim(...a),
    nostrLinkControllerSubmit: (...a: unknown[]) => submit(...a),
  },
  AccountsService: {
    getAccount: (...a: unknown[]) => getAccount(...a),
  },
}));

// Imported AFTER the mock so link-flow binds to the stubbed service.
// eslint-disable-next-line import/first
import { linkNostrIdentity, fetchNostrLink } from '../link-flow';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';
const SEED = mnemonicToSeedSync(MNEMONIC);

beforeEach(() => {
  claim.mockReset();
  submit.mockReset();
  getAccount.mockReset();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  OpenAPI.BASE = 'https://api.example.test';
});

describe('linkNostrIdentity — claim → AE-sign → nostr-proof → submit', () => {
  it('signs the claim message and submits a valid proof + AE signature', async () => {
    const { address } = deriveAccount(MNEMONIC, 0);
    const account = deriveSigner(MNEMONIC, 0);
    const keys = deriveKeysFromSeed(SEED, 0);
    const identity = createDerivedNostrIdentity(keys);

    const message = `link:${address}:nostr:${keys.npub}:0`;
    claim.mockResolvedValue({ message, nonce: 0, value: keys.npub });
    submit.mockResolvedValue({ txHash: 'th_test' });

    const signMessage = async (m: string) => Buffer.from(await account.signMessage(m)).toString('hex');

    const result = await linkNostrIdentity({
      address, npub: keys.npub, identity, signMessage,
    });

    // Claim asked for the right link.
    expect(claim).toHaveBeenCalledWith({ requestBody: { address, value: keys.npub } });

    // Submit payload is well-formed and cryptographically sound.
    const body = submit.mock.calls[0][0].requestBody;
    expect(body).toMatchObject({ address, value: keys.npub, nonce: 0 });
    expect(body.signature).toMatch(/^[0-9a-f]{128}$/);
    expect(
      verifyMessageSignature(
        message,
        Buffer.from(body.signature, 'hex'),
        address as Encoded.AccountAddress,
      ),
    ).toBe(true);

    const event = JSON.parse(body.nostr_event);
    expect(event.kind).toBe(22242);
    expect(event.content).toBe(message);
    expect(event.pubkey).toBe(keys.publicKey);
    expect(verifyEvent(event)).toBe(true);

    expect(result).toEqual({ txHash: 'th_test' });
  });

  it('surfaces the backend error message on submit failure', async () => {
    const { address } = deriveAccount(MNEMONIC, 0);
    const account = deriveSigner(MNEMONIC, 0);
    const keys = deriveKeysFromSeed(SEED, 0);
    const identity = createDerivedNostrIdentity(keys);
    claim.mockResolvedValue({ message: `link:${address}:nostr:${keys.npub}:0`, nonce: 0, value: keys.npub });
    submit.mockRejectedValue(new Error('INVALID_NONCE'));

    const signMessage = async (m: string) => Buffer.from(await account.signMessage(m)).toString('hex');

    await expect(
      linkNostrIdentity({
        address, npub: keys.npub, identity, signMessage,
      }),
    ).rejects.toThrow('INVALID_NONCE');
  });
});

describe('fetchNostrLink', () => {
  it.each([
    new Error('offline'),
    new ApiError({ method: 'GET', url: '/api/accounts/ak_x' }, {
      url: '', ok: false, status: 503, statusText: 'Unavailable', body: {},
    }, 'Unavailable'),
  ])('does not classify lookup failures as unlinked: %s', async (error) => {
    getAccount.mockRejectedValue(error);
    await expect(fetchNostrLink('ak_x')).rejects.toBe(error);
  });

  it('keeps a successful submission across reloads until the account index catches up', async () => {
    const { address } = deriveAccount(MNEMONIC, 0);
    const signer = deriveSigner(MNEMONIC, 0);
    const keys = deriveKeysFromSeed(SEED, 0);
    claim.mockResolvedValue({ message: `link:${address}:nostr:${keys.npub}:0`, nonce: 0, value: keys.npub });
    submit.mockResolvedValue({ txHash: 'th_test' });
    await linkNostrIdentity({
      address,
      npub: keys.npub,
      identity: createDerivedNostrIdentity(keys),
      signMessage: async (message) => Buffer.from(await signer.signMessage(message)).toString('hex'),
    });
    // A fresh module has no in-memory link state, like a full browser reload.
    vi.resetModules();
    const reloaded = await import('../link-flow');
    const { OpenAPI: reloadedConfig } = await import('@/api/generated/core/OpenAPI');
    reloadedConfig.BASE = OpenAPI.BASE;
    getAccount.mockResolvedValue({ links: {} });
    expect(await reloaded.fetchNostrLink(address)).toBe(keys.npub);
    expect(getAccount).toHaveBeenCalledWith({ address });
    expect(await reloaded.fetchNostrLink('ak_other')).toBeNull();
    reloadedConfig.BASE = 'https://testnet.example.test';
    expect(await reloaded.fetchNostrLink(address)).toBeNull();
    reloadedConfig.BASE = OpenAPI.BASE;
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 15 * 60_000);
    await expect(reloaded.fetchNostrLink(address)).rejects.toThrow('awaiting confirmation');
    clock.mockRestore();
    getAccount.mockResolvedValue({ links: { nostr: 'npub1server' } });
    expect(await reloaded.fetchNostrLink(address)).toBe('npub1server');
    // After server confirmation an unlink must not resurrect the old receipt.
    getAccount.mockResolvedValue({ links: {} });
    expect(await reloaded.fetchNostrLink(address)).toBeNull();
  });

  it('returns the linked npub when present', async () => {
    getAccount.mockResolvedValue({ links: { nostr: 'npub1linked' } });
    expect(await fetchNostrLink('ak_x')).toBe('npub1linked');
  });

  it('returns null when the account has no nostr link', async () => {
    getAccount.mockResolvedValue({ links: {} });
    expect(await fetchNostrLink('ak_x')).toBeNull();
  });

  it('treats an HTTP 404 as not linked', async () => {
    getAccount.mockRejectedValue(new ApiError({ method: 'GET', url: '/api/accounts/ak_x' }, {
      url: '', ok: false, status: 404, statusText: 'Not Found', body: {},
    }, 'Not Found'));
    expect(await fetchNostrLink('ak_x')).toBeNull();
  });
});
