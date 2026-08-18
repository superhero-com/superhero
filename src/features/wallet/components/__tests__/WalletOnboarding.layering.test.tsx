import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * WalletOnboarding must stay usable while the modal that launched it is open
 * behind it.
 *
 * `PasskeyConnectCard` renders `WalletOnboarding` when the device has no vault
 * yet, and that card lives inside `ConnectWalletModal` / `OnboardingModal` —
 * both ModalProvider Radix `Dialog`s with `modal` defaulting to true. Radix then
 * does four things to everything outside the topmost modal's content, all of
 * which land on an overlay that portals itself straight into `<body>` as a
 * sibling:
 *
 *  1. `document.body.style.pointerEvents = 'none'` (react-dismissable-layer) —
 *     every button in onboarding stops responding to taps.
 *  2. `FocusScope trapped` — focus is yanked back into the sheet, so the
 *     passphrase field cannot be typed into.
 *  3. `hideOthers()` — siblings are `aria-hidden`.
 *  4. `RemoveScroll` — touch-scrolling anything but the sheet is cancelled.
 *
 * That is the reported "passkey login is behind the popup UI on mobile": the
 * takeover paints on top but is dead to input. Raising z-index cannot fix it —
 * the problem is layer identity, not paint order. These tests pin both halves:
 * the containment must really be present (otherwise they pass vacuously) AND
 * onboarding must be the layer that owns input.
 */

// jsdom has no WebAuthn; onboarding probes for a platform authenticator on mount.
vi.mock('../../webauthn', () => ({
  isPlatformAuthenticatorAvailable: () => Promise.resolve(true),
}));

// These tests are about LAYERING, not about which create path a surface offers.
// Pin the PWA (standalone) branch so the first screen is the seed flow's
// "Create a new wallet" — the web branch leads with "Continue with passkey"
// instead, and this file must not silently start asserting on a different
// button if that copy changes.
vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => true,
  isIOSWebKit: () => false,
  isMobileDevice: () => true,
}));

// Keep the vault/crypto layer out of a layering test — none of it is exercised
// on the first screen, but the module graph would pull in real WebCrypto.
vi.mock('../../vault-store', () => ({
  createIndexedDbVaultStore: () => ({
    load: () => Promise.resolve(null),
    save: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }),
}));
vi.mock('../../manifest-store', () => ({
  clearManifest: vi.fn(),
  manifestForFirstAccount: vi.fn(),
  saveManifest: vi.fn(),
}));

const { default: WalletOnboarding } = await import('../WalletOnboarding');

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

/** The connect sheet, rendered exactly the way `ModalProvider` renders it. */
const OpenSheet = ({ children }: { children: React.ReactNode }) => (
  <Dialog.Root open>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[2001]" />
      <Dialog.Content className="fixed z-[2002]" aria-describedby={undefined}>
        <Dialog.Title>Connect wallet</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

/** Onboarding's first screen offers Create / Import. */
// NOTE on how these tests see the bug: `getByRole` walks the accessibility
// tree, which excludes `aria-hidden` subtrees. Against the pre-fix component
// (a bare `createPortal` sibling) Radix's `hideOthers()` marks the whole
// takeover `aria-hidden`, so this query cannot find the button at all — the
// failure is symptom 3 above, not a flaky selector.
const findCreate = () => screen.findByRole('button', { name: /create a new wallet/i });

describe('WalletOnboarding over an open ConnectWalletModal sheet', () => {
  beforeEach(() => {
    document.body.style.pointerEvents = '';
  });

  it('the sheet really does disable pointers outside itself', async () => {
    render(<OpenSheet><button type="button">Connect</button></OpenSheet>);
    await screen.findByRole('button', { name: 'Connect' });

    // Guard for every other test in this file: if Radix ever stops doing this,
    // they would pass without proving anything.
    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('leaves the onboarding controls tappable', async () => {
    await act(async () => {
      render(
        <OpenSheet>
          <WalletOnboarding />
        </OpenSheet>,
      );
    });

    const create = await findCreate();

    expect(pointerEventsFor(create)).not.toBe('none');
  });

  it('does not let the sheet steal focus back off onboarding', async () => {
    await act(async () => {
      render(
        <OpenSheet>
          <WalletOnboarding />
        </OpenSheet>,
      );
    });

    const create = await findCreate();
    act(() => (create as HTMLButtonElement).focus());

    expect(document.activeElement).toBe(create);
  });

  it('is not hidden from assistive tech by the sheet', async () => {
    await act(async () => {
      render(
        <OpenSheet>
          <WalletOnboarding />
        </OpenSheet>,
      );
    });

    const create = await findCreate();

    for (let node: Element | null = create; node; node = node.parentElement) {
      expect(node.getAttribute('aria-hidden')).not.toBe('true');
      if (node === document.body) break;
    }
  });

  it('renders above the sheet it was launched from', async () => {
    await act(async () => {
      render(
        <OpenSheet>
          <WalletOnboarding />
        </OpenSheet>,
      );
    });

    const create = await findCreate();
    const takeover = create.closest('[role="dialog"]');
    expect(takeover).toBeTruthy();

    // The takeover must out-stack ModalProvider's z-[2002] content, and stay
    // below WalletSignPrompt's z-[2100] so a signature is never buried. jsdom
    // applies no stylesheet, so the Tailwind arbitrary-value class is the
    // assertable artifact here rather than a computed z-index.
    const z = Number.parseInt(
      /z-\[(\d+)\]/.exec(takeover!.className)?.[1]
        ?? window.getComputedStyle(takeover!).zIndex
        ?? '0',
      10,
    );
    expect(z).toBeGreaterThan(2002);
    expect(z).toBeLessThan(2100);
  });
});
