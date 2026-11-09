import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import BigNumber from 'bignumber.js';
import { CircleCheck } from 'lucide-react';
import {
  type ChainNameClaimStatusResponse,
  type ChainNameSponsorshipResponse,
  SuperheroApi,
} from '@/api/backend';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useClaimChainName } from '@/hooks/useClaimChainName';
import { useApplyPendingChainName } from '@/hooks/usePreferredChainName';
import { normalizeChainNameLabel } from '@/utils/chainNames';
import {
  computeSelfFundedClaimAe,
  getChainNameClaimValidationError,
  resolveClaimErrorMessage,
  resolveClaimNotificationStep,
} from '@/utils/claimChainName';
import {
  TxPayloadType,
  useTransactionNotification,
} from '@/features/transaction-notification';
import { track } from '@/lib/journey';
import Spinner from '@/components/Spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import './ChainNameStep.scss';

export type ChainNameStepResult = 'claimed' | 'submitted' | 'skipped';

type Props = {
  address: string;
  onDone: (result: ChainNameStepResult) => void;
  /** Debounce before the availability / price lookups run. */
  checkDelayMs?: number;
};

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error';
type Phase = 'form' | 'signing' | 'processing' | 'done';
type SelfFundedStep = 'preclaim' | 'claim' | 'update';

const SELF_FUNDED_STEPS: SelfFundedStep[] = ['preclaim', 'claim', 'update'];
const AE_PRECISION = 18;

/**
 * Onboarding step: pick and claim a .chain name right after the wallet is set
 * up. Uses the same claim hook and rules as the profile editor; "Later" always
 * lets onboarding finish.
 */
const ChainNameStep = ({ address, onDone, checkDelayMs = 500 }: Props) => {
  const { t } = useTranslation('common');
  const { sdk } = useAeSdk();
  const {
    canClaim,
    checkNameAvailability,
    claimSponsoredChainName,
    claimSelfFundedChainName,
  } = useClaimChainName(address);
  const {
    notifySubmitted, notifyPending, notifyConfirmed, notifyError,
  } = useTransactionNotification();
  const setChainNames = useSetAtom(chainNamesAtom);
  const applyPendingChainName = useApplyPendingChainName();

  const [value, setValue] = useState('');
  const [availability, setAvailability] = useState<Availability>('idle');
  const [checkedLabel, setCheckedLabel] = useState('');
  const [sponsorship, setSponsorship] = useState<ChainNameSponsorshipResponse | null>(null);
  const [balanceAettos, setBalanceAettos] = useState<BigNumber | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [signStep, setSignStep] = useState<SelfFundedStep | null>(null);
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);
  const [claimedName, setClaimedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const label = useMemo(() => normalizeChainNameLabel(value), [value]);
  const validationError = getChainNameClaimValidationError(label, t);
  const fullName = `${label}.chain` as `${string}.chain`;

  // Availability and sponsorship for the typed name, debounced, latest wins.
  useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (!label || validationError) {
      setAvailability('idle');
      setCheckedLabel('');
      setSponsorship(null);
      return undefined;
    }
    setAvailability('checking');
    setSponsorship(null);
    const timeoutId = window.setTimeout(() => {
      Promise.all([
        checkNameAvailability(label).then(
          (isAvailable): Availability => (isAvailable ? 'available' : 'taken'),
          (): Availability => 'error',
        ),
        SuperheroApi.checkChainNameSponsorship(label).catch(() => null),
      ]).then(([nextAvailability, nextSponsorship]) => {
        if (requestIdRef.current !== requestId) return;
        setAvailability(nextAvailability);
        setCheckedLabel(label);
        setSponsorship(nextSponsorship && typeof nextSponsorship.sponsorable === 'boolean'
          ? nextSponsorship
          : null);
      });
    }, checkDelayMs);
    return () => window.clearTimeout(timeoutId);
  }, [checkDelayMs, checkNameAvailability, label, validationError]);

  const isCurrent = checkedLabel === label && !validationError;
  const isAvailable = isCurrent && availability === 'available';
  const isSponsored = isAvailable && sponsorship?.sponsorable === true;
  const isPaid = isAvailable && sponsorship?.sponsorable === false;

  const priceAe = useMemo(() => {
    if (!isPaid) return null;
    try {
      return computeSelfFundedClaimAe(fullName);
    } catch {
      return null;
    }
  }, [fullName, isPaid]);

  // The wallet balance, read once a paid name is on screen.
  useEffect(() => {
    if (!isPaid || balanceAettos || !sdk || typeof (sdk as any).getBalance !== 'function') return;
    let cancelled = false;
    Promise.resolve((sdk as any).getBalance(address))
      .then((raw: unknown) => {
        if (!cancelled) setBalanceAettos(new BigNumber(String(raw ?? 0)));
      })
      .catch((balanceError: unknown) => {
        // A wallet that never received AE has no account on chain yet: that is a zero balance.
        const msg = balanceError instanceof Error ? balanceError.message : String(balanceError || '');
        if (!cancelled && /404|not found/i.test(msg)) setBalanceAettos(new BigNumber(0));
      });
    // eslint-disable-next-line consistent-return
    return () => { cancelled = true; };
  }, [address, balanceAettos, isPaid, sdk]);

  const balanceAe = balanceAettos ? balanceAettos.shiftedBy(-AE_PRECISION) : null;
  const notEnoughAe = Boolean(isPaid && priceAe && balanceAe && balanceAe.lt(priceAe));
  const priceLabel = priceAe ? priceAe.toFixed(4) : null;

  const showClaimed = useCallback((name: string) => {
    setChainNames((prev) => ({ ...prev, [address]: name }));
    applyPendingChainName(address, name);
  }, [address, applyPendingChainName, setChainNames]);

  const fail = useCallback((claimError: unknown) => {
    const msg = resolveClaimErrorMessage(claimError, t);
    notifyError(msg);
    if (!mountedRef.current) return;
    setError(msg);
    setPhase('form');
    setSignStep(null);
    setWaitingForNetwork(false);
  }, [notifyError, t]);

  const onClaim = async () => {
    if (!isAvailable || validationError || notEnoughAe || phase !== 'form') return;
    if (!canClaim) {
      setError(t('messages.connectWalletToClaimChainName'));
      return;
    }
    track('claim_account_open');
    setError(null);
    setPhase('signing');

    let resolved = sponsorship;
    if (!resolved) {
      try {
        resolved = await SuperheroApi.checkChainNameSponsorship(label);
      } catch {
        resolved = null;
      }
    }
    if (!resolved || typeof resolved.sponsorable !== 'boolean') {
      setError(t('messages.chainNameSponsorCheckFailed'));
      setPhase('form');
      return;
    }

    notifySubmitted({ type: TxPayloadType.ClaimChainName, name: label, step: 'wallet' });

    if (!resolved.sponsorable) {
      try {
        const result = await claimSelfFundedChainName({
          name: label,
          onSignatureRequest: (step) => {
            if (!mountedRef.current) return;
            setSignStep(step);
            setWaitingForNetwork(false);
          },
          onProcessing: () => {
            notifyPending({ type: TxPayloadType.ClaimChainName, name: label });
            if (mountedRef.current) setWaitingForNetwork(true);
          },
        });
        const name = String(result.name || fullName).toLowerCase();
        showClaimed(name);
        notifyConfirmed({ type: TxPayloadType.ClaimChainName, name: label });
        track('claim_account_done');
        if (!mountedRef.current) return;
        setClaimedName(name);
        setPhase('done');
      } catch (claimError) {
        fail(claimError);
      }
      return;
    }

    const pendingPayload = (status?: ChainNameClaimStatusResponse | null) => ({
      type: TxPayloadType.ClaimChainName,
      name: label,
      step: resolveClaimNotificationStep(status),
    });
    try {
      const finalStatus = await claimSponsoredChainName({
        name: label,
        onSubmitted: (status) => {
          notifyPending(pendingPayload(status));
          // Signed and queued: the rest happens on the server, so the user can go on.
          if (mountedRef.current) setPhase('processing');
        },
        onStatusChange: (status) => notifyPending(pendingPayload(status)),
      });
      const name = String(finalStatus.name || fullName).toLowerCase();
      showClaimed(name);
      notifyConfirmed({ type: TxPayloadType.ClaimChainName, name: label });
      track('claim_account_done');
      if (!mountedRef.current) return;
      setClaimedName(name);
      setPhase('done');
    } catch (claimError) {
      fail(claimError);
    }
  };

  const busy = phase === 'signing';
  const claimDisabled = busy || !isAvailable || Boolean(validationError) || notEnoughAe;

  let claimLabel = t('buttons.claimChainName');
  if (busy) claimLabel = t('messages.chainNameClaimLoading');
  else if (availability === 'checking') claimLabel = t('messages.chainNameClaimChecking');
  else if (isSponsored) claimLabel = t('chainNameStep.claimFree');
  else if (isPaid && priceLabel) claimLabel = t('chainNameStep.buyFor', { amount: priceLabel });

  let progress: string | null = null;
  if (busy && signStep) {
    progress = waitingForNetwork
      ? t('chainNameStep.waitingForNetwork')
      : t('chainNameStep.confirmStep', {
        step: SELF_FUNDED_STEPS.indexOf(signStep) + 1,
        total: SELF_FUNDED_STEPS.length,
      });
  } else if (busy) {
    progress = t('chainNameStep.confirmInWallet');
  }

  if (phase === 'done' || phase === 'processing') {
    return (
      <div className="ui-page chain-name-step" data-testid="chain-name-step">
        <div className="ui-panel p-5 text-center" role="status">
          <CircleCheck className="chain-name-step__ok mx-auto mb-3 h-8 w-8" aria-hidden="true" />
          <h2 className="ui-page-title !text-xl">
            {phase === 'done'
              ? t('chainNameStep.doneTitle', { name: claimedName })
              : t('chainNameStep.processingTitle', { name: fullName })}
          </h2>
          <p className="ui-page-description mt-2">
            {phase === 'done' ? t('chainNameStep.doneDesc') : t('messages.chainNameClaimProcessing')}
          </p>
          <button
            type="button"
            className="ui-primary ui-wrap-action mt-5 w-full px-4 font-semibold"
            onClick={() => onDone(phase === 'done' ? 'claimed' : 'submitted')}
          >
            {t('chainNameStep.continue')}
          </button>
        </div>
      </div>
    );
  }

  const inputId = 'onboarding-chain-name';
  const hintId = `${inputId}-hint`;
  const statusId = `${inputId}-status`;
  const tooShort = Boolean(label && /^[a-z0-9-]+$/.test(label) && label.length <= 12);

  let status: React.ReactNode = null;
  if (label && validationError) {
    status = (
      <span className="chain-name-step__warn">
        {tooShort
          ? t('messages.chainNameClaimLengthHint', { length: label.length })
          : validationError}
      </span>
    );
  } else if (availability === 'checking') {
    status = <span>{t('messages.chainNameClaimChecking')}</span>;
  } else if (isCurrent && availability === 'taken') {
    status = <span className="chain-name-step__bad">{t('messages.chainNameClaimNameTaken')}</span>;
  } else if (isCurrent && availability === 'error') {
    status = <span className="chain-name-step__bad">{t('messages.chainNameClaimUnavailable')}</span>;
  } else if (isAvailable) {
    status = <span className="chain-name-step__ok font-semibold">{t('labels.available')}</span>;
  }

  return (
    <div className="ui-page chain-name-step" data-testid="chain-name-step">
      <div className="ui-panel p-4 sm:p-5">
        <div className="mb-4 text-center">
          <h2 className="ui-page-title !text-xl">{t('chainNameStep.title')}</h2>
          <p className="ui-page-description mt-1">{t('chainNameStep.subtitle')}</p>
        </div>

        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
          {t('chainNameStep.inputLabel')}
        </label>
        {/* Names are Latin letters and digits: keep the field and its suffix LTR in Arabic too. */}
        <div className="relative" dir="ltr">
          <Input
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onClaim();
            }}
            placeholder={t('placeholders.claimChainName')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            disabled={busy}
            aria-describedby={`${hintId} ${statusId}`}
            aria-invalid={Boolean(label && (validationError || (isCurrent && availability === 'taken')))}
            className="chain-name-step__input h-11 pr-16 font-mono text-base"
          />
          <span className="chain-name-step__suffix pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-base md:text-sm">
            .chain
          </span>
        </div>
        <p id={hintId} className="ui-page-description mt-2 !text-xs">{t('chainNameStep.hint')}</p>

        <div id={statusId} className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-2 text-xs" aria-live="polite">
          <div className="min-w-0">{status}</div>
          {isSponsored && (
            <Badge className="chain-name-step__free border-transparent">{t('messages.chainNameSponsorFree')}</Badge>
          )}
          {isPaid && priceLabel && (
            <span className="chain-name-step__price font-semibold">
              {t('messages.chainNameSponsorPrice', { amount: priceLabel })}
            </span>
          )}
        </div>
        {isPaid && (
          <p className={`mt-1 text-xs ${notEnoughAe ? 'chain-name-step__bad' : 'ui-page-description !text-xs'}`}>
            {notEnoughAe && balanceAe
              ? t('chainNameStep.notEnoughAe', { balance: balanceAe.toFixed(4) })
              : t('messages.chainNameSponsorPriceHint')}
          </p>
        )}

        {progress && (
          <p className="chain-name-step__progress mt-3 flex items-center gap-2 text-xs" role="status">
            <Spinner className="h-4 w-4 shrink-0" />
            {progress}
          </p>
        )}
        {error && <p className="chain-name-step__bad mt-3 text-xs" role="alert">{error}</p>}

        <button
          type="button"
          className="ui-primary ui-wrap-action mt-4 inline-flex w-full items-center justify-center gap-2 px-4 font-semibold disabled:opacity-50"
          onClick={onClaim}
          disabled={claimDisabled}
        >
          {(busy || availability === 'checking') && <Spinner className="h-4 w-4" />}
          {claimLabel}
        </button>
        <button
          type="button"
          className="ui-secondary ui-wrap-action mt-2 w-full px-4 font-semibold"
          onClick={() => onDone('skipped')}
        >
          {t('chainNameStep.later')}
        </button>
        <p className="ui-page-description mt-2 text-center !text-xs">{t('chainNameStep.laterHint')}</p>
      </div>
    </div>
  );
};

export default ChainNameStep;
