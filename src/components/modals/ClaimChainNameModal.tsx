import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  buildTx,
  commitmentHash,
  getExecutionCost,
  getMinimumNameFee,
  unpackTx,
} from '@aeternity/aepp-sdk';
import BigNumber from 'bignumber.js';
import {
  type ChainNameClaimStatusResponse,
  type ChainNameSponsorshipResponse,
  SuperheroApi,
} from '@/api/backend';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { useClaimChainName } from '@/hooks/useClaimChainName';
import { resolveClaimNotificationStep } from '@/utils/claimChainName';
import { normalizeChainNameLabel } from '@/utils/chainNames';
import {
  TxPayloadType,
  useTransactionNotification,
} from '@/features/transaction-notification';
import { useToast } from '../ToastProvider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const stripApiErrorPrefix = (value: string) => value.replace(/^superhero api error \(\d+\):\s*/iu, '').trim();
const CLAIMABLE_CHAIN_NAME_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const AVAILABILITY_CHECK_DELAY_MS = 500;
const SPONSORSHIP_CHECK_DELAY_MS = 500;

// Stub values used to build throwaway transactions purely for fee/cost estimation.
const STUB_ADDRESS: `ak_${string}` = 'ak_11111111111111111111111111111111273Yts';
const STUB_NONCE = 1;
const STUB_NAME_SALT = 4204563566073083;
const AE_COIN_PRECISION = 18;

type NameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable';
type SponsorshipStatus = 'idle' | 'checking' | 'resolved';

/**
 * Total cost (in AE) the user pays to claim a name themselves: the preclaim transaction fee
 * plus the claim execution cost (which includes the minimum name fee). Mirrors the Superhero
 * Wallet's own claim screen so the displayed price matches what the wallet will charge.
 */
const computeSelfFundedClaimAe = (fullName: `${string}.chain`): BigNumber => BigNumber(
  unpackTx(
    buildTx({
      tag: Tag.NamePreclaimTx,
      accountId: STUB_ADDRESS,
      nonce: STUB_NONCE,
      commitmentId: commitmentHash(fullName, STUB_NAME_SALT),
    }),
    Tag.NamePreclaimTx,
  ).fee,
)
  .plus(
    getExecutionCost(
      buildTx({
        tag: Tag.NameClaimTx,
        accountId: STUB_ADDRESS,
        nonce: STUB_NONCE,
        name: fullName,
        nameSalt: 0,
        nameFee: getMinimumNameFee(fullName),
      }),
    ).toString(),
  )
  .shiftedBy(-AE_COIN_PRECISION);

export const resolveClaimErrorMessage = (
  claimError: unknown,
  t: (key: string) => string,
) => {
  const rawMessage = claimError instanceof Error ? claimError.message : String(claimError || '');
  const msg = stripApiErrorPrefix(rawMessage);
  const lower = msg.toLowerCase();

  if (
    lower.includes('429')
    || lower.includes('rate limit')
    || lower.includes('too many')
  ) return t('messages.tooManyRequests');

  if (
    lower.includes('rejected')
    || lower.includes('denied')
    || lower.includes('cancelled')
    || lower.includes('canceled')
  ) return t('messages.chainNameClaimRejected');

  if (lower.includes('timed out')) return t('messages.chainNameClaimTimedOut');

  if (
    lower.includes('connect your wallet')
    || lower.includes('connect the wallet for this profile')
    || lower.includes('you are not connected to wallet')
    || lower.includes('you are not subscribed for an account')
    || lower.includes('do not have access to account')
  ) return t('messages.connectWalletToClaimChainName');

  if (lower.includes('wallet message signing is not available')) {
    return t('messages.chainNameClaimWalletUnavailable');
  }

  if (
    lower.includes('already taken on-chain')
    || lower.includes('name is already taken')
  ) return t('messages.chainNameClaimNameTaken');

  if (lower.includes('already being claimed by another address')) {
    return t('messages.chainNameClaimNameInProgress');
  }

  if (lower.includes('already has an in-progress chain name claim')) {
    return t('messages.chainNameClaimAddressInProgress');
  }

  if (lower.includes('already has a claimed chain name')) {
    return t('messages.chainNameClaimAddressClaimed');
  }

  if (
    lower.includes('challenge has expired')
    || lower.includes('challenge expiry mismatch')
  ) return t('messages.chainNameClaimChallengeExpired');

  if (
    lower.includes('shorter than 13')
    || lower.includes('too short')
    || lower.includes('more than 12 characters')
  ) return t('messages.chainNameClaimTooShort');

  if (
    lower.includes('invalid challenge signature')
    || lower.includes('challenge proof is required')
  ) return t('messages.chainNameClaimVerificationFailed');

  if (
    lower.includes('claiming is not available at this time')
    || lower.includes('temporarily unavailable due to insufficient sponsor funds')
    || lower.includes('temporarily unavailable')
    || lower.includes('unable to verify chain name availability right now')
  ) return t('messages.chainNameClaimUnavailable');

  if (
    lower.includes('invalid address')
    || lower.includes('bad request')
  ) return t('messages.chainNameClaimRetry');

  return t('messages.chainNameClaimFailed');
};

const ClaimChainNameModal = ({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: string;
}) => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { push } = useToast();
  const {
    claimSponsoredChainName,
    claimSelfFundedChainName,
    claimAddress,
    canClaim,
    checkNameAvailability,
  } = useClaimChainName(address);
  const {
    notifySubmitted,
    notifyPending,
    notifyConfirmed,
    notifyError,
  } = useTransactionNotification();
  const setChainNames = useSetAtom(chainNamesAtom);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submittedRef = useRef(false);
  const availabilityRequestIdRef = useRef(0);
  const sponsorshipRequestIdRef = useRef(0);

  const [claiming, setClaiming] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<NameAvailabilityStatus>('idle');
  const [lastCheckedValue, setLastCheckedValue] = useState('');
  const [sponsorship, setSponsorship] = useState<ChainNameSponsorshipResponse | null>(null);
  const [sponsorshipStatus, setSponsorshipStatus] = useState<SponsorshipStatus>('idle');

  useEffect(() => {
    if (!open) {
      setClaiming(false);
      setValue('');
      setError(null);
      setAvailabilityStatus('idle');
      setLastCheckedValue('');
      setSponsorship(null);
      setSponsorshipStatus('idle');
      return;
    }
    submittedRef.current = false;
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [open]);

  const normalizedValue = useMemo(() => normalizeChainNameLabel(value), [value]);
  const normalizedValueLength = normalizedValue.length;
  const validateClaimChainName = (name: string): string | null => {
    if (!name) return t('messages.chainNameClaimRequired');
    if (!CLAIMABLE_CHAIN_NAME_LABEL_REGEX.test(name)) return t('messages.chainNameClaimInvalidChars');
    if (name.length <= 12) return t('messages.chainNameClaimTooShort');
    return null;
  };
  const validationError = validateClaimChainName(normalizedValue);
  const isTooShort = Boolean(normalizedValue && normalizedValueLength <= 12);

  // Price the user pays when claiming themselves (sponsor can't fund it), computed locally.
  const selfFundedPriceAe = useMemo(() => {
    if (!normalizedValue || validationError) return null;
    try {
      return computeSelfFundedClaimAe(`${normalizedValue}.chain`).toFixed(4);
    } catch {
      return null;
    }
  }, [normalizedValue, validationError]);

  const getClaimNotificationPayload = (
    name: string,
    claimStatus?: ChainNameClaimStatusResponse | null,
  ) => ({
    type: TxPayloadType.ClaimChainName,
    name,
    step: resolveClaimNotificationStep(claimStatus),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !claiming) onClose();
  };

  useEffect(() => {
    if (!open) return undefined;

    availabilityRequestIdRef.current += 1;
    const requestId = availabilityRequestIdRef.current;

    if (!normalizedValue || validationError) {
      setAvailabilityStatus('idle');
      setLastCheckedValue('');
      return undefined;
    }

    setAvailabilityStatus('checking');

    const timeoutId = window.setTimeout(() => {
      checkNameAvailability(normalizedValue)
        .then((isAvailable) => {
          if (availabilityRequestIdRef.current !== requestId) return;
          setLastCheckedValue(normalizedValue);
          setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
          if (isAvailable) {
            setError((currentError) => (
              currentError === t('messages.chainNameClaimNameTaken') ? null : currentError
            ));
            return;
          }
          setError(t('messages.chainNameClaimNameTaken'));
        })
        .catch(() => {
          if (availabilityRequestIdRef.current !== requestId) return;
          setLastCheckedValue(normalizedValue);
          setAvailabilityStatus('idle');
          setError((currentError) => (
            currentError === t('messages.chainNameClaimNameTaken') ? null : currentError
          ));
        });
    }, AVAILABILITY_CHECK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    checkNameAvailability,
    normalizedValue,
    open,
    t,
    validationError,
  ]);

  // Throttled check of whether the sponsor account can fund this name. Drives the
  // "Free" / price hint and decides whether the claim is sponsored or self-funded.
  useEffect(() => {
    if (!open) return undefined;

    sponsorshipRequestIdRef.current += 1;
    const requestId = sponsorshipRequestIdRef.current;

    if (!normalizedValue || validationError) {
      setSponsorship(null);
      setSponsorshipStatus('idle');
      return undefined;
    }

    setSponsorshipStatus('checking');

    const timeoutId = window.setTimeout(() => {
      SuperheroApi.checkChainNameSponsorship(normalizedValue)
        .then((result) => {
          if (sponsorshipRequestIdRef.current !== requestId) return;
          setSponsorship(result);
          setSponsorshipStatus('resolved');
        })
        .catch(() => {
          if (sponsorshipRequestIdRef.current !== requestId) return;
          setSponsorship(null);
          setSponsorshipStatus('idle');
        });
    }, SPONSORSHIP_CHECK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedValue, open, validationError]);

  const onClaim = async () => {
    try {
      const targetAddress = claimAddress;
      if (!targetAddress || !canClaim) {
        const msg = t('messages.connectWalletToClaimChainName');
        setError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        return;
      }

      if (validationError) {
        setError(validationError);
        push(<div style={{ color: '#ffb3b3' }}>{validationError}</div>);
        return;
      }

      submittedRef.current = false;
      setClaiming(true);
      setError(null);
      let isNameAvailable = availabilityStatus === 'available'
        && lastCheckedValue === normalizedValue;
      if (!isNameAvailable) {
        try {
          isNameAvailable = await checkNameAvailability(normalizedValue);
        } catch (availabilityError) {
          const msg = resolveClaimErrorMessage(availabilityError, t);
          setError(msg);
          notifyError(msg);
          push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
          setClaiming(false);
          return;
        }
      }
      if (!isNameAvailable) {
        const msg = t('messages.chainNameClaimNameTaken');
        setError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        setClaiming(false);
        return;
      }

      // Decide whether the backend sponsor can fund this name, or the user has to pay.
      // Prefer the throttled result for the current value; otherwise fetch on demand.
      let resolvedSponsorship = sponsorship && sponsorship.name === `${normalizedValue}.chain`
        ? sponsorship
        : null;
      if (!resolvedSponsorship) {
        try {
          resolvedSponsorship = await SuperheroApi.checkChainNameSponsorship(normalizedValue);
        } catch {
          resolvedSponsorship = null;
        }
      }

      // Require a definitive answer before choosing a path. If the check failed or returned
      // nothing, abort with a clear error instead of silently starting the sponsored flow
      // (which would either pay from a sponsor we couldn't verify, or fail mid-way).
      if (!resolvedSponsorship || typeof resolvedSponsorship.sponsorable !== 'boolean') {
        const msg = t('messages.chainNameSponsorCheckFailed');
        setError(msg);
        notifyError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        setClaiming(false);
        return;
      }

      if (!resolvedSponsorship.sponsorable) {
        // Self-funded path: run the standard AENS flow straight from the wallet.
        // Nothing is sent to the backend — the user pays the on-chain cost themselves.
        try {
          notifySubmitted({
            type: TxPayloadType.ClaimChainName,
            name: normalizedValue,
            step: 'wallet',
          });
          const result = await claimSelfFundedChainName({
            name: normalizedValue,
            onSignatureRequest: () => notifySubmitted({
              type: TxPayloadType.ClaimChainName,
              name: normalizedValue,
              step: 'wallet',
            }),
            onProcessing: () => notifyPending({
              type: TxPayloadType.ClaimChainName,
              name: normalizedValue,
            }),
          });
          const claimedName = String(result.name || `${normalizedValue}.chain`).trim().toLowerCase();
          setChainNames((prev) => ({
            ...prev,
            [targetAddress]: claimedName,
          }));
          queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', targetAddress] });
          queryClient.invalidateQueries({ queryKey: ['AccountsService.getAccount', targetAddress] });
          notifyConfirmed({
            type: TxPayloadType.ClaimChainName,
            name: normalizedValue,
          });
          push(<div>{t('messages.chainNameClaimCompleted')}</div>);
          onClose();
        } catch (selfFundedError) {
          const msg = resolveClaimErrorMessage(selfFundedError, t);
          setError(msg);
          notifyError(msg);
          push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        } finally {
          setClaiming(false);
        }
        return;
      }

      notifySubmitted({
        type: TxPayloadType.ClaimChainName,
        name: normalizedValue,
        step: 'wallet',
      });

      const claimPromise = claimSponsoredChainName({
        name: normalizedValue,
        onSubmitted: (claimStatus) => {
          submittedRef.current = true;
          setClaiming(false);
          notifyPending(getClaimNotificationPayload(normalizedValue, claimStatus));
          onClose();
        },
        onStatusChange: (claimStatus) => {
          notifyPending(getClaimNotificationPayload(normalizedValue, claimStatus));
        },
      });

      claimPromise.then((finalStatus) => {
        const claimedName = String(finalStatus.name || `${normalizedValue}.chain`).trim().toLowerCase();
        setChainNames((prev) => ({
          ...prev,
          [targetAddress]: claimedName,
        }));
        queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', targetAddress] });
        queryClient.invalidateQueries({ queryKey: ['AccountsService.getAccount', targetAddress] });
        notifyConfirmed({
          type: TxPayloadType.ClaimChainName,
          name: normalizedValue,
        });
        push(<div>{t('messages.chainNameClaimCompleted')}</div>);
      }).catch((claimError) => {
        const msg = resolveClaimErrorMessage(claimError, t);
        if (submittedRef.current) {
          notifyError(msg);
          push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
          return;
        }
        setError(msg);
        notifyError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
      }).finally(() => {
        if (!submittedRef.current) setClaiming(false);
      });
    } catch (claimError) {
      const msg = resolveClaimErrorMessage(claimError, t);
      setError(msg);
      notifyError(msg);
      push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
      setClaiming(false);
    }
  };

  const isCheckingAvailability = availabilityStatus === 'checking';
  const isCurrentNameUnavailable = Boolean(
    availabilityStatus === 'unavailable'
    && lastCheckedValue === normalizedValue,
  );
  const isClaimDisabled = Boolean(
    claiming
    || isCheckingAvailability
    || !canClaim
    || validationError
    || isCurrentNameUnavailable,
  );
  let claimButtonLabel = t('buttons.claimChainName');
  if (claiming) claimButtonLabel = t('messages.chainNameClaimLoading');
  else if (isCheckingAvailability) claimButtonLabel = t('messages.chainNameClaimChecking');

  const sponsorshipForCurrentName = sponsorshipStatus === 'resolved'
    && sponsorship
    && sponsorship.name === `${normalizedValue}.chain`
    ? sponsorship
    : null;
  // Only surface the price/free hint once the name is confirmed available to claim.
  const showSponsorshipHint = Boolean(
    sponsorshipForCurrentName
    && !validationError
    && availabilityStatus === 'available'
    && lastCheckedValue === normalizedValue,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] shadow-[var(--glass-shadow)]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {t('labels.claimChainName')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/60">{t('messages.chainNameClaimHint')}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    const nextNormalizedValue = normalizeChainNameLabel(nextValue);
                    const nextValidationError = validateClaimChainName(nextNormalizedValue);

                    setValue(nextValue);
                    setAvailabilityStatus(
                      nextNormalizedValue && !nextValidationError ? 'checking' : 'idle',
                    );
                    setLastCheckedValue('');
                    setSponsorship(null);
                    setSponsorshipStatus(
                      nextNormalizedValue && !nextValidationError ? 'checking' : 'idle',
                    );
                    if (error) setError(null);
                  }}
                  placeholder={t('placeholders.claimChainName')}
                  className={[
                    'pr-16 bg-white/7 text-white rounded-xl focus-visible:ring-0',
                    isTooShort
                      ? 'border border-amber-400/70 focus:border-amber-300'
                      : 'border border-white/14 focus:border-[var(--neon-teal)]',
                  ].join(' ')}
                  maxLength={64}
                  disabled={claiming}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/45">
                  .chain
                </span>
              </div>
              <Button
                type="button"
                className="bg-green-400 text-[#0a0a0a] hover:bg-green-300"
                onClick={onClaim}
                disabled={isClaimDisabled}
              >
                {claimButtonLabel}
              </Button>
            </div>
            {isTooShort && (
              <p className="mt-2 text-xs text-amber-300">
                {normalizedValueLength}
                /13 characters before `.chain`
              </p>
            )}
            {showSponsorshipHint && sponsorshipForCurrentName && (
              sponsorshipForCurrentName.sponsorable ? (
                <p className="mt-2 text-xs font-semibold text-green-400">
                  {t('messages.chainNameSponsorFree')}
                </p>
              ) : (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-amber-300">
                    {t('messages.chainNameSponsorPrice', {
                      amount: selfFundedPriceAe ?? '0',
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-300/70">
                    {t('messages.chainNameSponsorPriceHint')}
                  </p>
                </div>
              )
            )}
          </div>
          {error && (
            <div className="text-xs">
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimChainNameModal;
