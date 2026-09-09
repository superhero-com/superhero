/**
 * PasskeyConnectCard
 *
 * The inline-wallet option card in OnboardingModal and ConnectWalletModal: a
 * WebAuthn unlock where the vault has a passkey, a handoff to `WalletOnboarding`
 * everywhere else. `usePasskeyConnect` owns why.
 */

import React, { Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAeSdk } from '@/hooks';
import { hasDeviceVault, usePasskeyConnect, type DeviceWallet } from '@/hooks/usePasskeyConnect';
import { INLINE_WALLET_ENABLED } from '@/features/wallet/config';
import { isStandalone } from '@/utils/displayMode';

const WalletOnboarding = React.lazy(
  () => import('@/features/wallet/components/WalletOnboarding'),
);

const PasskeyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="21" cy="19" r="3" fill="currentColor" opacity="0.7" />
    <path d="M21 22v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type CardCopy = {
  available: boolean;
  state: string;
  errorMsg: string | null;
  deviceWallet: DeviceWallet;
  t: ReturnType<typeof useTranslation>['t'];
};

function getPasskeySubtitle({
  available, state, errorMsg, deviceWallet, t,
}: CardCopy): string {
  if (state === 'unlocking') {
    return t('common.modals.onboarding.passkeyUnlocking', { defaultValue: 'Waiting for biometric…' });
  }
  if (state === 'checking') {
    return t('common.modals.onboarding.passkeyChecking', { defaultValue: 'Checking…' });
  }
  // A failed ceremony is not a locked door while the vault holds other factors,
  // so say what the next tap does instead of leaving the error as the last word.
  // Same predicate as `onCardClick`, or the copy promises a tap that re-fails.
  if (state === 'error' && errorMsg) {
    return hasDeviceVault(deviceWallet)
      ? t('common.modals.onboarding.passkeyFailedFallback', { defaultValue: '{{errorMsg}} Tap to unlock another way.', errorMsg })
      : errorMsg;
  }
  if (state === 'cancelled') {
    return t('common.modals.onboarding.passkeyRetry', { defaultValue: 'Tap to try again' });
  }
  // This device's wallet has no passkey — offering one would promise a ceremony
  // that cannot run. Its passphrase still opens it, on the `exists` screen.
  if (deviceWallet === 'other-factors') {
    return t('common.modals.onboarding.deviceWalletDesc', { defaultValue: 'Continue with the wallet stored on this device' });
  }
  if (!available) {
    return t('common.modals.onboarding.passkeyUnavailable', { defaultValue: 'Not available on this device/browser' });
  }
  return t('common.modals.onboarding.passkeyDesc', { defaultValue: 'Face ID, Touch ID or device PIN — instant, no password' });
}

interface PasskeyConnectCardProps {
  onConnected: (address: string) => void;
}

const PasskeyConnectCard = ({ onConnected }: PasskeyConnectCardProps) => {
  const { t } = useTranslation();
  const { addStaticAccount } = useAeSdk();
  // Must agree with `makeSigner`: offering creation where the inline signer won't
  // install produced a real, fundable account whose every signature was routed to
  // the external wallet, which has never held that key.
  const inlineWalletAvailable = INLINE_WALLET_ENABLED && isStandalone();
  const {
    available,
    state,
    errorMsg,
    needsOnboarding,
    deviceWallet,
    connectedAddress,
    trigger,
    openDeviceWallet,
    resetOnboarding,
    loading,
  } = usePasskeyConnect(inlineWalletAvailable);

  // A proven passkey has to reach the caller, or the card is a dead end: the
  // ceremony ran, the vault opened, and nothing connected.
  // Latched against an unmemoised `onConnected`, which re-fires this effect and
  // would connect twice. Keyed on the address rather than a flag because
  // `resetOnboarding` nulls it, and re-proving the same wallet must still connect.
  const connectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!connectedAddress) {
      connectedRef.current = null;
      return;
    }
    if (connectedRef.current === connectedAddress) return;
    connectedRef.current = connectedAddress;
    addStaticAccount(connectedAddress);
    onConnected(connectedAddress);
  }, [connectedAddress, addStaticAccount, onConnected]);

  // After the hooks, so hook order stays unconditional.
  if (!inlineWalletAvailable) return null;

  const hasDeviceWallet = hasDeviceVault(deviceWallet);

  // ── Inline wallet: create one, or open the one already here ──────────────────
  if (needsOnboarding) {
    return (
      <div
        className="rounded-2xl border border-purple-500/20 overflow-hidden"
        style={{ background: 'rgba(139,92,246,0.06)' }}
      >
        <div className="p-4">
          <p className="text-sm font-semibold text-white mb-1">
            {hasDeviceWallet
              ? t('common.modals.onboarding.deviceWalletTitle', { defaultValue: 'Your Superhero Wallet' })
              : t('common.modals.onboarding.passkeySetupTitle', { defaultValue: 'Set up your Superhero Wallet' })}
          </p>
          <p className="text-xs text-white/60 mb-4">
            {hasDeviceWallet
              ? t('common.modals.onboarding.deviceWalletSetupDesc', { defaultValue: 'This device already has your wallet — pick up where you left off.' })
              : t('common.modals.onboarding.passkeySetupDesc', { defaultValue: 'Create a wallet secured by your device biometrics — no password needed.' })}
          </p>
          <Suspense
            fallback={(
              <div className="h-20 flex items-center justify-center">
                <svg className="animate-spin w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="30"
                    strokeDashoffset="10"
                  />
                </svg>
              </div>
            )}
          >
            <WalletOnboarding
              onComplete={(_record, address) => {
                resetOnboarding();
                if (address) {
                  addStaticAccount(address);
                  onConnected(address);
                }
              }}
            />
          </Suspense>
          <button
            type="button"
            onClick={resetOnboarding}
            className="mt-3 text-xs text-white/40 hover:text-white/60 border-0 bg-transparent cursor-pointer p-0"
          >
            {t('common.modals.onboarding.backToOptions', { defaultValue: '← Back to options' })}
          </button>
        </div>
      </div>
    );
  }

  // ── Inline wallet option card ────────────────────────────────────────────────
  const subtitle = getPasskeySubtitle({
    available, state, errorMsg, deviceWallet, t,
  });
  const subtitleColor = state === 'error' ? '#fbbf24' : 'rgba(255,255,255,0.5)';
  // A device wallet is reachable without a platform authenticator — its
  // passphrase opens it on the `exists` screen — so `available` may only gate
  // the passkey ceremony, never the card.
  const actionable = available || hasDeviceWallet;
  // Once the ceremony has failed, the tap must go somewhere it can still
  // succeed: the same handoff the no-passkey vault takes.
  const onCardClick = state === 'error' && hasDeviceWallet ? openDeviceWallet : trigger;
  const cardBg = actionable
    ? 'bg-gradient-to-r from-purple-600/15 to-blue-600/10 border border-purple-500/30 hover:from-purple-600/25 hover:to-blue-600/20 hover:border-purple-500/50 cursor-pointer'
    : 'bg-white/[0.03] border border-white/10 opacity-50 cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={actionable ? onCardClick : undefined}
      disabled={loading || !actionable}
      className={`relative flex items-center gap-4 w-full rounded-2xl p-4 text-left border-0 transition-all duration-200 ${cardBg}`}
      style={{ outline: 'none' }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(59,130,246,0.15))' }}
      >
        <span className="text-purple-400"><PasskeyIcon /></span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">
            {deviceWallet === 'other-factors'
              ? t('common.modals.onboarding.deviceWalletCardTitle', { defaultValue: 'This device’s wallet' })
              : t('common.modals.onboarding.passkeyTitle', { defaultValue: 'Passkey' })}
          </span>
          {actionable && state !== 'error' && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}
            >
              {t('common.modals.onboarding.recommended', { defaultValue: 'Recommended' })}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: subtitleColor }}>
          {subtitle}
        </p>
      </div>

      <div className="shrink-0 text-white/30">
        {loading ? (
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle
              cx="9"
              cy="9"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="22"
              strokeDashoffset="10"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M7 5l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
};

export default PasskeyConnectCard;
