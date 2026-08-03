/**
 * Hard off-by-default switch for the inline (in-page) PWA wallet signer.
 *
 * This is now a REAL gate, not a stub gate. Behind it sits the full inline
 * wallet: onboarding (`components/WalletOnboarding.tsx`), envelope-encrypted
 * seed custody (`vault*.ts`, `factors.ts`), the passkey/passphrase/recovery
 * unlock factors, the per-signature UV + WYSIWYS confirm
 * (`components/WalletSignPrompt.tsx`), and the signer install in
 * `makeSigner` (`src/context/AeSdkProvider.tsx`). With this `false` none of it
 * is reachable, mounted, or even fetched — every user keeps the existing
 * delegated (`superhero://` / `wallet.superhero.com` / extension) flow.
 *
 * Flipping it to `true` for real users is a funds-custody decision that is NOT
 * authorized by this file. It requires, per
 * the wallet build plan §7/§8 P5: strict CSP moved from
 * Report-Only to ENFORCED (CSP hardening), the on-device matrix (iOS installed-PWA
 * PRF availability + stability, IndexedDB survival across the ITP 7-day window,
 * UV-per-signature latency), a red-team pass showing a stored-XSS payload in the
 * feed cannot reach the signer, and SR's independent G4 review of the custody
 * code + threat model.
 *
 * Rules for this constant (do not violate):
 *  - It is a PLAIN literal `const` — never read from `import.meta.env`,
 *    `process.env`, a feature-flag service, or any other remote/runtime
 *    source. A flag an attacker (or a misconfigured build) could flip
 *    remotely is not a safety gate.
 *  - It is flipped to `true` ONLY inside test files (see
 *    `__tests__/AeSdkProvider.makeSigner.test.ts`), never in application
 *    code, never per-environment.
 *  - Turning this on for real users is the separate, gated decision described
 *    above — it is not authorized by this file.
 */
export const INLINE_WALLET_ENABLED = false;
