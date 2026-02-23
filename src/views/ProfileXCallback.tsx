import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SuperheroApi } from '@/api/backend';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useProfile } from '@/hooks/useProfile';
import { getAndClearXOAuthPKCE, isOurOAuthState } from '@/utils/xOAuth';

const ConfirmWalletStep = ({
  address,
  attestation,
  onDone,
  onError,
}: {
  address: string;
  attestation: any;
  onDone: () => void;
  onError: (msg: string) => void;
}) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { completeXWithAttestation } = useProfile(address);
  const [submitting, setSubmitting] = useState(false);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!attestation || !completeXWithAttestation || hasCalledRef.current) return;
    hasCalledRef.current = true;
    setSubmitting(true);
    completeXWithAttestation(attestation)
      .then(() => onDone())
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[x-callback] wallet confirm step failed', err);
        onError(err?.message || t('messages.failedToUpdateProfile'));
      })
      .finally(() => setSubmitting(false));
  }, [attestation, completeXWithAttestation, onDone, onError, t]);

  return (
    <div className="space-y-3">
      <p className="text-white/80">
        {submitting ? t('messages.xCallbackConfirmInWallet') : t('messages.xCallbackSuccess')}
      </p>
      {submitting && (
        <p className="text-white/60 text-sm">{t('messages.savingProfile')}</p>
      )}
      <button
        type="button"
        className="text-[var(--neon-teal)] underline"
        onClick={() => navigate(`/users/${address}`)}
      >
        {t('messages.xCallbackGoToProfile')}
      </button>
    </div>
  );
};

const ProfileXCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { activeAccount, addStaticAccount } = useAeSdk();
  const [status, setStatus] = useState<'loading' | 'confirm_wallet' | 'done' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [attestation, setAttestation] = useState<any>(null);
  const startedRef = useRef(false);

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
        const att = await SuperheroApi.createXAttestationFromCode(
          stored.address,
          code,
          stored.codeVerifier,
          stored.redirectUri,
        );
        setAttestation(att);
        setStatus('confirm_wallet');
      } catch (err: any) {
        // Helps debug post-redirect failures when UI only shows a short message.
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
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
      {status === 'loading' && (
        <p className="text-white/80">{t('messages.xCallbackExchanging')}</p>
      )}
      {status === 'confirm_wallet' && address && attestation && (
        <ConfirmWalletStep
          address={address}
          attestation={attestation}
          onDone={() => setStatus('done')}
          onError={(msg) => {
            setErrorMessage(msg);
            setStatus('error');
          }}
        />
      )}
      {status === 'done' && address && (
        <p className="text-white/80">
          {t('messages.xCallbackSuccess')}
          <button
            type="button"
            className="ml-2 underline text-[var(--neon-teal)]"
            onClick={() => navigate(`/users/${address}`)}
          >
            {t('messages.xCallbackGoToProfile')}
          </button>
        </p>
      )}
      {status === 'error' && (
        <>
          <p className="text-red-300 mb-4">{errorMessage}</p>
          <button
            type="button"
            className="text-white/80 underline"
            onClick={() => navigate('/')}
          >
            {t('buttons.close')}
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileXCallback;
