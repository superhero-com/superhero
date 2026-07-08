import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { XAddressLinkClaimResponse } from '@/api/backend';
import { SuperheroApi } from '@/api/backend';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useProfile } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { getAndClearXOAuthPKCE, isOurOAuthState } from '@/utils/xOAuth';

/**
 * Full-height, centered shell so every state shares the same clean layout.
 */
const CallbackShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1117]/60 backdrop-blur-xl p-8 text-center shadow-2xl shadow-black/40">
      {children}
    </div>
  </div>
);

const XGlyph = () => (
  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10">
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  </div>
);

/**
 * Wallet confirmation step. The signing transaction is triggered by a user
 * click (never automatically) so browsers / pop-up & ad blockers do not block
 * the wallet from opening. If it fails or is blocked the button re-enables so
 * the user can retry.
 */
const ConfirmWalletStep = ({
  address,
  claim,
  onDone,
}: {
  address: string;
  claim: XAddressLinkClaimResponse;
  onDone: () => void;
}) => {
  const { t } = useTranslation('common');
  const { completeXAddressLink } = useProfile(address);
  const [signing, setSigning] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (signing) return;
    setSigning(true);
    setError(null);
    setAttempted(true);
    try {
      await completeXAddressLink(claim);
      onDone();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[x-callback] wallet confirm step failed', err);
      setError((err as Error)?.message || t('messages.failedToUpdateProfile'));
    } finally {
      setSigning(false);
    }
  }, [claim, completeXAddressLink, onDone, signing, t]);

  return (
    <>
      <XGlyph />
      <h1 className="m-0 mb-3 text-xl font-bold text-white">
        {t('messages.xCallbackLinkingTitle')}
      </h1>
      <p className="m-0 mb-6 text-sm leading-relaxed text-white/60">
        {t('messages.xCallbackReadyDesc')}
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={signing}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white transition-all duration-200 hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {signing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('messages.xCallbackSigning')}
          </>
        ) : (
          attempted ? t('messages.xCallbackRetry') : t('messages.xCallbackConfirmButton')
        )}
      </button>

      {attempted && !signing && (
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          {t('messages.xCallbackBlockedHint')}
        </p>
      )}
    </>
  );
};

const ProfileXCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { activeAccount, addStaticAccount } = useAeSdk();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'confirm_wallet' | 'done' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [claim, setClaim] = useState<XAddressLinkClaimResponse | null>(null);
  const startedRef = useRef(false);

  const goToProfile = useCallback(() => {
    if (address) navigate(`/users/${address}`);
    else navigate('/');
  }, [address, navigate]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state || !isOurOAuthState(state)) {
      setErrorMessage(t('messages.xCallbackInvalidState'));
      setStatus('error');
      return;
    }

    const stored = getAndClearXOAuthPKCE();
    if (!stored || stored.state !== state) {
      setErrorMessage(t('messages.xCallbackInvalidState'));
      setStatus('error');
      return;
    }

    setAddress(stored.address);

    (async () => {
      try {
        if (!activeAccount || activeAccount !== stored.address) {
          await addStaticAccount(stored.address);
        }
        const nextClaim = await SuperheroApi.claimXAddressLinkFromCode(
          stored.address,
          code,
          stored.codeVerifier,
          stored.redirectUri,
        );
        setClaim(nextClaim);
        setStatus('confirm_wallet');
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[x-callback] failed before wallet confirm', err);
        setErrorMessage(err?.message || t('messages.failedXAttestation'));
        setStatus('error');
      }
    })();
  // Intentionally run only once per page load. Re-running after wallet state changes
  // would fail because PKCE state is consumed by getAndClearXOAuthPKCE().
  }, [searchParams, t, activeAccount, addStaticAccount]);

  return (
    <CallbackShell>
      {status === 'loading' && (
        <>
          <XGlyph />
          <h1 className="m-0 mb-3 text-xl font-bold text-white">
            {t('messages.xCallbackVerifyingTitle')}
          </h1>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('messages.xCallbackExchanging')}
          </div>
        </>
      )}

      {status === 'confirm_wallet' && address && claim && (
        <ConfirmWalletStep
          address={address}
          claim={claim}
          onDone={async () => {
            await queryClient.invalidateQueries({
              queryKey: ['AccountsService.getAccount', address],
            });
            setStatus('done');
          }}
        />
      )}

      {status === 'done' && (
        <>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--neon-teal)]/15 border border-[var(--neon-teal)]/30">
            <Check className="h-7 w-7" style={{ color: 'var(--neon-teal)' }} aria-hidden />
          </div>
          <h1 className="m-0 mb-3 text-xl font-bold text-white">
            {t('messages.xCallbackDoneTitle')}
          </h1>
          <p className="m-0 mb-6 text-sm text-white/60">
            {t('messages.xCallbackSuccess')}
          </p>
          <button
            type="button"
            onClick={goToProfile}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white transition-all duration-200 hover:bg-black/80"
          >
            {t('messages.xCallbackGoToProfile')}
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <XGlyph />
          <p className="m-0 mb-6 text-sm leading-relaxed text-red-300">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('messages.xCallbackGoBack')}
          </button>
        </>
      )}
    </CallbackShell>
  );
};

export default ProfileXCallback;
