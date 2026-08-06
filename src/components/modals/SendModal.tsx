import {
  useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { Encoded } from '@aeternity/aepp-sdk';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import AeButton from '../AeButton';
import { useAccount, useAeSdk } from '../../hooks';
import { useAddressByChainName, useChainName } from '../../hooks/useChainName';
import { Decimal } from '../../libs/decimal';
import { toAettos } from '../../libs/dex';
import { isAccountAddress } from '../../utils/address';

/**
 * Send sheet — the "move AE out" half of profile send/receive.
 *
 * Scope is native AE only. AEX-9 transfers need a contract call per token and a
 * different confirmation surface, so they are deliberately not here.
 *
 * Unlike TipModal this stays mounted across the signature: the inline PWA wallet
 * confirms in `WalletSignPrompt`, and keeping this open is what lets us show the
 * real outcome (hash / failure) instead of dropping the user back on the profile
 * with no receipt.
 */

/**
 * AE withheld by "Max" so the spend fee still has room. A spend costs on the
 * order of 1e-5 AE; 0.001 covers fee spikes without stranding a visible amount.
 */
const MAX_FEE_RESERVE_AE = '0.001';

/** Decimal places we will let a user enter — matches AE's 18-decimal base unit. */
const AE_DECIMALS = 18;

type SendState = 'idle' | 'signing' | 'sent';

const SendModal = ({
  toAddress,
  onClose,
}: {
  toAddress?: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { sdk, activeAccount, activeNetwork } = useAeSdk();
  const { decimalBalance, loadAccountData } = useAccount();

  const [recipient, setRecipient] = useState(toAddress || '');
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const recipientInputId = useId();
  const amountInputId = useId();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const trimmedRecipient = recipient.trim();
  const looksLikeName = trimmedRecipient.toLowerCase().endsWith('.chain');

  // Only ask the resolver when the input actually looks like a name — passing a
  // half-typed value would fire a lookup on every keystroke.
  const { address: nameAddress, isLoading: resolvingName } = useAddressByChainName(
    looksLikeName ? trimmedRecipient : undefined,
  );

  const resolvedRecipient = looksLikeName ? (nameAddress || '') : trimmedRecipient;
  const recipientValid = isAccountAddress(resolvedRecipient);
  const { chainName: recipientChainName } = useChainName(recipientValid ? resolvedRecipient : '');

  const sendingToSelf = recipientValid
    && !!activeAccount
    && resolvedRecipient === activeAccount;

  const amountNumber = Number(amount);
  const amountValid = !!amount && Number.isFinite(amountNumber) && amountNumber > 0;

  const insufficient = useMemo(() => {
    if (!amountValid) return false;
    try {
      return Decimal.from(amount).gt(decimalBalance);
    } catch {
      return true;
    }
  }, [amount, amountValid, decimalBalance]);

  const maxAmount = useMemo(() => {
    try {
      const spendable = decimalBalance.sub(MAX_FEE_RESERVE_AE);
      return spendable.gt(Decimal.ZERO) ? spendable.toString() : '0';
    } catch {
      return '0';
    }
  }, [decimalBalance]);

  // A `.chain` name that resolves to nothing is a distinct failure from a
  // malformed address — say which one it is rather than a generic "invalid".
  const recipientError = (() => {
    if (!trimmedRecipient || recipientValid) return null;
    if (looksLikeName) {
      return resolvingName ? null : t('common.modals.send.nameNotFound');
    }
    return t('common.modals.send.invalidRecipient');
  })();

  // `state !== 'idle'`, not just `'signing'`: once a spend has gone through, the
  // form still holds a valid recipient and amount, and a second tap would
  // broadcast the same transfer again. A sent sheet is a receipt, not a form.
  const disabled = !activeAccount
    || !recipientValid
    || !amountValid
    || insufficient
    || state !== 'idle';

  const handleSend = async () => {
    if (disabled) return;
    setState('signing');
    setError(null);
    setTxHash(null);
    try {
      const aettos = toAettos(amount, AE_DECIMALS);
      const res: any = await sdk.spend?.(
        aettos.toString() as any,
        resolvedRecipient as Encoded.AccountAddress,
      );
      if (!isMountedRef.current) return;
      setTxHash(res?.hash || res?.transactionHash || res?.tx?.hash || null);
      setState('sent');
      // The spent balance is now stale everywhere it is displayed (this sheet,
      // the profile stat, the header) — they all read the same atom.
      loadAccountData?.();
    } catch (e: any) {
      if (!isMountedRef.current) return;
      setError(e?.message || t('common.modals.send.failedToSend'));
      setState('idle');
    }
  };

  const explorerTxUrl = useMemo(() => {
    if (!txHash) return '';
    const base = activeNetwork?.explorerUrl?.replace(/\/$/, '') || '';
    return base ? `${base}/transactions/${txHash}` : '';
  }, [txHash, activeNetwork]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-4 mb-4 border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl">
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient( circle at 30% 30%, #1161FE 0%, rgba(17,97,254,0) 60% )' }}
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center">
            <ArrowUpRight className="w-5 h-5 text-[#5c9dff]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-lg font-semibold leading-tight">
              {t('common.modals.send.title')}
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              {t('common.modals.send.subtitle')}
            </div>
          </div>
        </div>
      </div>

      {/* Success state */}
      {state === 'sent' && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
          {t('common.modals.send.sentSuccessfully', { amount })}
          {explorerTxUrl && (
            <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline ml-1">
              {t('common.modals.tip.viewOnExplorer')}
            </a>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] backdrop-blur-lg grid gap-4">
        <label htmlFor={recipientInputId} className="grid gap-1.5">
          <span className="text-xs text-white/70">{t('common.modals.send.recipient')}</span>
          <input
            id={recipientInputId}
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={t('common.modals.send.recipientPlaceholder')}
            spellCheck={false}
            autoComplete="off"
            disabled={state !== 'idle'}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-[13px] break-all focus:border-[#4ecdc4] focus:outline-none disabled:opacity-60"
          />
          {resolvingName && (
            <span className="text-[11px] text-white/50">
              {t('common.modals.send.resolvingName')}
            </span>
          )}
          {recipientError && <span className="text-[11px] text-red-400">{recipientError}</span>}
          {sendingToSelf && (
            <span className="text-[11px] text-amber-300">
              {t('common.modals.send.sendingToSelf')}
            </span>
          )}
        </label>

        {recipientValid && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <AddressAvatarWithChainName
              address={resolvedRecipient}
              size={32}
              showAddressAndChainName={false}
              isHoverEnabled={false}
            />
            <div className="min-w-0">
              {recipientChainName && (
                <div className="text-white/90 text-xs font-semibold truncate">
                  {recipientChainName}
                </div>
              )}
              <div className="text-white/60 text-[11px] font-mono break-all leading-snug">
                {resolvedRecipient}
              </div>
            </div>
          </div>
        )}

        <label htmlFor={amountInputId} className="grid gap-1.5">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{t('common.modals.send.amountAe')}</span>
            <span>
              {t('common.labels.balance')}
              {': '}
              {decimalBalance.prettify()}
              {' AE'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={amountInputId}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={state !== 'idle'}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:border-[#4ecdc4] focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setAmount(maxAmount)}
              disabled={state !== 'idle'}
              className="shrink-0 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors disabled:opacity-60"
            >
              {t('common.modals.send.max')}
            </button>
          </div>
          {insufficient && (
            <span className="text-[11px] text-red-400">
              {t('common.modals.tip.insufficientBalance')}
            </span>
          )}
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <AeButton
          onClick={handleSend}
          disabled={disabled}
          loading={state === 'signing'}
          data-testid="send-submit"
          className="inline-flex items-center gap-2"
        >
          {state === 'signing' && <Loader2 className="w-4 h-4 animate-spin" />}
          {state === 'signing'
            ? t('common.modals.send.confirmInWallet')
            : t('common.buttons.send')}
        </AeButton>
        <AeButton variant="ghost" onClick={onClose} disabled={state === 'signing'}>
          {state === 'sent' ? t('common.buttons.close') : t('common.buttons.cancel')}
        </AeButton>
      </div>
    </div>
  );
};

export default SendModal;
