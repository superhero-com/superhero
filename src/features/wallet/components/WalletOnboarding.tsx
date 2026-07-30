import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, KeyRound, CircleCheck, Download, Lock, Loader2, Wallet, ChevronLeft,
  CircleAlert, type LucideIcon,
} from 'lucide-react';
import { generateMnemonic, isValidMnemonic, normalizeMnemonic } from '../mnemonic';
import { assessPassphrase } from '../passphrase';
import { importWallet } from '../wallet-lifecycle';
import { deriveAccount } from '../derivation';
import { createIndexedDbVaultStore } from '../vault-store';
import type { VaultStore } from '../vault-store';
import type { VaultRecord } from '../vault-record';

/**
 * P4/P3 — the inline-wallet onboarding flow (create / import + set passphrase).
 * Uses the tested crypto core via wallet-lifecycle. Forced-backup verification is
 * built in for the create path (threat-model R-04). No mnemonic/passphrase is
 * persisted in the clear — importWallet builds the encrypted vault.
 */

type Step =
  | 'exists'
  | 'choose'
  | 'create-show'
  | 'create-verify'
  | 'import-enter'
  | 'passphrase'
  | 'creating'
  | 'done';

const defaultStore = createIndexedDbVaultStore();

// Aligned to the app's AeCard `glass` variant tokens (bg-glass-bg / border-glass-border /
// shadow-glass / backdrop-blur-card) so the onboarding card matches the rest of the design system.
const card = 'relative overflow-hidden w-full max-w-md mx-auto rounded-2xl border bg-glass-bg '
  + 'border-glass-border shadow-glass backdrop-blur-card p-6';
// min-h-[44px] guarantees the Apple/Material minimum tap target on every interactive element.
const primaryBtn = 'w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium '
  + 'text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-pink-500/25';
const ghostBtn = 'w-full min-h-[44px] py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/80 text-sm '
  + 'hover:bg-white/[0.08] transition-colors';
// Aligned to the app's shadcn Input tokens (border-input / ring-ring / muted placeholder) so fields
// match the rest of the app and get a proper focus ring; subtle bg for legibility on the dark overlay.
const input = 'w-full min-h-[44px] rounded-lg border border-input bg-white/[0.04] px-3 py-3 text-sm text-white '
  + 'shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none '
  + 'focus-visible:ring-1 focus-visible:ring-ring';

// Stepper progress affordance (DESIGN-03). Monotonic along each path — create:
// show → verify → passphrase; import: enter → passphrase. Approximate fractions;
// drives the persistent top progress bar. choose/exists/done have no bar.
const STEP_PROGRESS: Partial<Record<Step, number>> = {
  'create-show': 0.25,
  'create-verify': 0.5,
  'import-enter': 0.34,
  passphrase: 0.75,
  creating: 0.9,
};

/** field-status colour: neutral while empty, green when ok, red when invalid. */
const fieldClass = (empty: boolean, ok: boolean): string => {
  if (empty) return 'text-white/40';
  return ok ? 'text-emerald-400' : 'text-rose-400';
};

// Brand icon chip above each step heading — design-system lucide-react (h-5 w-5) in a
// gradient-tinted rounded tile, so every step leads with a native onboarding-style glyph.
const IconChip = ({ icon: Icon, spin = false, tone = 'brand' }:
{ icon: LucideIcon; spin?: boolean; tone?: 'brand' | 'success' }) => {
  const tint = tone === 'success' ? 'from-emerald-500/15 to-green-500/15' : 'from-pink-500/15 to-purple-500/15';
  const color = tone === 'success' ? 'text-emerald-400' : 'text-pink-400';
  return (
    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${tint}`}>
      <Icon className={`h-5 w-5 ${color}${spin ? ' animate-spin' : ''}`} />
    </div>
  );
};

interface Props {
  store?: VaultStore;
  onComplete?: (record: VaultRecord, firstAddress: string) => void;
}

const WalletOnboarding = ({ store = defaultStore, onComplete }: Props) => {
  const [step, setStep] = useState<Step>('choose');
  const [mnemonic, setMnemonic] = useState('');
  const [importText, setImportText] = useState('');
  const [verifyIdx, setVerifyIdx] = useState<[number, number]>([0, 1]);
  const [verifyIn, setVerifyIn] = useState<[string, string]>(['', '']);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [firstAddr, setFirstAddr] = useState('');
  // Which path reached the passphrase step, so Back returns to the right previous screen.
  const [fromImport, setFromImport] = useState(false);

  useEffect(() => {
    store.load().then((r) => { if (r) setStep('exists'); }).catch(() => {});
  }, [store]);

  const startCreate = useCallback(() => {
    const m = generateMnemonic(12);
    setMnemonic(m);
    const a = Math.floor(Math.random() * 12);
    let b = Math.floor(Math.random() * 12);
    if (b === a) b = (b + 1) % 12;
    setVerifyIdx([Math.min(a, b), Math.max(a, b)]);
    setVerifyIn(['', '']);
    setStep('create-show');
  }, []);

  const importedOk = isValidMnemonic(importText);
  const passInfo = assessPassphrase(pass);
  const passesMatch = pass.length > 0 && pass === pass2;
  const progress = STEP_PROGRESS[step] ?? 0;
  // Back-nav target per step (null = no back: root, terminal, or in-flight). passphrase
  // returns to whichever path led here. choose/exists/creating/done have no back.
  let backTarget: Step | null = null;
  if (step === 'create-show' || step === 'import-enter') backTarget = 'choose';
  else if (step === 'create-verify') backTarget = 'create-show';
  else if (step === 'passphrase') backTarget = fromImport ? 'import-enter' : 'create-verify';

  let importMsg = 'Your phrase is checked locally on this device.';
  if (importText.length > 0) {
    importMsg = importedOk ? '✓ Valid recovery phrase' : '✗ Not a valid recovery phrase (check spelling / word count)';
  }

  const verifyOk = (() => {
    const words = mnemonic.split(' ');
    return normalizeMnemonic(verifyIn[0]) === words[verifyIdx[0]]
      && normalizeMnemonic(verifyIn[1]) === words[verifyIdx[1]];
  })();

  // Inline per-word validation for the backup-confirm step: green border when the typed
  // word matches, red when it doesn't, neutral while empty. Border-only (validity signal) so
  // it doesn't fight the shared input's focus ring; cn() lets it override the base border token.
  const wordBorder = (n: number): string => {
    if (verifyIn[n].length === 0) return '';
    const words = mnemonic.split(' ');
    return normalizeMnemonic(verifyIn[n]) === words[verifyIdx[n]]
      ? 'border-emerald-500/70'
      : 'border-rose-500/70';
  };

  const doCreate = useCallback(async () => {
    setError('');
    setStep('creating');
    try {
      const phrase = normalizeMnemonic(step === 'import-enter' ? importText : mnemonic);
      const record = await importWallet(store, { mnemonic: phrase, passphrase: pass, now: Date.now() });
      const { address } = deriveAccount(phrase, 0);
      setFirstAddr(address);
      setStep('done');
      onComplete?.(record, address);
    } catch (e) {
      setError((e as Error).message);
      setStep('passphrase');
    }
  }, [store, importText, mnemonic, pass, step, onComplete]);

  // Focus the step's primary field on entry — programmatic (callback ref), matching the
  // app's own pattern and avoiding the jsx-a11y/no-autofocus DOM attribute. Fires on each
  // step's keyed remount; called with null on unmount (no-op).
  const focusOnMount = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    el?.focus();
  }, []);

  const overlay = (
    // Focused full-screen takeover: covers the app header, bottom tabs, and the
    // app-wide Install-App prompt so a secret-phrase / passphrase step is private
    // and native-feeling. Portalled to <body> (below) so it escapes the app's
    // stacking context and truly sits above ALL chrome. Safe-area padding for the
    // notch / home indicator. z-[1200] sits above the app's mobile-app-header /
    // mobile-app-footer (both z-[1100]).
    <div
      className="fixed inset-0 z-[1200] bg-[#0a0a0f] text-white overflow-y-auto touch-manipulation"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // Native-feel: kill the iOS grey tap flash, stop the rubber-band/pull-to-refresh
        // that reveals the page behind, and (touch-manipulation) drop the 300ms double-tap delay.
        WebkitTapHighlightColor: 'transparent',
        overscrollBehavior: 'contain',
      }}
    >
      <div className="min-h-full flex flex-col items-center justify-start px-4 pt-[9vh] pb-8">
        <div className="w-full max-w-md mx-auto">
          {/* Persistent Back nav — native multi-step affordance. Sibling of the keyed
            card so it doesn't remount; hidden on root/terminal/in-flight steps. Clears
            any error on the way back. */}
          {backTarget && (
          <button
            type="button"
            aria-label="Go back"
            onClick={() => { setError(''); setStep(backTarget as Step); }}
            className={'mb-2 -ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm '
              + 'text-muted-foreground transition-colors hover:text-white'}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          )}
          {/* Persistent stepper progress bar — sits above the card and animates its
            width across steps (DESIGN-03). Sibling of the keyed card so it doesn't
            remount, giving a smooth fill instead of a jump. */}
          {progress > 0 && (
          <div className="mb-3 h-1 w-full rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          )}
          {/* Keyed on `step` so each step remounts and replays the sheet-rise entrance —
            the app's own motion primitives (animate-in/fade/slide, matching dialog.tsx). */}
          <div key={step} className="animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ease-out">
            {step === 'exists' && (
            <div className={card}>
              <IconChip icon={Wallet} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-2">Wallet already set up</h2>
              <p className="text-sm text-muted-foreground mb-5">A wallet already exists on this device. Unlocking is the next screen.</p>
              <button type="button" className={ghostBtn} onClick={() => { store.clear().then(() => setStep('choose')); }}>
                Reset (dev) — clear this device&apos;s wallet
              </button>
            </div>
            )}

            {step === 'choose' && (
            <div className={card}>
              <IconChip icon={ShieldCheck} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-1">Set up your wallet</h2>
              <p className="text-sm text-muted-foreground mb-6">Your keys stay on this device, encrypted. Superhero never sees them.</p>
              <button type="button" className={`${primaryBtn} mb-3`} onClick={startCreate}>Create a new wallet</button>
              <button type="button" className={ghostBtn} onClick={() => { setImportText(''); setStep('import-enter'); }}>Import an existing wallet</button>
            </div>
            )}

            {step === 'create-show' && (
            <div className={card}>
              <IconChip icon={KeyRound} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-1">Write down your recovery phrase</h2>
              <p className="text-sm text-amber-300/90 mb-4">
                These 12 words are the only way to recover your wallet. Write them on paper, in order. Never share them or store them digitally.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {mnemonic.split(' ').map((w, i) => (
                  <div key={w + String(i)} className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <span className="text-white/30 mr-1">{i + 1}</span>
                    {w}
                  </div>
                ))}
              </div>
              <button type="button" className={primaryBtn} onClick={() => setStep('create-verify')}>I&apos;ve written them down</button>
            </div>
            )}

            {step === 'create-verify' && (
            <div className={card}>
              <IconChip icon={CircleCheck} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-1">Confirm your backup</h2>
              <p className="text-sm text-muted-foreground mb-5">Type the requested words to confirm you saved them.</p>
              {[0, 1].map((n) => (
                <div key={verifyIdx[n]} className="mb-3">
                  <label className="block text-xs text-muted-foreground mb-1" htmlFor={`vw${n}`}>{`Word #${verifyIdx[n] + 1}`}</label>
                  <input
                    id={`vw${n}`}
                    className={cn(input, wordBorder(n))}
                    value={verifyIn[n]}
                    ref={n === 0 ? focusOnMount : undefined}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setVerifyIn((prev) => (n === 0 ? [e.target.value, prev[1]] : [prev[0], e.target.value]))}
                  />
                </div>
              ))}
              <button type="button" className={`${primaryBtn} mt-2`} disabled={!verifyOk} onClick={() => { setFromImport(false); setStep('passphrase'); }}>
                {verifyOk ? 'Continue' : 'Words don’t match yet'}
              </button>
            </div>
            )}

            {step === 'import-enter' && (
            <div className={card}>
              <IconChip icon={Download} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-1">Import your wallet</h2>
              <p className="text-sm text-muted-foreground mb-4">Enter your 12- or 24-word recovery phrase, separated by spaces.</p>
              <textarea
                className={`${input} font-mono mb-2`}
                rows={3}
                value={importText}
                ref={focusOnMount}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="word1 word2 word3 …"
                onChange={(e) => setImportText(e.target.value)}
              />
              <p className={`text-xs mb-4 ${fieldClass(importText.length === 0, importedOk)}`}>
                {importMsg}
              </p>
              <button type="button" className={primaryBtn} disabled={!importedOk} onClick={() => { setFromImport(true); setStep('passphrase'); }}>Continue</button>
            </div>
            )}

            {step === 'passphrase' && (
            <div className={card}>
              <IconChip icon={Lock} />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-1">Set a passphrase</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This encrypts your wallet on this device. Use a long, high-entropy passphrase — not a short PIN. You&apos;ll enter it to sign.
              </p>
              <input className={`${input} mb-2`} type="password" value={pass} placeholder="passphrase" ref={focusOnMount} autoComplete="new-password" autoCapitalize="none" onChange={(e) => setPass(e.target.value)} />
              <p className={`text-xs mb-3 ${fieldClass(pass.length === 0, passInfo.ok)}`}>{pass.length === 0 ? '4+ words, or 12+ characters.' : passInfo.message}</p>
              <input className={`${input} mb-2`} type="password" value={pass2} placeholder="confirm passphrase" autoComplete="new-password" autoCapitalize="none" onChange={(e) => setPass2(e.target.value)} />
              {pass2.length > 0 && !passesMatch && <p className="text-xs text-rose-400 mb-3">Passphrases don&apos;t match.</p>}
              {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              )}
              <button type="button" className={`${primaryBtn} mt-2`} disabled={!(passInfo.ok && passesMatch)} onClick={doCreate}>Create wallet</button>
            </div>
            )}

            {step === 'creating' && (
            <div className={card}>
              <IconChip icon={Loader2} spin />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-2">Encrypting your wallet…</h2>
              <p className="text-sm text-muted-foreground">Deriving your key (Argon2id). This takes a moment.</p>
            </div>
            )}

            {step === 'done' && (
            <div className={card}>
              <IconChip icon={CircleCheck} tone="success" />
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-2">Wallet ready 🎉</h2>
              <p className="text-sm text-muted-foreground mb-1">Your first account:</p>
              <p className="text-xs font-mono break-all text-emerald-400 mb-5">{firstAddr}</p>
              <button type="button" className={primaryBtn} onClick={() => onComplete?.(undefined as never, firstAddr)}>Open wallet</button>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the overlay escapes any transformed/stacking ancestor and
  // covers the app header + bottom tabs (SSR-safe: render inline if no document).
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default WalletOnboarding;
