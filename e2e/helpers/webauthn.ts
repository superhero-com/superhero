import type { Page } from '@playwright/test';

/**
 * A virtual platform authenticator, via Chrome DevTools Protocol.
 *
 * The passkey wallet cannot be exercised at all without one: headless Chromium
 * has no authenticator, so `isPlatformAuthenticatorAvailable()` is false and the
 * Passkey card renders disabled ("Not available on this device/browser"). The
 * virtual authenticator answers that probe and runs real `create()`/`get()`
 * ceremonies in-process.
 *
 * `hasPrf` is the load-bearing option. The wallet does not merely authenticate
 * with the passkey — it DERIVES the BIP39 seed from the credential's PRF output
 * (`features/wallet/passkey-seed.ts`), so an authenticator without PRF fails at
 * exactly the point the product depends on. Rather than probe for it separately,
 * `addVirtualAuthenticator` attempts PRF and reports what it got: enabling and
 * disabling the WebAuthn domain twice over two CDP sessions, which is what a
 * separate probe costs, crashed the page partway through a later ceremony.
 *
 * Note the RP ID: `webauthn.ts` pins it at BUILD time from VITE_WEBAUTHN_RP_ID,
 * never from `window.location`, so the dev server used by these tests has to be
 * started with a value that is a registrable suffix of its origin. Without that
 * every ceremony fails with "Passkeys aren't available on this domain" before
 * reaching any product logic. See the `webServer` block in playwright.config.ts.
 */

export interface VirtualAuthenticator {
  /** False when this Chrome build's virtual authenticator has no PRF extension. */
  prf: boolean;
  /** Remove the authenticator and disable the WebAuthn domain again. */
  dispose: () => Promise<void>;
}

const OPTIONS = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  automaticPresenceSimulation: true,
} as const;

/**
 * Attach a user-verifying platform authenticator to `page`, with PRF where the
 * browser supports it.
 *
 * `isUserVerified` + `automaticPresenceSimulation` mean the biometric prompt
 * auto-approves, which is what lets an unattended run complete a ceremony the
 * user would normally confirm with Face ID.
 */
export async function addVirtualAuthenticator(page: Page): Promise<VirtualAuthenticator> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');

  const add = (hasPrf: boolean) => cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { ...OPTIONS, hasPrf },
  } as never) as Promise<{ authenticatorId: string }>;

  let prf = true;
  let authenticatorId: string;
  try {
    ({ authenticatorId } = await add(true));
  } catch {
    prf = false;
    ({ authenticatorId } = await add(false));
  }

  return {
    prf,
    dispose: async () => {
      await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId } as never)
        .catch(() => {});
      await cdp.send('WebAuthn.disable').catch(() => {});
      await cdp.detach().catch(() => {});
    },
  };
}
