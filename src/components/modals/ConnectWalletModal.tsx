/**
 * The top-right "Connect wallet" modal.
 *
 * It is the onboarding modal. The two used to be byte-for-byte copies that had
 * to be edited in lockstep — one surface-rule change missed in one of them and
 * the header button and the feed prompt would offer different ways in. Keeping
 * the module (and its `connect-wallet` registration in App.tsx) preserves every
 * existing `openModal({ name: 'connect-wallet' })` call site.
 */
import OnboardingModal from './OnboardingModal';

export default OnboardingModal;
