/**
 * Release switch for the inline wallet: a build-time decision about whether the
 * feature ships at all, not a runtime authorization check. Default OFF, and only
 * the exact string 'true' enables it, so a malformed value can't turn on custody.
 *
 * Off by default because it is the last backstop in front of real seed custody,
 * and the gates it waits on are still open at the time of writing: strict CSP is
 * Report-Only not enforced, the iOS on-device matrix (PRF availability, IndexedDB
 * survival past the 7-day ITP window) is unrun, and the seed-vault code has had
 * no red-team pass or independent review. Enabling it is a deploy decision, not a
 * side effect of merging.
 *
 * It does NOT strip the wallet from the build: an off build still emits the
 * `WalletOnboarding` and `wallet-lifecycle` chunks (verified). They are lazy and
 * unreferenced from the entry chunk, so they are never fetched — but they are
 * served, so don't treat "off" as "absent".
 */
export const INLINE_WALLET_ENABLED = import.meta.env.VITE_INLINE_WALLET === 'true';
