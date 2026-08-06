import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  render, screen, fireEvent, act,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * ZIX-725 — the sign prompt must stay usable while a `ModalProvider` sheet is
 * open behind it.
 *
 * A signature is requested FROM a modal (Send), and that modal is a Radix
 * `Dialog` with `modal` defaulting to true. Radix then does four things to
 * everything outside its content, all of which land on a prompt that portals
 * itself straight into `<body>` as a sibling:
 *
 *  1. `document.body.style.pointerEvents = 'none'` (react-dismissable-layer) —
 *     every button in the prompt stops responding to taps.
 *  2. `FocusScope trapped` — focus is yanked back into the sheet, so the
 *     passphrase field cannot be typed into.
 *  3. `hideOthers()` — siblings are `aria-hidden`.
 *  4. `RemoveScroll` — touch-scrolling anything but the sheet is cancelled.
 *
 * That is the reported "sign dialog is kind of locked, I'm not able to press
 * anything". The fix is not to special-case Radix but to make the prompt a
 * layer in the same stack, so it is the one on top. These tests pin that: the
 * containment must be present (otherwise they would pass vacuously) AND the
 * prompt must be above it.
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

// The prompt fails closed on a transaction it cannot decode (ZIX-320): no
// unlock controls at all, only Cancel. These tests are about layering, not
// decoding, so the fixture payload gets a canned summary — otherwise there
// would be no Approve button and no passphrase field to assert on.
vi.mock('../../tx-summary', () => ({
  summarizeTransaction: (payload: string) => (payload === 'tx_spend_3ae' ? {
    title: 'Send AE',
    rows: [
      { label: 'To', value: 'ak_11111111111111111111111111111111273Yts', emphasis: true },
      { label: 'Amount', value: '3 AE', emphasis: true },
    ],
  } : null),
}));

const { requestUnlock, resetUnlockBroker } = await import('../../unlock-broker');
const { default: WalletSignPrompt } = await import('../WalletSignPrompt');

const KEK = { fake: 'kek' } as unknown as CryptoKey;
const RECORD = { v: 1, factors: [{ id: 'f0', type: 'passphrase' }] } as never;
const SPEND_CONTEXT = {
  kind: 'transaction' as const,
  payload: 'tx_spend_3ae',
  networkId: 'ae_uat',
};

/**
 * Is this element actually tappable? Mirrors what a real pointer does and what
 * `user-event` asserts: `pointer-events` inherits, so the nearest ancestor that
 * declares it wins. jsdom does no hit-testing and `fireEvent.click` ignores the
 * property entirely, so asking the question this way is the only way a jsdom
 * test can see the bug at all.
 */
const pointerEventsFor = (el: Element | null): string => {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const value = window.getComputedStyle(node).pointerEvents;
    if (value && value !== '') return value;
  }
  return 'auto';
};

/** The Send sheet, rendered exactly the way `ModalProvider` renders it. */
const OpenSheet = ({ children }: { children: React.ReactNode }) => (
  <Dialog.Root open>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[2001]" />
      <Dialog.Content className="fixed z-[2002]" aria-describedby={undefined}>
        <Dialog.Title>Send</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

const request = (context?: Parameters<typeof requestUnlock>[1]) => {
  let pending!: ReturnType<typeof requestUnlock>;
  act(() => { pending = requestUnlock(RECORD, context); });
  return pending;
};

describe('WalletSignPrompt over an open ModalProvider sheet (ZIX-725)', () => {
  beforeEach(() => {
    resetUnlockBroker();
    passphraseProvider.mockReset().mockResolvedValue({ factorId: 'f0', kek: KEK });
    passkeyProvider.mockReset();
    recoveryProvider.mockReset();
  });

  afterEach(() => resetUnlockBroker());

  it('the sheet really does disable pointers outside itself', async () => {
    render(<OpenSheet><button type="button">Send</button></OpenSheet>);
    await screen.findByRole('button', { name: 'Send' });

    // Guard for every other test in this file: if Radix ever stops doing this,
    // they would pass without proving anything.
    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('leaves every control in the prompt tappable', async () => {
    render(
      <OpenSheet>
        <WalletSignPrompt />
      </OpenSheet>,
    );
    const pending = request(SPEND_CONTEXT);
    pending.catch(() => {});

    const approve = await screen.findByRole('button', { name: /approve & sign/i });
    const cancel = screen.getByRole('button', { name: /^cancel$/i });
    const field = screen.getByLabelText(/passphrase/i);

    expect(pointerEventsFor(approve)).not.toBe('none');
    expect(pointerEventsFor(cancel)).not.toBe('none');
    expect(pointerEventsFor(field)).not.toBe('none');
  });

  it('does not let the sheet steal focus back off the passphrase field', async () => {
    render(
      <OpenSheet>
        <WalletSignPrompt />
      </OpenSheet>,
    );
    const pending = request(SPEND_CONTEXT);
    pending.catch(() => {});

    const field = await screen.findByLabelText(/passphrase/i);
    act(() => (field as HTMLInputElement).focus());

    expect(document.activeElement).toBe(field);
  });

  it('is not hidden from assistive tech by the sheet', async () => {
    render(
      <OpenSheet>
        <WalletSignPrompt />
      </OpenSheet>,
    );
    const pending = request(SPEND_CONTEXT);
    pending.catch(() => {});

    await screen.findByText(/confirm this transaction/i);
    const promptDialog = [...document.querySelectorAll('[role="dialog"]')]
      .find((el) => el.textContent?.includes('Confirm this transaction'));

    expect(promptDialog).toBeTruthy();
    for (let node = promptDialog!; node; node = node.parentElement as Element) {
      expect(node.getAttribute('aria-hidden')).not.toBe('true');
      if (node === document.body) break;
    }
  });

  it('still completes the signature from inside the sheet', async () => {
    render(
      <OpenSheet>
        <WalletSignPrompt />
      </OpenSheet>,
    );
    const pending = request(SPEND_CONTEXT);

    const field = await screen.findByLabelText(/passphrase/i);
    fireEvent.change(field, { target: { value: 'correct horse battery staple' } });
    fireEvent.click(screen.getByRole('button', { name: /approve & sign/i }));

    await expect(pending).resolves.toEqual({ factorId: 'f0', kek: KEK });
  });
});
