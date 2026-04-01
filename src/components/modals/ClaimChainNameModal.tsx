import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { type ChainNameClaimStatusResponse } from '@/api/backend';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useClaimChainName } from '@/hooks/useClaimChainName';
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

const normalizeClaimChainName = (value: string) => value.trim().toLowerCase().replace(/\.chain$/u, '');
const stripApiErrorPrefix = (value: string) => value.replace(/^superhero api error \(\d+\):\s*/iu, '').trim();
const CLAIMABLE_CHAIN_NAME_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const AVAILABILITY_CHECK_DELAY_MS = 500;
const getSafeSdkAddress = (sdk: unknown) => {
  try {
    const value = (sdk as any)?.address;
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
};

type NameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable';

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
  const { activeAccount, aeSdk } = useAeSdk();
  const {
    claimSponsoredChainName,
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

  const [claiming, setClaiming] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<NameAvailabilityStatus>('idle');
  const [lastCheckedValue, setLastCheckedValue] = useState('');

  useEffect(() => {
    if (!open) {
      setClaiming(false);
      setValue('');
      setError(null);
      setAvailabilityStatus('idle');
      setLastCheckedValue('');
      return;
    }
    submittedRef.current = false;
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [open]);

  const normalizedValue = useMemo(() => normalizeClaimChainName(value), [value]);
  const normalizedValueLength = normalizedValue.length;
  const validateClaimChainName = (name: string): string | null => {
    if (!name) return t('messages.chainNameClaimRequired');
    if (!CLAIMABLE_CHAIN_NAME_LABEL_REGEX.test(name)) return t('messages.chainNameClaimInvalidChars');
    if (name.length <= 12) return t('messages.chainNameClaimTooShort');
    return null;
  };
  const validationError = validateClaimChainName(normalizedValue);
  const isTooShort = Boolean(normalizedValue && normalizedValueLength <= 12);

  const getClaimNotificationPayload = (
    name: string,
    claimStatus?: ChainNameClaimStatusResponse | null,
  ) => {
    const statusValue = String(claimStatus?.status || '').toLowerCase();
    let step: 'wallet' | 'queued' | 'preclaim' | 'claim' | 'update' | 'transfer' = 'queued';
    if (statusValue.includes('transfer')) step = 'transfer';
    else if (statusValue.includes('update')) step = 'update';
    else if (statusValue.includes('claim')) step = 'claim';
    else if (statusValue.includes('preclaim')) step = 'preclaim';
    else if (claimStatus?.transfer_tx_hash) step = 'transfer';
    else if (claimStatus?.update_tx_hash) step = 'update';
    else if (claimStatus?.claim_tx_hash) step = 'claim';
    else if (claimStatus?.preclaim_tx_hash) step = 'preclaim';
    return {
      type: TxPayloadType.ClaimChainName,
      name,
      step,
    };
  };

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

  const onClaim = async () => {
    try {
      const connectedAddress = activeAccount
        || getSafeSdkAddress(aeSdk);
      const targetAddress = (address as string) || connectedAddress;
      if (!targetAddress || !connectedAddress) {
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
                    const nextNormalizedValue = normalizeClaimChainName(nextValue);
                    const nextValidationError = validateClaimChainName(nextNormalizedValue);

                    setValue(nextValue);
                    setAvailabilityStatus(
                      nextNormalizedValue && !nextValidationError ? 'checking' : 'idle',
                    );
                    setLastCheckedValue('');
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
