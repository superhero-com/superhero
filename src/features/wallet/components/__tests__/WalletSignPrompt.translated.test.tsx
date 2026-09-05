import React from 'react';
import {
  render, screen, act, fireEvent, waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * The crash `translationSafeChildren` defends against, reproduced end to end:
 * a passkey wallet enabling chat, where tapping "Approve & unlock" swaps the
 * lock icon for the spinner against a label the translator had already replaced.
 */
const passkeyProvider = vi.fn();

vi.mock('../../wallet-lifecycle', () => ({
  hasFactor: (record: { factors: { type: string }[] }, type: string) => record.factors
    .some((f) => f.type === type),
  passphraseUnlockProvider: () => () => Promise.resolve({ factorId: 'f0', kek: {} }),
  passkeyUnlockProvider: () => () => passkeyProvider(),
  recoveryUnlockProvider: () => () => Promise.resolve({ factorId: 'f0', kek: {} }),
}));

const { requestUnlock, resetUnlockBroker } = await import('../../unlock-broker');
const { default: WalletSignPrompt } = await import('../WalletSignPrompt');

// Every factor, so the invariant test below mounts every button in the prompt —
// the mode toggle only exists with both a passphrase and a recovery code.
const RECORD = {
  v: 1,
  factors: [
    { id: 'f0', type: 'webauthn-prf' },
    { id: 'f1', type: 'recovery-code' },
    { id: 'f2', type: 'passphrase' },
  ],
} as never;

/** What Chrome does: every text node becomes a `<font>` holding the translation. */
const translatePage = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n.textContent ?? '').trim()) texts.push(n as Text);
  }
  texts.forEach((text) => {
    const font = document.createElement('font');
    font.textContent = `[de] ${text.textContent}`;
    text.parentNode?.replaceChild(font, text);
  });
  return texts.length;
};

describe('WalletSignPrompt on a translated page', () => {
  beforeEach(() => {
    resetUnlockBroker();
    passkeyProvider.mockReset().mockResolvedValue({ factorId: 'f0', kek: {} });
  });
  afterEach(() => resetUnlockBroker());

  it('survives the icon→spinner swap after the translator rewrote the labels', async () => {
    render(<WalletSignPrompt />);
    let pending!: Promise<unknown>;
    act(() => { pending = requestUnlock(RECORD, { kind: 'chat-session', idleMinutes: 30 }); });
    pending.catch(() => {});

    const unlock = await screen.findByRole('button', { name: /unlock with this device/i });
    expect(translatePage()).toBeGreaterThan(0);

    // Never resolves: `busy` stays true, so the spinner swap has to commit.
    passkeyProvider.mockReturnValue(new Promise(() => {}));
    await act(async () => { fireEvent.click(unlock); });

    await waitFor(() => expect(unlock.querySelector('.animate-spin')).not.toBeNull());
  });

  it('keeps every label out of the buttons that swap an icon', async () => {
    render(<WalletSignPrompt />);
    let pending!: Promise<unknown>;
    act(() => { pending = requestUnlock(RECORD, { kind: 'chat-session', idleMinutes: 30 }); });
    pending.catch(() => {});
    await screen.findByRole('button', { name: /unlock with this device/i });

    // The invariant the fix rests on: no button mixes bare text with elements.
    const offenders = Array.from(document.querySelectorAll('button')).filter((btn) => {
      const kids = Array.from(btn.childNodes);
      const hasElement = kids.some((n) => n.nodeType === Node.ELEMENT_NODE);
      const hasText = kids.some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim());
      return hasElement && hasText;
    });

    expect(offenders.map((b) => b.textContent)).toEqual([]);
  });
});
