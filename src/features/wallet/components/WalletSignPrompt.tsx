import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  CircleAlert, Fingerprint, Loader2, Lock, LifeBuoy, ShieldCheck,
} from 'lucide-react';
import {
  NO_PROMPT_MOUNTED, UNLOCK_CANCELLED, subscribeUnlockRequests, type UnlockRequest,
} from '../unlock-broker';
import {
  hasFactor, passkeyUnlockProvider, passphraseUnlockProvider, recoveryUnlockProvider,
} from '../wallet-lifecycle';
import { summarizeTransaction, type TxSummary } from '../tx-summary';
import type { UnlockProvider } from '../inline-signer';

/**
 * P4 integration — the in-page unlock + WYSIWYS confirmation surface.
 *
 * This component IS the security-relevant half of the `UnlockProvider` contract
 * (`inline-signer.ts`): the signer will not produce a signature until this
 * prompt returns a KEK, and this prompt does not return one until the user has
 * (a) seen a decoded description of the exact payload and (b) passed
 * user-verification — the device passkey ceremony, or re-entering the
 * passphrase. That happens on EVERY signature; there is no "unlock once, sign
 * many" path here, and adding one would collapse the custody model
 * (the custody decision / the threat model R-02).
 *
 * Honest limit, stated where the code lives (the wallet build plan §3.3): under same-origin
 * custody this dialog is only as trustworthy as the origin is free of injected
 * script. Script running on `superhero.com` controls the whole DOM and could
 * forge this surface. That is the accepted residual of the same-origin decision,
 * and the reason the P0 origin hardening — not this component — is the actual
 * boundary.
 *
 * Mounted only when the inline wallet is enabled (see `AeSdkProvider`), and
 * lazily imported so its dependencies never enter the main chunk.
 */

// Matches WalletOnboarding's design-system anchoring: AeCard `glass` tokens,
// shadcn Input tokens, 44px minimum tap targets.
const card = 'relative overflow-hidden w-full max-w-md mx-auto rounded-2xl border bg-glass-bg '
  + 'border-glass-border shadow-glass backdrop-blur-card p-6';
const primaryBtn = 'w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white font-medium '
  + 'text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-blue-500/25 '
  + 'inline-flex items-center justify-center gap-2';
const ghostBtn = 'w-full min-h-[44px] py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/80 text-sm '
  + 'hover:bg-white/[0.08] transition-colors inline-flex items-center justify-center gap-2';
const input = 'w-full min-h-[44px] rounded-lg border border-input bg-white/[0.04] px-3 py-3 text-sm text-white '
  + 'shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none '
  + 'focus-visible:ring-1 focus-visible:ring-ring';

/** Which unlock the user is currently typing into (the passkey needs no field). */
type Mode = 'passphrase' | 'recovery';

/**
 * Renders one decoded transaction (or, recursively, the inner transaction a
 * `PayingForTx` pays for). It renders only what `summarizeTransaction` could
 * decode; the fail-closed decision — whether the user is allowed to approve at
 * all — is made by the prompt, not here.
 */
const SummaryBlock = ({ summary, nested = false }: { summary: TxSummary; nested?: boolean }) => (
  <div className={nested ? 'mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5' : ''}>
    <p className="text-sm font-medium mb-1">{summary.title}</p>
    {summary.effect && <p className="text-xs text-white/70 mb-2">{summary.effect}</p>}
    {summary.caution && (
      <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-2 text-xs text-amber-300">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{summary.caution}</span>
      </div>
    )}
    <dl className="space-y-1.5">
      {summary.rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3">
          <dt className="text-xs text-muted-foreground shrink-0">{row.label}</dt>
          <dd className={cn(
            'text-xs font-mono break-all text-right',
            row.emphasis ? 'text-white' : 'text-white/70',
          )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
    {summary.inner && (
      <div className="mt-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          Transaction being paid for
        </p>
        <SummaryBlock summary={summary.inner} nested />
      </div>
    )}
  </div>
);

const WalletSignPrompt = () => {
  const [queue, setQueue] = useState<UnlockRequest[]>([]);
  const [mode, setMode] = useState<Mode>('passphrase');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const active = queue[0];

  // Mirror of `queue` readable from the unmount cleanup. A state updater is not
  // an option there: React discards updates queued on an unmounted component, so
  // rejecting from inside `setQueue` would silently never run and leave the
  // signature hanging forever — the exact opposite of failing closed.
  const queueRef = useRef<UnlockRequest[]>([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  useEffect(() => subscribeUnlockRequests((request) => {
    setQueue((prev) => [...prev, request]);
  }), []);

  // Fail closed on unmount: anything still pending is rejected rather than left
  // hanging, so the SDK surfaces an error instead of wedging mid-signature.
  useEffect(() => () => {
    queueRef.current.forEach((r) => r.reject(new Error(NO_PROMPT_MOUNTED)));
    queueRef.current = [];
  }, []);

  // Reset per-request UI state whenever a new request reaches the head of the
  // queue, so a typed passphrase can never leak across two confirmations.
  useEffect(() => {
    setSecret('');
    setError('');
    setBusy(false);
    setMode(active && hasFactor(active.record, 'passphrase') ? 'passphrase' : 'recovery');
  }, [active]);

  const dequeue = useCallback(() => {
    setSecret('');
    setQueue((prev) => prev.slice(1));
  }, []);

  const runUnlock = useCallback(async (provider: UnlockProvider) => {
    if (!active) return;
    setError('');
    setBusy(true);
    try {
      const result = await provider(active.record, active.context);
      active.resolve(result);
      dequeue();
    } catch (e) {
      // Stay on the prompt so the user can retry a mistyped passphrase or a
      // dismissed biometric prompt; the request is NOT settled here.
      setError((e as Error).message || 'Could not verify — try again.');
    } finally {
      setBusy(false);
    }
  }, [active, dequeue]);

  const cancel = useCallback(() => {
    if (!active) return;
    active.reject(new Error(UNLOCK_CANCELLED));
    dequeue();
  }, [active, dequeue]);

  if (!active) return null;

  const { context, record } = active;
  const canPasskey = hasFactor(record, 'webauthn-prf');
  const canPassphrase = hasFactor(record, 'passphrase');
  const canRecovery = hasFactor(record, 'recovery-code');
  const summary = context?.kind === 'transaction' ? summarizeTransaction(context.payload) : null;

  // Fail closed: a transaction we could not decode cannot be explained, so it
  // cannot be approved here. No user-verification controls are offered — only
  // Cancel — so there is no "show raw bytes and click anyway" path.
  const blockApproval = context?.kind === 'transaction' && !summary;

  let heading = 'Confirm it’s you';
  if (context?.kind === 'transaction') heading = 'Confirm this transaction';
  else if (context?.kind === 'message') heading = 'Sign this message';

  const submitSecret = () => runUnlock(
    mode === 'recovery' ? recoveryUnlockProvider(secret) : passphraseUnlockProvider(secret),
  );

  const overlay = (
    <div
      // Above every other surface, because a signature can be requested from any
      // of them: app chrome is z-[1100], the onboarding overlay z-[1200], and
      // ModalProvider's dialogs z-[2001]/z-[2002] — a Send sheet that stays open
      // across the signature would otherwise cover this prompt.
      className="fixed inset-0 z-[2100] bg-[#0a0a0f]/95 text-white overflow-y-auto touch-manipulation"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        WebkitTapHighlightColor: 'transparent',
        overscrollBehavior: 'contain',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div className="min-h-full flex flex-col items-center justify-start px-4 pt-[9vh] pb-8">
        <div key={active.id} className="w-full max-w-md mx-auto animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ease-out">
          <div className={card}>
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/15 to-blue-600/15">
              <ShieldCheck className="h-5 w-5 text-neon-blue" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight leading-none mb-1.5">{heading}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your wallet unlocks for this one signature only — nothing is kept unlocked afterwards.
            </p>

            {/* ---------- WYSIWYS: exactly what is about to be signed ---------- */}
            {context && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                {summary && <SummaryBlock summary={summary} />}
                {context.kind === 'transaction' && !summary && (
                  <div className="flex items-start gap-2 text-xs text-amber-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      This transaction could not be decoded, so its contents can&apos;t be shown —
                      and it can&apos;t be approved here. Cancel it, and only retry from a source you
                      trust.
                    </span>
                  </div>
                )}
                {context.kind === 'message' && (
                  <>
                    <p className="text-sm font-medium mb-2">Message</p>
                    <p className="text-xs font-mono break-all whitespace-pre-wrap text-white">{context.payload}</p>
                  </>
                )}
                {context.networkId && (
                  <p className="mt-2 pt-2 border-t border-white/10 text-[11px] text-muted-foreground">
                    Network:
                    {' '}
                    {context.networkId}
                  </p>
                )}
                {/* The exact bytes, always available — the summary is a convenience,
                    this is the ground truth the signature covers. */}
                {context.kind === 'transaction' && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-white/80">
                      Show raw transaction
                    </summary>
                    <p className="mt-1 text-[10px] font-mono break-all text-white/50">{context.payload}</p>
                  </details>
                )}
              </div>
            )}

            {/* ---------- User verification ---------- */}
            {/* Suppressed entirely when approval is blocked (undecodable tx): the
                only action then is Cancel. */}
            {!blockApproval && canPasskey && (
              <button type="button" className={`${primaryBtn} mb-3`} disabled={busy} onClick={() => runUnlock(passkeyUnlockProvider())}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                Unlock with this device
              </button>
            )}

            {!blockApproval && (canPassphrase || canRecovery) && (
              <>
                <label className="block text-xs text-muted-foreground mb-1" htmlFor="wallet-unlock-secret">
                  {mode === 'recovery' ? 'Recovery code' : 'Passphrase'}
                </label>
                <input
                  id="wallet-unlock-secret"
                  className={`${input} mb-2 ${mode === 'recovery' ? 'font-mono' : ''}`}
                  type={mode === 'recovery' ? 'text' : 'password'}
                  value={secret}
                  disabled={busy}
                  autoComplete={mode === 'recovery' ? 'off' : 'current-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={mode === 'recovery' ? 'XXXX-XXXX-…' : 'passphrase'}
                  onChange={(e) => setSecret(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && secret.length > 0 && !busy) submitSecret(); }}
                />
                <button type="button" className={`${canPasskey ? ghostBtn : primaryBtn} mb-2`} disabled={busy || secret.length === 0} onClick={submitSecret}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {context ? 'Approve & sign' : 'Unlock'}
                </button>
              </>
            )}

            {!blockApproval && canRecovery && canPassphrase && (
              <button
                type="button"
                className="mb-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-white/80 transition-colors"
                onClick={() => { setMode(mode === 'recovery' ? 'passphrase' : 'recovery'); setSecret(''); setError(''); }}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                {mode === 'recovery' ? 'Use my passphrase instead' : 'Use my recovery code instead'}
              </button>
            )}

            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="button" className={ghostBtn} disabled={busy} onClick={cancel}>Cancel</button>

            {queue.length > 1 && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                {`${queue.length - 1} more request${queue.length > 2 ? 's' : ''} waiting`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default WalletSignPrompt;
