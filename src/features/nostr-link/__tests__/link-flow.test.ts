// @vitest-environment node
//
// Uses the SDK's mnemonic account (tweetnacl) + real signature verification,
// which need Node's typed arrays — jsdom's break tweetnacl's Uint8Array check.
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { Buffer } from 'buffer';
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
  it('returns the linked npub when present', async () => {
    getAccount.mockResolvedValue({ links: { nostr: 'npub1linked' } });
    expect(await fetchNostrLink('ak_x')).toBe('npub1linked');
  });

  it('returns null when the account has no nostr link', async () => {
    getAccount.mockResolvedValue({ links: {} });
    expect(await fetchNostrLink('ak_x')).toBeNull();
  });

  it('treats a missing account (throw) as not linked', async () => {
    getAccount.mockRejectedValue(new Error('404'));
    expect(await fetchNostrLink('ak_x')).toBeNull();
  });
});
