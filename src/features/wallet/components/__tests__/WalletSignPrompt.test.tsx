import React from 'react';
import {
  render, screen, waitFor, fireEvent, act,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The prompt is the human half of the UV-per-signature contract: no KEK may be
 * released until the user has SEEN the payload and passed verification. These
 * tests pin that contract, plus the fail-closed behaviours around it — including
 * the WYSIWYS rule that a transaction the app cannot decode offers no approval
 * path at all.
 *
 * Two collaborators are mocked so this suite exercises ONLY the component's own
 * decision-making: the crypto providers (`wallet-lifecycle` — Argon2id in a
 * component test buys nothing) and `tx-summary`. Real transaction decoding is
 * validated in the node-env `tx-summary` suite; the SDK's `unpackTx` cannot run
 * under vitest+jsdom (it resolves the SDK/rlp TypeScript source, which throws on
 * the decoded byte types), so here the decoder is stubbed to return the canned
 * summaries the component must render and fail-close on.
 */
const passphraseProvider = vi.fn();
// The FACTORY, not the closure it returns — a provider can fail as it is built
// (see `runUnlock`).
const passphraseFactory = vi.fn((secret: string) => () => passphraseProvider(secret));
const passkeyProvider = vi.fn();
const recoveryProvider = vi.fn();

const fx = vi.hoisted(() => ({
  SENDER: 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka',
  RECIPIENT: 'ak_11111111111111111111111111111111273Yts',
  SPEND_TX: 'tx_spend_3ae',
  TOKEN_TRANSFER_TX: 'tx_token_transfer_5',
  CAUTION_TX: 'tx_unrecognised_call',
  PAYING_TX: 'tx_paying_for_spend',
}));

vi.mock('../../wallet-lifecycle', () => ({
  hasFactor: (record: { factors: { type: string }[] }, type: string) => record.factors
    .some((f) => f.type === type),
  passphraseUnlockProvider: (secret: string) => passphraseFactory(secret),
  passkeyUnlockProvider: () => () => passkeyProvider(),
  recoveryUnlockProvider: (code: string) => () => recoveryProvider(code),
}));

// Stubbed decoder — one canned summary per fixture payload; anything else is
// treated as undecodable (null), which is what must fail closed.
vi.mock('../../tx-summary', () => ({
  summarizeTransaction: (payload: string) => {
    switch (payload) {
      case fx.SPEND_TX:
        return {
          title: 'Send AE',
          rows: [
            { label: 'To', value: fx.RECIPIENT, emphasis: true },
            { label: 'Amount', value: '3 AE', emphasis: true },
          ],
        };
      case fx.TOKEN_TRANSFER_TX:
        return {
          title: 'Send tokens',
          effect: 'Transfers tokens from your account to another account.',
          rows: [
            { label: 'To', value: fx.RECIPIENT, emphasis: true },
            { label: 'Amount', value: '5 (raw token units)', emphasis: true },
          ],
        };
      case fx.CAUTION_TX:
        return {
          title: 'Call a contract',
          caution: 'This calls a contract function that is not a recognised standard one.',
          rows: [{ label: 'Function', value: 'unrecognised (0xdeadbeef)' }],
        };
      case fx.PAYING_TX:
        return {
          title: 'Pay fees for another transaction',
          effect: 'You pay the network fee for the transaction shown below.',
          rows: [{ label: 'Payer', value: fx.SENDER, emphasis: true }],
          inner: {
            title: 'Send AE',
            rows: [{ label: 'To', value: fx.RECIPIENT, emphasis: true }],
          },
        };
      default:
        return null;
    }
  },
}));

const { requestUnlock, resetUnlockBroker, NO_PROMPT_MOUNTED } = await import('../../unlock-broker');
const { default: WalletSignPrompt } = await import('../WalletSignPrompt');

const KEK = { fake: 'kek' } as unknown as CryptoKey;
const recordWith = (...types: string[]) => ({
  v: 1, factors: types.map((type, i) => ({ id: `f${i}`, type })),
} as never);

const { RECIPIENT, SPEND_TX, TOKEN_TRANSFER_TX } = fx;
const SPEND_CONTEXT = {
  kind: 'transaction' as const,
  payload: SPEND_TX,
  networkId: 'ae_uat',
};

// An opaque string the decoder returns null for — must fail closed.
const UNDECODABLE_CONTEXT = {
  kind: 'transaction' as const,
  payload: 'tx_someopaquebase64payload',
  networkId: 'ae_uat',
};

type Context = Parameters<typeof requestUnlock>[1];

/**
 * Publish an unlock request. Wrapped in `act` because the broker delivers it to
 * the mounted host synchronously, which updates React state.
 */
const request = (record: never, context?: Context) => {
  let pending!: ReturnType<typeof requestUnlock>;
  act(() => { pending = requestUnlock(record, context); });
  return pending;
};

describe('WalletSignPrompt — per-signature unlock + WYSIWYS confirm', () => {
  beforeEach(() => {
    resetUnlockBroker();
    passphraseProvider.mockReset().mockResolvedValue({ factorId: 'f0', kek: KEK });
    passphraseFactory.mockReset(); // restores the vi.fn implementation above
    passkeyProvider.mockReset().mockResolvedValue({ factorId: 'f1', kek: KEK });
    recoveryProvider.mockReset().mockResolvedValue({ factorId: 'f2', kek: KEK });
  });

  afterEach(() => resetUnlockBroker());

  it('renders nothing until a signature is requested', () => {
    const { container } = render(<WalletSignPrompt />);
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('is the mounted prompt host: signing fails closed until it is mounted', async () => {
    // No host mounted → the signer must fail closed rather than hang. This is the
    // erosion guard for the standalone signing path: if the wiring stops mounting
    // a real prompt, every signature rejects here instead of prompting.
    await expect(requestUnlock(recordWith('passphrase'), SPEND_CONTEXT))
      .rejects.toThrow(NO_PROMPT_MOUNTED);

    // The real component, once mounted, IS a host: the same request is delivered
    // and held for user verification instead of failing closed.
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    await screen.findByText(/confirm this transaction/i);
    pending.catch(() => {});
  });

  it('decodes the transaction and shows the raw bytes before any KEK is released', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    await screen.findByText(/confirm this transaction/i);
    // Decoded, human-readable rows — not raw bytes.
    expect(screen.getByText('Send AE')).toBeInTheDocument();
    expect(screen.getByText('3 AE')).toBeInTheDocument();
    expect(screen.getByText(RECIPIENT)).toBeInTheDocument();
    // The exact bytes stay available as ground truth, and the network is shown.
    expect(screen.getByText(SPEND_TX)).toBeInTheDocument();
    expect(screen.getByText(/ae_uat/)).toBeInTheDocument();
    expect(settled).toBe(false);

    pending.catch(() => {});
  });

  it('FAILS CLOSED on an undecodable transaction — warns and offers no approval path', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'webauthn-prf'), UNDECODABLE_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    await screen.findByText(/could not be decoded/i);
    // No verification controls at all — the only action is Cancel.
    expect(screen.queryByLabelText(/passphrase/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /approve & sign/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /unlock with this device/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    // The raw bytes are still there for inspection.
    expect(screen.getByText(UNDECODABLE_CONTEXT.payload)).toBeInTheDocument();
    expect(settled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await expect(pending).rejects.toThrow(/cancelled/i);
  });

  it('names a token transfer contract call and lets the user approve it', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), {
      kind: 'transaction', payload: TOKEN_TRANSFER_TX, networkId: 'ae_uat',
    });

    await screen.findByText('Send tokens');
    expect(screen.getByText(RECIPIENT)).toBeInTheDocument();
    expect(screen.getByText('5 (raw token units)')).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText(/passphrase/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));
    await expect(pending).resolves.toEqual({ factorId: 'f0', kek: KEK });
  });

  it('shows a caution for an unrecognised contract call, but still allows approval', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), { kind: 'transaction', payload: fx.CAUTION_TX });

    await screen.findByText(/not a recognised standard/i);
    // Decoded but unrecognised is still explainable, so approval remains available.
    expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve & sign/i })).toBeInTheDocument();
    pending.catch(() => {});
  });

  it('surfaces the inner transaction of a PayingForTx the user actually consents to', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), { kind: 'transaction', payload: fx.PAYING_TX });

    await screen.findByText('Pay fees for another transaction');
    expect(screen.getByText(/transaction being paid for/i)).toBeInTheDocument();
    // The inner tx (what is really being authorised) is rendered too.
    expect(screen.getByText('Send AE')).toBeInTheDocument();
    expect(screen.getByText(RECIPIENT)).toBeInTheDocument();
    pending.catch(() => {});
  });

  it('releases the KEK only after the user submits the passphrase', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);

    const field = await screen.findByLabelText(/passphrase/i);
    expect(passphraseProvider).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: 'correct horse battery staple' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));

    await expect(pending).resolves.toEqual({ factorId: 'f0', kek: KEK });
    expect(passphraseProvider).toHaveBeenCalledWith('correct horse battery staple');
  });

  it('offers the device unlock when a passkey factor is enrolled, and uses it', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'webauthn-prf'), SPEND_CONTEXT);

    fireEvent.click(await screen.findByRole('button', { name: /unlock with this device/i }));

    await expect(pending).resolves.toEqual({ factorId: 'f1', kek: KEK });
    expect(passkeyProvider).toHaveBeenCalled();
  });

  it('does not offer the device unlock when no passkey factor is enrolled', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    await screen.findByText(/confirm this transaction/i);

    expect(screen.queryByRole('button', { name: /unlock with this device/i })).toBeNull();
    pending.catch(() => {});
  });

  it('rejects the signature when the user cancels', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);

    fireEvent.click(await screen.findByRole('button', { name: /^cancel$/i }));

    await expect(pending).rejects.toThrow(/cancelled/i);
  });

  it('keeps the request open on a failed unlock so the user can retry', async () => {
    passphraseProvider.mockRejectedValueOnce(new Error('wrong passphrase'));
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    const field = await screen.findByLabelText(/passphrase/i);
    fireEvent.change(field, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));

    await screen.findByText(/wrong passphrase/i);
    expect(settled).toBe(false);

    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));
    await expect(pending).resolves.toEqual({ factorId: 'f0', kek: KEK });
  });

  it('shows a message payload verbatim', async () => {
    render(<WalletSignPrompt />);
    const pending = request(
      recordWith('passphrase'),
      { kind: 'message', payload: 'Login to Superhero at 2026-08-03' },
    );

    await screen.findByText(/sign this message/i);
    expect(screen.getByText('Login to Superhero at 2026-08-03')).toBeInTheDocument();
    pending.catch(() => {});
  });

  it('queues concurrent requests and confirms them one at a time', async () => {
    render(<WalletSignPrompt />);
    const first = request(recordWith('passphrase'), SPEND_CONTEXT);
    const second = request(recordWith('passphrase'), {
      ...SPEND_CONTEXT, payload: 'tx_thesecondone',
    });

    await screen.findByText(SPEND_TX);
    expect(screen.queryByText('tx_thesecondone')).toBeNull();
    expect(screen.getByText(/1 more request waiting/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await expect(first).rejects.toThrow(/cancelled/i);

    await screen.findByText('tx_thesecondone');
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await expect(second).rejects.toThrow(/cancelled/i);
  });

  it('FAILS CLOSED on unmount — a pending signature is rejected, not left hanging', async () => {
    const view = render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    await screen.findByText(/confirm this transaction/i);

    act(() => view.unmount());

    await expect(pending).rejects.toThrow(/no unlock prompt is mounted/i);
  });

  it('clears the typed passphrase between two consecutive requests', async () => {
    render(<WalletSignPrompt />);
    const first = request(recordWith('passphrase'), SPEND_CONTEXT);

    fireEvent.change(await screen.findByLabelText(/passphrase/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));
    await expect(first).resolves.toBeTruthy();

    const second = request(recordWith('passphrase'), SPEND_CONTEXT);
    await waitFor(() => expect(screen.getByLabelText(/passphrase/i)).toHaveValue(''));
    second.catch(() => {});
  });
});

describe('WalletSignPrompt — the prompt describes the grant it is asking for', () => {
  beforeEach(() => {
    resetUnlockBroker();
    passphraseProvider.mockReset().mockResolvedValue({ factorId: 'f0', kek: KEK });
    passphraseFactory.mockReset();
  });

  afterEach(() => resetUnlockBroker());

  it('does not claim a one-shot unlock when unlocking the chat session', async () => {
    // The regression this pins: the description was unconditional, so approving a
    // key cached for a rolling 30-minute window read as "nothing is kept unlocked
    // afterwards" — the opposite of what the user was granting.
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), { kind: 'chat-session', idleMinutes: 30 });

    expect(screen.getByText(/unlock chat/i)).toBeInTheDocument();
    expect(screen.getByText(/locks itself after 30 minutes idle/i)).toBeInTheDocument();
    expect(screen.queryByText(/one signature only/i)).toBeNull();

    pending.catch(() => {});
  });

  it('still claims a one-shot unlock for a real signature', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);

    expect(screen.getByText(/one signature only/i)).toBeInTheDocument();

    pending.catch(() => {});
  });

  it('shows no WYSIWYS payload box for a non-signing unlock', async () => {
    // There are no bytes to show, and rendering the box empty would imply there are.
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), { kind: 'nostr-link' });

    expect(screen.getByText(/link your chat identity/i)).toBeInTheDocument();
    expect(screen.queryByText(/show raw transaction/i)).toBeNull();

    pending.catch(() => {});
  });

  /**
   * The submit button is the last thing read before the grant is given, so it
   * has to agree with the heading and description above it. Keying it off the
   * PRESENCE of a context made every chat grant claim a signature — the one
   * claim those kinds exist to contradict.
   */
  it.each([
    ['chat-session', { kind: 'chat-session', idleMinutes: 30 }, /approve & unlock/i],
    ['nostr-link', { kind: 'nostr-link' }, /approve & link/i],
  ] as const)('does not offer to sign for a %s grant', async (_name, context, label) => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), context);

    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign/i })).toBeNull();

    pending.catch(() => {});
  });

  it('still offers to sign a real signature', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);

    expect(screen.getByRole('button', { name: /approve & sign/i })).toBeInTheDocument();

    pending.catch(() => {});
  });

  it('asks only to unlock when nothing is being granted', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'));

    const submit = screen.getByRole('button', { name: /^unlock$/i });
    expect(submit).toBeInTheDocument();

    pending.catch(() => {});
  });

  it('reports a provider that throws as it is built, rather than swallowing it', async () => {
    passphraseFactory.mockImplementationOnce(() => { throw new Error('secret is malformed'); });
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    fireEvent.change(await screen.findByLabelText(/passphrase/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));

    await screen.findByText(/secret is malformed/i);
    expect(settled).toBe(false);
    pending.catch(() => {});
  });
});

// A recovery code is 32 hex digits and worth nothing partial, so the form says how
// far along it is rather than leaving a greyed-out button unexplained.
describe('WalletSignPrompt — recovery code entry', () => {
  beforeEach(() => {
    resetUnlockBroker();
    recoveryProvider.mockReset().mockResolvedValue({ factorId: 'f2', kek: KEK });
  });

  afterEach(() => resetUnlockBroker());

  const toRecoveryMode = async () => {
    fireEvent.click(await screen.findByRole('button', { name: /use my recovery code instead/i }));
    return screen.findByLabelText(/recovery code/i);
  };

  it('counts the digits and keeps approval disabled until the code is complete', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'recovery-code'), SPEND_CONTEXT);

    fireEvent.change(await toRecoveryMode(), { target: { value: 'DEAD-BE' } });

    expect(screen.getByText(/6 of 32 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve & sign/i })).toBeDisabled();
    expect(recoveryProvider).not.toHaveBeenCalled();

    pending.catch(() => {});
  });

  it('names an over-long code instead of counting past the target', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'recovery-code'), SPEND_CONTEXT);

    fireEvent.change(await toRecoveryMode(), { target: { value: '0'.repeat(33) } });

    expect(screen.getByText(/33 characters .* recovery code is 32/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve & sign/i })).toBeDisabled();

    pending.catch(() => {});
  });

  it('says the code is complete and releases the KEK once it is', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'recovery-code'), SPEND_CONTEXT);

    const code = 'DEAD-BEEF-DEAD-BEEF-DEAD-BEEF-DEAD-BEEF';
    fireEvent.change(await toRecoveryMode(), { target: { value: code } });

    expect(screen.getByText(/code complete/i)).toBeInTheDocument();
    const approve = screen.getByRole('button', { name: /approve & sign/i });
    expect(approve).toBeEnabled();

    fireEvent.click(approve);
    await expect(pending).resolves.toEqual({ factorId: 'f2', kek: KEK });
    expect(recoveryProvider).toHaveBeenCalledWith(code);
  });

  it('stays open with the error when the code is wrong', async () => {
    recoveryProvider.mockRejectedValueOnce(new Error('That recovery code is not right.'));
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase', 'recovery-code'), SPEND_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    fireEvent.change(await toRecoveryMode(), { target: { value: '0000-0000-0000-0000-0000-0000-0000-0000' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));

    await screen.findByText(/recovery code is not right/i);
    expect(settled).toBe(false);
    pending.catch(() => {});
  });
});
