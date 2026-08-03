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
 * tests pin that contract, plus the fail-closed behaviours around it.
 *
 * The crypto providers are mocked — `factors`/`vault-record`/`wallet-lifecycle`
 * have their own suites, and Argon2id in a component test buys nothing. What is
 * exercised here is the component's own decision-making.
 */
const passphraseProvider = vi.fn();
const passkeyProvider = vi.fn();
const recoveryProvider = vi.fn();

vi.mock('../../wallet-lifecycle', () => ({
  hasFactor: (record: { factors: { type: string }[] }, type: string) => record.factors
    .some((f) => f.type === type),
  passphraseUnlockProvider: (secret: string) => () => passphraseProvider(secret),
  passkeyUnlockProvider: () => () => passkeyProvider(),
  recoveryUnlockProvider: (code: string) => () => recoveryProvider(code),
}));

const { requestUnlock, resetUnlockBroker } = await import('../../unlock-broker');
const { default: WalletSignPrompt } = await import('../WalletSignPrompt');

const KEK = { fake: 'kek' } as unknown as CryptoKey;
const recordWith = (...types: string[]) => ({
  v: 1, factors: types.map((type, i) => ({ id: `f${i}`, type })),
} as never);

const SPEND_CONTEXT = {
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
    passkeyProvider.mockReset().mockResolvedValue({ factorId: 'f1', kek: KEK });
    recoveryProvider.mockReset().mockResolvedValue({ factorId: 'f2', kek: KEK });
  });

  afterEach(() => resetUnlockBroker());

  it('renders nothing until a signature is requested', () => {
    const { container } = render(<WalletSignPrompt />);
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the exact payload and network before any KEK is released', async () => {
    render(<WalletSignPrompt />);
    const pending = request(recordWith('passphrase'), SPEND_CONTEXT);
    let settled = false;
    pending.then(() => { settled = true; }, () => { settled = true; });

    await screen.findByText(/confirm this transaction/i);
    // The raw bytes are always available, even when decoding fails.
    expect(screen.getByText(SPEND_CONTEXT.payload)).toBeInTheDocument();
    expect(screen.getByText(/ae_uat/)).toBeInTheDocument();
    // An opaque, undecodable payload must be called out — never rendered as a
    // clean summary the user would approve on trust.
    expect(screen.getByText(/could not be decoded/i)).toBeInTheDocument();
    expect(settled).toBe(false);

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

    await screen.findByText(SPEND_CONTEXT.payload);
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
