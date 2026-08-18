import React, { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, KeyRound, CircleCheck, Download, Lock, Loader2, Wallet, ChevronLeft,
  CircleAlert, Trash2, Fingerprint, LifeBuoy, Copy, Sparkles, type LucideIcon,
} from 'lucide-react';
import AeButton, { type AeButtonProps } from '@/components/AeButton';
import { Button } from '@/components/ui/button';
import { AeCard } from '@/components/ui/ae-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isStandalone } from '@/utils/displayMode';
import { generateMnemonic, isValidMnemonic, normalizeMnemonic } from '../mnemonic';
import {
  assessPassphrase, generatePassphrase, isEstimatorReady, loadPassphraseEstimator,
} from '../passphrase';
import {
  addPasskeyFactor, addRecoveryCodeFactor, createWalletFromPasskey, importWalletWithDek,
  recordMnemonicBackedUp,
} from '../wallet-lifecycle';
import { isPlatformAuthenticatorAvailable } from '../webauthn';
import { clearManifest, manifestForFirstAccount, saveManifest } from '../manifest-store';
import { deriveAccount } from '../derivation';
import { createIndexedDbVaultStore } from '../vault-store';
import type { VaultStore } from '../vault-store';
import type { VaultRecord } from '../vault-record';

/**
 * P4/P3 — the inline-wallet onboarding flow.
 *
 * Order is load-bearing, not cosmetic (the wallet build plan §4.6): the written mnemonic is
 * shown and VERIFIED before any vault exists, then the passphrase factor creates
 * it, then the optional device passkey and the MANDATORY recovery code are
 * enrolled onto the already-unlocked DEK. Backup precedes custody because
 * IndexedDB eviction, a lost passphrase and Apple's PRF-rekey bug are each
 * individually unrecoverable if the only copy of the seed is the wrapped one
 * (the threat model R-04).
 *
 * Nothing here persists a mnemonic, passphrase, recovery code, or DEK in the
 * clear — `importWalletWithDek` builds the encrypted envelope, and the transient
 * DEK held in component state for the enrollment steps is dropped at `done`.
 */

type Step =
  | 'exists'
  | 'choose'
  | 'create-show'
  | 'create-verify'
  | 'import-enter'
  | 'passphrase'
  | 'creating'
  | 'protect'
  | 'recovery'
  | 'done';

const defaultStore = createIndexedDbVaultStore();

// Onboarding CTA colour, read off the shipped app: the primary/connect action is a
// solid #1161FE blue — SortControls "Tokenize Trend", PostForm's post button, the home page
// "CONNECT WALLET" bar — not a gradient and not --neon-blue. Kept in one place and matching the
// app's own bg-[#1161FE] convention; radius, hover-lift, focus ring, disabled and sizing all come
// from the AeButton design-system component.
const WALLET_CTA = 'bg-[#1161FE] text-white hover:bg-[#0e50d8]';

/** Full-width primary CTA — the DS AeButton wearing the app's #1161FE blue. */
const PrimaryButton = ({ className, children, ...props }: AeButtonProps) => (
  <AeButton variant="primary" fullWidth className={cn(WALLET_CTA, className)} {...props}>
    {children}
  </AeButton>
);

// Stepper progress affordance (DESIGN-03). Monotonic along each path — create:
// show → verify → passphrase; import: enter → passphrase. Approximate fractions;
// drives the persistent top progress bar. choose/exists/done have no bar.
const STEP_PROGRESS: Partial<Record<Step, number>> = {
  'create-show': 0.15,
  'create-verify': 0.3,
  'import-enter': 0.2,
  passphrase: 0.45,
  creating: 0.6,
  protect: 0.75,
  recovery: 0.9,
  done: 1,
};

/** field-status colour: neutral while empty, green when ok, red when invalid. */
const fieldClass = (empty: boolean, ok: boolean): string => {
  if (empty) return 'text-muted-foreground';
  return ok ? 'text-emerald-400' : 'text-rose-400';
};

// Four-segment strength meter driven by the zxcvbn score (0–4). Segments fill and
// take a colour band as the estimate climbs, so the weak-passphrase reject state is
// visible before the user submits rather than only as an error on the button.
const STRENGTH_FILL = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-[#1161FE]', 'bg-emerald-500'];
type StrengthMeterProps = { score: 0 | 1 | 2 | 3 | 4; pending?: boolean };
const StrengthMeter = ({ score, pending = false }: StrengthMeterProps) => (
  <div className="mb-2 flex gap-1" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => {
      // While the estimator loads, pulse a neutral fill — an empty meter reads as
      // "weak" and would wrongly push the user to retype a fine passphrase.
      const fill = pending ? 'bg-muted animate-pulse' : STRENGTH_FILL[score];
      const active = pending || i < score;
      return (
        <div
          key={i}
          className={cn('h-1 flex-1 rounded-full transition-colors', active ? fill : 'bg-muted')}
        />
      );
    })}
  </div>
);

// Brand icon chip above each step heading — design-system lucide-react (h-5 w-5) in a
// gradient-tinted rounded tile, so every step leads with a native onboarding-style glyph.
const IconChip = ({ icon: Icon, spin = false, tone = 'brand' }:
{ icon: LucideIcon; spin?: boolean; tone?: 'brand' | 'success' }) => {
  const tint = tone === 'success' ? 'from-emerald-500/15 to-green-500/15' : 'from-neon-blue/15 to-neon-blue/5';
  const color = tone === 'success' ? 'text-emerald-400' : 'text-neon-blue';
  return (
    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-glass-border bg-gradient-to-br ${tint}`}>
      <Icon className={`h-5 w-5 ${color}${spin ? ' animate-spin' : ''}`} />
    </div>
  );
};

// Shared heading + description tokens. text-xl gives the flow a confident, professional
// step title (DESIGN-02 type scale); descriptions use the muted-foreground token.
const heading = 'text-xl font-bold tracking-tight leading-none mb-1.5';
const description = 'text-sm text-muted-foreground mb-4';

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
  // Set when the user takes the recommended path and generates a passphrase, so it
  // can be shown in the clear for them to record (mirrors the mnemonic/recovery UX).
  const [generated, setGenerated] = useState('');
  const [genCopied, setGenCopied] = useState(false);
  const [error, setError] = useState('');
  const [firstAddr, setFirstAddr] = useState('');
  // Which path reached the passphrase step, so Back returns to the right previous screen.
  const [fromImport, setFromImport] = useState(false);
  // Did the user actually re-enter the two words? Only then may the vault claim a
  // VERIFIED written backup (`mnemonicBackedUpAt`). The import path sets it too —
  // the user supplied the phrase from their own backup, which is the same proof.
  const [backupVerified, setBackupVerified] = useState(false);
  // Enrollment state. `dek` is the transient unlocked Data-Encryption-Key: adding
  // any factor requires it by construction (vault-record.addFactor), and it is
  // held ONLY for the protect/recovery steps and dropped at `done`. It is never
  // persisted and must never be reused as a session unlock — the signer re-runs
  // user-verification on every signature (the custody decision / the threat model R-02).
  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);
  const [passkeyEnrolled, setPasskeyEnrolled] = useState(false);
  // Which surface is this? The seed-phrase flow (write it down, re-enter two
  // words) is PWA-only: in an installed app the wallet is the point, and the
  // user is committing to this device. In a browser tab the same six screens are
  // a wall in front of "just let me in", so web creates the wallet FROM the
  // passkey instead — same BIP39 seed, derived rather than transcribed
  // (`passkey-seed.ts`). Resolved after mount, not during render: the server has
  // no `display-mode` of its own, so deciding at render time would make the
  // hydrated tree disagree with the SSR'd one (mirrors UserProfile).
  const [seedFlow, setSeedFlow] = useState(false);
  useEffect(() => { setSeedFlow(isStandalone()); }, []);
  // Can this device create a passkey at all? Feature-detect only, never UA-sniff.
  // Gates the web path's primary CTA; when false the phrase flow is the only way
  // to create a wallet here, so it must not be hidden behind the passkey button.
  const [passkeySupported, setPasskeySupported] = useState(false);
  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setPasskeySupported).catch(() => {});
  }, []);
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [copied, setCopied] = useState(false);
  // Re-render trigger only: assessPassphrase reads the estimator's own module state,
  // so we just need a state change to re-run it once the load resolves OR fails.
  const [, bumpEstimator] = useState(0);
  const warmEstimator = useCallback(() => {
    if (isEstimatorReady()) return;
    loadPassphraseEstimator()
      .catch(() => {}) // failure is surfaced through assessPassphrase's `failed` state
      .finally(() => bumpEstimator((n) => n + 1));
  }, []);

  useEffect(() => {
    store.load().then((r) => { if (r) setStep('exists'); }).catch(() => {});
  }, [store]);

  // Warm the strength estimator as soon as onboarding opens — its dictionaries are a
  // separate lazy chunk, so this fetches them off the modal shell while the user is
  // still on the mnemonic/import steps, and the passphrase meter is live on arrival.
  useEffect(() => { warmEstimator(); }, [warmEstimator]);

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

  // Recommended path: fill both fields with a fresh strong passphrase and reveal it
  // so the user can write it down. Manual typing (below) clears the reveal.
  const handleGenerate = useCallback(() => {
    const g = generatePassphrase();
    setPass(g);
    setPass2(g);
    setGenerated(g);
    setGenCopied(false);
    setError('');
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
      // Select the phrase by the path that led here (fromImport), NOT `step` — by the time
      // Create is pressed `step` is 'passphrase', so keying off it always took the create
      // branch and made the import path fail with "Invalid mnemonic".
      const phrase = normalizeMnemonic(fromImport ? importText : mnemonic);
      const now = Date.now();
      const created = await importWalletWithDek(store, { mnemonic: phrase, passphrase: pass, now });
      // Only claim a VERIFIED written backup when one actually happened: the
      // create path re-entered two random words, or the import path supplied the
      // phrase from the user's own existing backup. If the confirm step was
      // skipped, the flag stays null — IndexedDB is evictable and this is the only
      // durable evidence the seed exists off-device (the threat model R-04), so recording it
      // optimistically would be a lie the app later relies on.
      const backed = backupVerified || fromImport
        ? await recordMnemonicBackedUp(store, created.record, now)
        : created.record;
      const { address } = deriveAccount(phrase, 0);
      // Cleartext manifest — public addresses only. This is what lets
      // `AeSdkProvider.makeSigner` recognise the account as an inline one and
      // install the in-page signer for it.
      saveManifest(manifestForFirstAccount(address));
      setRecord(backed);
      setDek(created.dek);
      setFirstAddr(address);
      // Feature-detect only, never UA-sniff: this boolean says "some
      // user-verifying platform authenticator exists", NOT which sensor it is.
      setDeviceUnlockAvailable(await isPlatformAuthenticatorAvailable());
      setStep('protect');
    } catch (e) {
      setError((e as Error).message);
      setStep('passphrase');
    }
  }, [store, importText, mnemonic, pass, fromImport, backupVerified]);

  /**
   * Generate the MANDATORY recovery code and enroll it as a factor. It is the
   * only unlock that survives both total device loss and an Apple PRF rekey, so
   * onboarding cannot reach `done` without it.
   *
   * Takes the DEK as an argument (defaulting to state) because the passkey-create
   * path calls this in the same tick it obtains the DEK, before the `setDek`
   * re-render has landed — reading state there would see `null` and silently skip
   * the enrollment, leaving a wallet with no recovery factor.
   */
  const goToRecovery = useCallback(async (current: VaultRecord, withDek?: CryptoKey) => {
    const key = withDek ?? dek;
    if (!key) return;
    setError('');
    setBusy(true);
    try {
      const added = await addRecoveryCodeFactor(store, current, key, Date.now());
      setRecord(added.record);
      setRecoveryCode(added.code);
      setStep('recovery');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [store, dek]);

  /**
   * DEVICE-GATED. Enroll a platform passkey and use its PRF output as a second
   * KEK for the same DEK. The OS decides which verification it shows — Face ID,
   * Touch ID, fingerprint or the device passcode — and the web platform gives us
   * no way to know or choose which, so the copy must never promise a named one.
   */
  const enrollDeviceUnlock = useCallback(async () => {
    if (!record || !dek) return;
    setError('');
    setBusy(true);
    try {
      const updated = await addPasskeyFactor(store, record, dek, {
        userId: crypto.getRandomValues(new Uint8Array(16)),
        // Shown in the OS passkey picker. The account address is public data —
        // never put anything else identifying here.
        userName: firstAddr,
        label: 'This device',
        now: Date.now(),
      });
      setRecord(updated);
      setPasskeyEnrolled(true);
      await goToRecovery(updated);
    } catch (e) {
      // Not fatal: the passphrase factor still protects the wallet, and this
      // device may simply not support PRF. Say so and let the user continue.
      setError(`Couldn’t set up device unlock: ${(e as Error).message}`);
      setBusy(false);
    }
  }, [store, record, dek, firstAddr, goToRecovery]);

  /**
   * DEVICE-GATED. The web (non-PWA) create path: one passkey ceremony produces
   * the wallet. The BIP39 seed is derived from the passkey's PRF output, so
   * there is nothing for the user to write down — it is recoverable from the
   * passkey itself, and still exportable from settings later.
   *
   * The mandatory recovery code is enrolled immediately after, exactly as on the
   * seed path: the passkey is the primary factor, the code is the escape hatch
   * for a lost device or an Apple PRF rekey (the threat model R-04).
   */
  const createWithPasskey = useCallback(async () => {
    setError('');
    setStep('creating');
    try {
      const now = Date.now();
      const created = await createWalletFromPasskey(store, { userName: 'Superhero wallet', now });
      const { address } = deriveAccount(created.mnemonic, 0);
      saveManifest(manifestForFirstAccount(address));
      setRecord(created.record);
      setDek(created.dek);
      setFirstAddr(address);
      setPasskeyEnrolled(true);
      setDeviceUnlockAvailable(true);
      // Straight to the recovery code: the passkey already IS the unlock, so the
      // `protect` step (which offers to add one) has nothing left to ask.
      await goToRecovery(created.record, created.dek);
    } catch (e) {
      setError((e as Error).message);
      setStep('choose');
    }
  }, [store, goToRecovery]);

  /**
   * Enrollment is complete. Drop every transient secret this component held —
   * the unlocked DEK, the mnemonic, the passphrase, the recovery code — so the
   * only place they exist afterwards is the encrypted vault (and, for the
   * mnemonic and recovery code, wherever the user wrote them down). The `done`
   * screen needs none of them. R-05's caveat still applies: dropping a JS string
   * reference is not zeroization.
   */
  const finish = useCallback(() => {
    setDek(null);
    setMnemonic('');
    setImportText('');
    setPass('');
    setPass2('');
    setGenerated('');
    setRecoveryCode('');
    setStep('done');
  }, []);

  // Focus the step's primary field on entry — programmatic (callback ref), matching the
  // app's own pattern and avoiding the jsx-a11y/no-autofocus DOM attribute. Fires on each
  // step's keyed remount; called with null on unmount (no-op).
  const focusOnMount = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    el?.focus();
  }, []);

  // Shared field styling on the dark overlay: DS Input/Textarea tokens + a 44px tap target
  // and a faint muted fill so fields stay legible on the glass card.
  const field = 'min-h-[44px] bg-muted/40';

  const overlay = (
    // Focused full-screen takeover: covers the app header, bottom tabs, and the
    // app-wide Install-App prompt so a secret-phrase / passphrase step is private
    // and native-feeling. Safe-area padding for the notch / home indicator.
    //
    // A Radix `Dialog`, not a bare `createPortal`, for the same reason
    // WalletSignPrompt is one: onboarding is routinely opened FROM a modal —
    // PasskeyConnectCard renders it inside ConnectWalletModal / OnboardingModal,
    // which are ModalProvider Radix dialogs. Radix does four things to
    // everything outside the topmost modal's content: `pointer-events: none` on
    // <body>, a trapped focus scope, `aria-hidden` on siblings, and a scroll
    // lock. An overlay portalled to <body> as a mere sibling is subject to all
    // four — it paints on top (z-[1200] > z-[2002] is irrelevant) while being
    // completely dead to taps, typing and scrolling. That is the reported
    // "passkey login is behind the popup UI on mobile". Joining the same layer
    // stack as a member above the sheet is what makes it own the pointer, the
    // focus and the scroll.
    <Dialog.Root
      open
      modal
      // Dismissal is the flow's own Back/Cancel affordances, never a stray
      // outside tap: this covers the viewport and a half-finished vault must not
      // be abandoned by accident.
      onOpenChange={() => {}}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[2050] bg-background" />
        <Dialog.Content
          // Above ModalProvider's dialogs (z-[2001]/z-[2002]) because it is
          // launched from inside one, and below WalletSignPrompt (z-[2100]),
          // which must stay the topmost surface whenever a signature is pending.
          className="fixed inset-0 z-[2050] bg-background text-foreground overflow-y-auto touch-manipulation outline-none"
          // Each step supplies its own visible copy; the layer's description is
          // not a separate element.
          aria-describedby={undefined}
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            // Native-feel: kill the iOS grey tap flash, stop the rubber-band/pull-to-refresh
            // that reveals the page behind, and (touch-manipulation) drop the 300ms double-tap delay.
            WebkitTapHighlightColor: 'transparent',
            overscrollBehavior: 'contain',
          }}
          // Escape must not silently discard a partially-enrolled wallet.
          onEscapeKeyDown={(e) => e.preventDefault()}
          // There is no "outside": this covers the viewport. Anything Radix would
          // read as an outside interaction is a stray event from the sheet
          // underneath.
          onInteractOutside={(e) => e.preventDefault()}
          // Let the launching sheet's own focus scope decide where focus lands
          // once onboarding goes away.
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Radix requires a title for screen readers; each step renders its own
              visible <h2>, so this is the stable accessible name for the layer. */}
          <Dialog.Title className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0" style={{ clip: 'rect(0, 0, 0, 0)' }}>
            Set up your wallet
          </Dialog.Title>
          <div className="min-h-full flex flex-col items-center justify-start px-4 pt-[9vh] pb-8">
            <div className="w-full max-w-md mx-auto">
              {/* Persistent Back nav — native multi-step affordance. Sibling of the keyed
            card so it doesn't remount; hidden on root/terminal/in-flight steps. Clears
            any error on the way back. */}
              {backTarget && (
              <Button
                type="button"
                variant="ghost"
                aria-label="Go back"
                onClick={() => { setError(''); setStep(backTarget as Step); }}
                className="mb-2 -ml-2 h-auto min-h-[44px] gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              )}
              {/* Persistent stepper progress bar — sits above the card and animates its
            width across steps (DESIGN-03). Sibling of the keyed card so it doesn't
            remount, giving a smooth fill instead of a jump. */}
              {progress > 0 && (
              <div className="mb-3 h-1 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[#1161FE] transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              )}
              {/* Keyed on `step` so each step remounts and replays the sheet-rise entrance —
            the app's own motion primitives (animate-in/fade/slide, matching dialog.tsx). */}
              <div key={step} className="animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ease-out">
                {step === 'exists' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={Wallet} />
                  <h2 className={heading}>Wallet already set up</h2>
                  <p className={description}>
                    A wallet already exists on this device. Unlocking is the next screen.
                  </p>
                  <AeButton
                    variant="ghost"
                    fullWidth
                    className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                // Clear BOTH halves: leaving the cleartext manifest behind would
                // leave `makeSigner` installing an inline signer for an address
                // whose vault no longer exists.
                    onClick={() => { store.clear().then(() => { clearManifest(); setStep('choose'); }); }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset (dev) — clear this device&apos;s wallet
                  </AeButton>
                </AeCard>
                )}

                {step === 'choose' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={ShieldCheck} />
                  <h2 className={heading}>Set up your wallet</h2>
                  <p className={description}>
                    Your keys stay on this device, encrypted. Superhero never sees them.
                  </p>
                  {/* In a browser tab the passkey IS the wallet: one tap, no phrase to
                      transcribe, because the seed is derived from the passkey and stays
                      recoverable from it. The written-phrase flow is the installed-app
                      path, and remains available here as the explicit alternative for
                      anyone who wants a phrase they control. */}
                  {seedFlow ? (
                    <PrimaryButton className="mb-3" onClick={startCreate}>Create a new wallet</PrimaryButton>
                  ) : (
                    <>
                      <PrimaryButton
                        className="mb-3"
                        disabled={!passkeySupported}
                        onClick={createWithPasskey}
                      >
                        <Fingerprint className="h-4 w-4" />
                        Continue with passkey
                      </PrimaryButton>
                      <p className="text-xs text-muted-foreground mb-3">
                        {passkeySupported
                          ? 'Face ID, Touch ID or your device PIN. No password, nothing to write down.'
                          : 'This device or browser can’t create a passkey — use a recovery phrase instead.'}
                      </p>
                      <AeButton
                        variant="ghost"
                        fullWidth
                        className="mb-3"
                        onClick={startCreate}
                      >
                        Use a recovery phrase instead
                      </AeButton>
                    </>
                  )}
                  <AeButton variant="ghost" fullWidth onClick={() => { setImportText(''); setStep('import-enter'); }}>Import an existing wallet</AeButton>
                </AeCard>
                )}

                {step === 'create-show' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={KeyRound} />
                  <h2 className={heading}>Write down your recovery phrase</h2>
                  <p className="text-sm text-amber-300/90 mb-4">
                    These 12 words are the only way to recover your wallet. Write them on paper,
                    in order. Never share them or store them digitally.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {mnemonic.split(' ').map((w, i) => (
                      <div key={w + String(i)} className="px-2 py-2 rounded-lg bg-muted/60 border border-border text-sm">
                        <span className="text-muted-foreground mr-1">{i + 1}</span>
                        {w}
                      </div>
                    ))}
                  </div>
                  <PrimaryButton onClick={() => setStep('create-verify')}>I&apos;ve written them down</PrimaryButton>
                </AeCard>
                )}

                {step === 'create-verify' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={CircleCheck} />
                  <h2 className={heading}>Confirm your backup</h2>
                  <p className={description}>Type the requested words to confirm you saved them.</p>
                  {[0, 1].map((n) => (
                    <div key={verifyIdx[n]} className="mb-3">
                      <label className="block text-xs text-muted-foreground mb-1" htmlFor={`vw${n}`}>{`Word #${verifyIdx[n] + 1}`}</label>
                      <Input
                        id={`vw${n}`}
                        className={cn(field, wordBorder(n))}
                        value={verifyIn[n]}
                        ref={n === 0 ? focusOnMount : undefined}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        onChange={(e) => setVerifyIn(
                          (prev) => (n === 0 ? [e.target.value, prev[1]] : [prev[0], e.target.value]),
                        )}
                      />
                    </div>
                  ))}
                  <PrimaryButton className="mt-2" disabled={!verifyOk} onClick={() => { setBackupVerified(true); setFromImport(false); setStep('passphrase'); }}>
                    {verifyOk ? 'Continue' : 'Words don’t match yet'}
                  </PrimaryButton>
                  {/* Skippable on purpose: a hard gate here teaches people to
                      screenshot the phrase to get past it, and it strands anyone who
                      wrote it down correctly but mistypes under pressure. Skipping is
                      allowed but NOT silent — it does not set `mnemonicBackedUpAt`, so
                      the vault honestly records that no verified backup exists and the
                      app can keep nagging until one does. */}
                  <AeButton
                    variant="ghost"
                    fullWidth
                    className="mt-2 text-muted-foreground"
                    onClick={() => { setBackupVerified(false); setFromImport(false); setStep('passphrase'); }}
                  >
                    Skip — I’ll confirm later
                  </AeButton>
                </AeCard>
                )}

                {step === 'import-enter' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={Download} />
                  <h2 className={heading}>Import your wallet</h2>
                  <p className={description}>
                    Enter your 12- or 24-word recovery phrase, separated by spaces.
                  </p>
                  <Textarea
                    className={cn(field, 'font-mono mb-2')}
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
                  <PrimaryButton disabled={!importedOk} onClick={() => { setBackupVerified(true); setFromImport(true); setStep('passphrase'); }}>Continue</PrimaryButton>
                </AeCard>
                )}

                {step === 'passphrase' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={Lock} />
                  <h2 className={heading}>Set a passphrase</h2>
                  <p className={description}>
                    This encrypts your wallet on this device — you&apos;ll enter it to sign. The
                    strongest choice is a generated passphrase; tap below, then write it down.
                  </p>
                  {/* Recommended path first: the default action produces a strong secret. */}
                  <PrimaryButton className="mb-3" onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4" />
                    Generate a strong passphrase
                  </PrimaryButton>
                  {generated && (
                  <div className="mb-3">
                    <p className="rounded-xl border border-border bg-muted/60 px-3 py-3 font-mono text-sm break-all text-center text-foreground mb-2">
                      {generated}
                    </p>
                    <div className="flex items-center gap-2">
                      <AeButton
                        variant="ghost"
                        className="flex-1"
                        onClick={() => {
                          navigator.clipboard?.writeText(generated)
                            .then(() => setGenCopied(true))
                            .catch(() => setError('Couldn’t copy — write the passphrase down instead.'));
                        }}
                      >
                        {genCopied ? <CircleCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        {genCopied ? 'Copied' : 'Copy'}
                      </AeButton>
                    </div>
                    <p className="mt-2 text-xs text-amber-300/90">
                      Write this down and keep it safe — it unlocks your wallet and signs every
                      transaction. Never store it digitally.
                    </p>
                  </div>
                  )}
                  <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or set your own
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Input className={cn(field, 'mb-2')} type="password" value={pass} placeholder="passphrase" ref={focusOnMount} autoComplete="new-password" autoCapitalize="none" onChange={(e) => { setPass(e.target.value); setGenerated(''); }} />
                  {pass.length > 0 && !passInfo.failed && (
                  <StrengthMeter score={passInfo.score} pending={passInfo.pending} />
                  )}
                  {passInfo.failed ? (
                    <p className="text-xs mb-3 text-amber-500">
                      {passInfo.message}
                      {' '}
                      <button type="button" className="underline" onClick={warmEstimator}>Retry</button>
                    </p>
                  ) : (
                    <p className={`text-xs mb-3 ${passInfo.pending ? 'text-muted-foreground' : fieldClass(pass.length === 0, passInfo.ok)}`}>{pass.length === 0 ? 'Use several random words — not a short PIN or a common password.' : passInfo.message}</p>
                  )}
                  <Input className={cn(field, 'mb-2')} type="password" value={pass2} placeholder="confirm passphrase" autoComplete="new-password" autoCapitalize="none" onChange={(e) => setPass2(e.target.value)} />
                  {pass2.length > 0 && !passesMatch && <p className="text-xs text-rose-400 mb-3">Passphrases don&apos;t match.</p>}
                  {error && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  )}
                  <PrimaryButton className="mt-2" disabled={!(passInfo.ok && passesMatch)} onClick={doCreate}>Create wallet</PrimaryButton>
                </AeCard>
                )}

                {step === 'creating' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={Loader2} spin />
                  <h2 className={heading}>Encrypting your wallet…</h2>
                  <p className="text-sm text-muted-foreground">Deriving your key (Argon2id). This takes a moment.</p>
                </AeCard>
                )}

                {step === 'protect' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={Fingerprint} />
                  <h2 className={heading}>Unlock with this device</h2>
                  <p className={description}>
                    Add your device&apos;s own security as a second way to unlock — so you don&apos;t
                    type your passphrase for every signature. We can&apos;t tell which sensor your
                    device uses; the device decides (Face ID, Touch ID, fingerprint, or your passcode).
                  </p>
                  {deviceUnlockAvailable ? (
                    <PrimaryButton className="mb-3" disabled={busy} onClick={enrollDeviceUnlock}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                      Set up device unlock
                    </PrimaryButton>
                  ) : (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        This device doesn&apos;t offer a built-in unlock we can use. Your passphrase
                        stays your way in — it works everywhere.
                      </span>
                    </div>
                  )}
                  {error && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  )}
                  <AeButton variant="ghost" fullWidth disabled={busy} onClick={() => record && goToRecovery(record)}>
                    {deviceUnlockAvailable ? 'Skip — use my passphrase' : 'Continue'}
                  </AeButton>
                </AeCard>
                )}

                {step === 'recovery' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={LifeBuoy} />
                  <h2 className={heading}>Save your recovery code</h2>
                  <p className="text-sm text-amber-300/90 mb-4">
                    Shown once, now. It unlocks your wallet if you forget your passphrase or lose this
                    device. Store it somewhere other than this device.
                  </p>
                  <p className="rounded-xl border border-border bg-muted/60 px-3 py-3 font-mono text-sm break-all text-center text-foreground mb-2">
                    {recoveryCode}
                  </p>
                  <AeButton
                    variant="ghost"
                    fullWidth
                    className="mb-4"
                    onClick={() => {
                      navigator.clipboard?.writeText(recoveryCode)
                        .then(() => setCopied(true))
                        .catch(() => setError('Couldn’t copy — write the code down instead.'));
                    }}
                  >
                    {copied ? <CircleCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy code'}
                  </AeButton>
                  <label className="mb-4 flex items-start gap-2 text-sm text-foreground" htmlFor="recovery-saved">
                    <input
                      id="recovery-saved"
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#1161FE]"
                      checked={recoverySaved}
                      onChange={(e) => setRecoverySaved(e.target.checked)}
                    />
                    <span>I&apos;ve saved my recovery code somewhere safe.</span>
                  </label>
                  {error && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                  )}
                  <PrimaryButton disabled={!recoverySaved} onClick={finish}>Finish setup</PrimaryButton>
                </AeCard>
                )}

                {step === 'done' && (
                <AeCard variant="glass" hover={false} className="w-full p-6">
                  <IconChip icon={CircleCheck} tone="success" />
                  <h2 className={heading}>Wallet ready 🎉</h2>
                  <p className="text-sm text-muted-foreground mb-1">Your first account:</p>
                  <p className="text-xs font-mono break-all text-emerald-400 mb-4">{firstAddr}</p>
                  <p className="text-xs text-muted-foreground mb-5">
                    {`Unlocks with your ${passkeyEnrolled ? 'device, your passphrase, or your recovery code' : 'passphrase or your recovery code'}. `}
                    You&apos;ll confirm every transaction.
                  </p>
                  <PrimaryButton onClick={() => onComplete?.(record as VaultRecord, firstAddr)}>
                    Open wallet
                  </PrimaryButton>
                </AeCard>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  // `Dialog.Portal` already renders into <body>, so no extra `createPortal` is
  // needed (double-portalling would remount the tree on every render). Radix is
  // SSR-safe here: with no document it simply renders nothing rather than
  // throwing, and onboarding is a client-only, post-hydration surface anyway.
  return overlay;
};

export default WalletOnboarding;
