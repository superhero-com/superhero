import React, {
  useMemo, useState, useRef, useEffect, useId,
} from 'react';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { encode, Encoded, Encoding } from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useAeSdk } from '../../hooks';
import { toAettos, fromAettos } from '../../libs/dex';
import { Decimal } from '../../libs/decimal';
import AeButton from '../AeButton';
import { IconDiamond } from '../../icons';
import { useChainName } from '../../hooks/useChainName';
import { tipStatusAtom, makeTipKey } from '../../atoms/tipAtoms';

const TipModal = ({
  toAddress,
  onClose,
  payload,
}: {
  toAddress: string;
  onClose: () => void;
  payload?: string;
}) => {
  const { sdk, activeAccount, activeNetwork } = useAeSdk();
  const { balance } = useAccount();
  const { chainName } = useChainName(toAddress);
  const [, setTipStatus] = useAtom(tipStatusAtom);
  const queryClient = useQueryClient();

  const aeBalanceAe = useMemo(() => {
    try {
      return Decimal.from(fromAettos(String(balance || 0), 18));
    } catch {
      return Decimal.from(0);
    }
  }, [balance]);

  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const amountInputId = useId();

  // Refs to track polling timers and component mount status
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMountedRef = useRef(true);

  // Cleanup effect to clear all timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const timeouts = timeoutRefs.current;
    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const insufficient = useMemo(() => {
    if (!amount) return false;
    const v = Number(amount);
    if (!Number.isFinite(v) || v <= 0) return true;
    try {
      return Decimal.from(amount).gt(aeBalanceAe);
    } catch {
      return true;
    }
  }, [amount, aeBalanceAe]);

  const disabled = !activeAccount || !amount || Number(amount) <= 0 || insufficient || sending;

  const handleQuick = (val: string) => setAmount(val);

  // removed Max button per request

  async function handleSend() {
    if (disabled) return;
    setSending(true);
    setError(null);
    setTxHash(null);
    // Close the tipping modal before opening the wallet confirmation to avoid stacked modals
    const value = toAettos(amount, 18);
    // Derive postId from payload when in TIP_POST mode so external button can reflect state
    const postIdForKey = (payload && payload.startsWith('TIP_POST:')) ? payload.split(':')[1] : '';
    const tipKey = postIdForKey ? makeTipKey(toAddress, postIdForKey) : '';
    if (tipKey) {
      setTipStatus((s) => ({ ...s, [tipKey]: { status: 'pending', updatedAt: Date.now() } }));
    }
    onClose();
    try {
      const res: any = await sdk.spend?.(
        value.toString() as any,
        toAddress as Encoded.AccountAddress,
        {
          payload: encode(new TextEncoder().encode(payload ?? 'TIP_PROFILE'), Encoding.Bytearray),
        },
      );
      const hash = res?.hash || res?.transactionHash || res?.tx?.hash || null;
      setTxHash(hash);
      if (tipKey) {
        setTipStatus((s) => ({
          ...s,
          [tipKey]: { status: 'success', updatedAt: Date.now() },
        }));
        // Ensure the button reflects the new total immediately by optimistically updating cache
        // Normalize postId the same way usePostTipSummary does to ensure cache key matches
        const normalizePostIdV3 = (postId: string): string => (
          String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`
        );
        const idV3 = postIdForKey ? normalizePostIdV3(postIdForKey) : null;
        if (idV3) {
          // Read the cache value ONCE before any optimistic updates to ensure accurate expectedTotal calculation
          // This prevents issues when multiple tips are sent rapidly - each tip calculates expectedTotal
          // based on the actual backend value, not an optimistically updated value from a previous tip
          const currentCacheData = queryClient.getQueryData<{ totalTips?: string }>(
            ['post-tip-summary', idV3],
          );
          const baseTotal = currentCacheData?.totalTips != null
            ? Number(currentCacheData.totalTips)
            : 0;
          const baseTotalNum = Number.isFinite(baseTotal) ? baseTotal : 0;
          const delta = Number(amount);
          const deltaNum = Number.isFinite(delta) ? delta : 0;

          // Calculate expectedTotal based on the base value (before optimistic update)
          const expectedTotal = baseTotalNum + deltaNum;

          // Optimistic bump: add the sent amount to current cached summary if present
          // This ensures immediate UI update before backend processes the transaction
          // Using updater function ensures React Query properly detects the change
          queryClient.setQueryData<{ totalTips?: string }>(
            ['post-tip-summary', idV3],
            (old) => {
              const currentNum = old?.totalTips != null ? Number(old.totalTips) : 0;
              const sum = (Number.isFinite(currentNum) ? currentNum : 0) + deltaNum;
              return { totalTips: String(sum) } as { totalTips?: string };
            },
          );

          // Poll backend until tip is confirmed or max retries reached
          // Backend needs time to process blockchain transaction and update database
          const maxRetries = 18; // Try for up to ~59 seconds (5s initial + 18 retries * 3 seconds)
          const retryInterval = 3000; // 3 seconds between retries

          const pollForTip = (attempt: number = 0) => {
            // Stop polling if component is unmounted
            if (!isMountedRef.current) {
              return;
            }

            if (attempt >= maxRetries) {
              // Final attempt after max retries
              if (isMountedRef.current) {
                queryClient.invalidateQueries({ queryKey: ['post-tip-summary', idV3] });
                queryClient.refetchQueries({
                  queryKey: ['post-tip-summary', idV3],
                  type: 'active',
                });
              }
              return;
            }

            const timeoutId = setTimeout(() => {
              // Remove timeout ID from tracking set
              timeoutRefs.current.delete(timeoutId);

              // Stop if component unmounted
              if (!isMountedRef.current) {
                return;
              }

              queryClient.invalidateQueries({ queryKey: ['post-tip-summary', idV3] });
              queryClient.refetchQueries({
                queryKey: ['post-tip-summary', idV3],
                type: 'active',
              }).then(() => {
                // Stop if component unmounted
                if (!isMountedRef.current) {
                  return;
                }

                // Check if backend has processed the tip
                const current = queryClient.getQueryData<{ totalTips?: string }>(['post-tip-summary', idV3]);
                const currentTotal = current?.totalTips != null ? Number(current.totalTips) : 0;

                // If backend total matches or exceeds expected, we're done
                // Otherwise, keep polling
                if (currentTotal >= expectedTotal) {
                  // Backend has confirmed the tip
                  return;
                }

                // Continue polling
                pollForTip(attempt + 1);
              }).catch(() => {
                // Stop if component unmounted
                if (!isMountedRef.current) {
                  return;
                }

                // On error, continue polling
                pollForTip(attempt + 1);
              });
            }, retryInterval);

            // Track timeout ID for cleanup
            timeoutRefs.current.add(timeoutId);
          };

          // Start polling after initial delay to give backend time to start processing
          const initialTimeoutId = setTimeout(() => {
            // Remove timeout ID from tracking set
            timeoutRefs.current.delete(initialTimeoutId);

            // Only start polling if component is still mounted
            if (isMountedRef.current) {
              pollForTip(0);
            }
          }, 5000); // 5 second initial delay before first poll

          // Track initial timeout ID for cleanup
          timeoutRefs.current.add(initialTimeoutId);
        }
        // Auto-reset success state after 2.5s
        const successResetTimeoutId = setTimeout(() => {
          timeoutRefs.current.delete(successResetTimeoutId);
          if (isMountedRef.current) {
            setTipStatus((s) => {
              const current = s[tipKey];
              if (!current || current.status !== 'success') return s;
              const next = { ...s } as any;
              delete next[tipKey];
              return next;
            });
          }
        }, 2500);
        timeoutRefs.current.add(successResetTimeoutId);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send tip.');
      if (tipKey) {
        setTipStatus((s) => ({ ...s, [tipKey]: { status: 'error', updatedAt: Date.now() } }));
        const errorResetTimeoutId = setTimeout(() => {
          timeoutRefs.current.delete(errorResetTimeoutId);
          if (isMountedRef.current) {
            setTipStatus((s) => {
              const current = s[tipKey];
              if (!current || current.status !== 'error') return s;
              const next = { ...s } as any;
              delete next[tipKey];
              return next;
            });
          }
        }, 2500);
        timeoutRefs.current.add(errorResetTimeoutId);
      }
    } finally {
      setSending(false);
    }
  }

  const explorerTxUrl = useMemo(() => {
    if (!txHash) return '';
    const base = activeNetwork?.explorerUrl?.replace(/\/$/, '') || '';
    return base ? `${base}/transactions/${txHash}` : '';
  }, [txHash, activeNetwork]);

  return (
    <div className="w-full">
      {/* Stylish header */}
      <div className="relative overflow-hidden rounded-2xl p-4 mb-4 border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl">
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient( circle at 30% 30%, #1161FE 0%, rgba(17,97,254,0) 60% )' }}
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center">
            <IconDiamond className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-lg font-semibold leading-tight">Send a tip</div>
            <div className="flex items-center gap-3 mt-2">
              <AddressAvatarWithChainName
                address={toAddress}
                size={36}
                showAddressAndChainName={false}
                isHoverEnabled={false}
              />
              <div className="min-w-0">
                {chainName && (
                  <div className="text-white/90 text-xs font-semibold truncate">{chainName}</div>
                )}
                <div className="text-white/60 text-[11px] break-all truncate">{toAddress}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success state */}
      {txHash && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
          Tip sent successfully.
          {explorerTxUrl && (
            <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline ml-1">View on explorer</a>
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
      <div className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] backdrop-blur-lg">
        <div className="flex items-center justify-between text-xs text-white/70 mb-2">
          <span>Balance</span>
          <span>
            {aeBalanceAe.prettify()}
            {' '}
            AE
          </span>
        </div>

        <div className="grid gap-2">
          <label htmlFor={amountInputId} className="grid gap-1">
            <span className="text-xs text-white/70">Amount (AE)</span>
            <div className="flex items-center gap-2">
              <input
                id={amountInputId}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:border-[#4ecdc4] focus:outline-none"
              />
            </div>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuick('1')}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >
              1 AE
            </button>
            <button
              type="button"
              onClick={() => handleQuick('10')}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >
              10 AE
            </button>
            <button
              type="button"
              onClick={() => handleQuick('100')}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >
              100 AE
            </button>
            <button
              type="button"
              onClick={() => handleQuick('500')}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >
              500 AE
            </button>
          </div>

          {insufficient && (
            <div className="text-xs text-red-400">Insufficient balance.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <AeButton onClick={handleSend} disabled={disabled} loading={sending}>
          {txHash ? 'Send again' : 'Send tip'}
        </AeButton>
        <AeButton variant="ghost" onClick={onClose}>
          {txHash ? 'Close' : 'Cancel'}
        </AeButton>
      </div>
    </div>
  );
};

export default TipModal;
