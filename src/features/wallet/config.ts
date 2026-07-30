/**
 * Hard off-by-default switch for the inline (in-page) PWA wallet signer.
 *
 * P1 scope only: this flag exists so `AeSdkProvider`'s signer-factory swap
 * (see `makeSigner` in `src/context/AeSdkProvider.tsx`) can be wired and
 * tested while remaining completely dead in production. `EncryptedHdAccount`
 * (see `EncryptedHdAccount.ts`) holds no key and its sign methods only throw
 * a labelled "not implemented" error, so even if this flag were flipped on
 * today it could not sign anything real — but it is kept `false` regardless,
 * as the load-bearing gate for every later phase (P2+: real envelope crypto).
 *
 * Rules for this constant (do not violate):
 *  - It is a PLAIN literal `const` — never read from `import.meta.env`,
 *    `process.env`, a feature-flag service, or any other remote/runtime
 *    source. A flag an attacker (or a misconfigured build) could flip
 *    remotely is not a safety gate.
 *  - It is flipped to `true` ONLY inside test files (see
 *    `__tests__/AeSdkProvider.makeSigner.test.ts`), never in application
 *    code, never per-environment.
 *  - Turning this on for real users is a separate, gated decision (P2+ per
 *    the wallet build plan §8) that requires the P0
 *    prerequisites to be green and is not authorized by this file.
 */
export const INLINE_WALLET_ENABLED = false;
