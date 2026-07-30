import React, { useState, useCallback } from 'react';
import {
  importWallet,
  passphraseUnlockProvider,
  addRecoveryCodeFactor,
  addPasskeyFactor,
  passkeyUnlockProvider,
} from '@/features/wallet/wallet-lifecycle';
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';
import { deriveAccount } from '@/features/wallet/derivation';
import { unlockVault, type VaultRecord } from '@/features/wallet/vault-record';
import { createInlineWalletSigner } from '@/features/wallet/inline-signer';
import { isPlatformAuthenticatorAvailable, resolveRpId } from '@/features/wallet/webauthn';
import { isStandalone, isIOSWebKit } from '@/utils/displayMode';

/**
 * DEV / LAB screen — NOT for production. Validates the inline-wallet crypto core
 * on a REAL device (in-browser WebCrypto, Argon2id timing, and especially whether
 * WebAuthn PRF works on this device — the one thing that can't be faked headlessly).
 * Use a THROWAWAY test mnemonic, never a seed that holds real funds, until the
 * flow is validated. This route must be gated/removed before any production merge.
 */

const store = createIndexedDbVaultStore();

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

const toHex = (u: Uint8Array) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');

const WalletLab = () => {
  const [mnemonic, setMnemonic] = useState(TEST_MNEMONIC);
  const [passphrase, setPassphrase] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const say = useCallback((line: string) => {
    setLog((prev) => [`${new Date().toISOString().slice(11, 19)}  ${line}`, ...prev]);
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    const t0 = performance.now();
    try {
      await fn();
      say(`✓ ${label}  (${Math.round(performance.now() - t0)} ms)`);
    } catch (e) {
      say(`✗ ${label} — ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [say]);

  const loadOrThrow = async (): Promise<VaultRecord> => {
    const record = await store.load();
    if (!record) throw new Error('no vault — import one first');
    return record;
  };

  const onImport = () => run('import mnemonic → create vault (incl. one Argon2id)', async () => {
    await store.clear();
    const record = await importWallet(store, { mnemonic: mnemonic.trim(), passphrase, now: Date.now() });
    say(`vault created · ${record.factors.length} factor(s) · addr[0]=${deriveAccount(mnemonic.trim(), 0).address}`);
    say(`addr[1]=${deriveAccount(mnemonic.trim(), 1).address}`);
  });

  const onUnlockSign = () => run('unlock (passphrase) + sign a test message', async () => {
    const record = await loadOrThrow();
    const signer = createInlineWalletSigner({
      address: deriveAccount(mnemonic.trim(), 0).address, index: 0, record, unlock: passphraseUnlockProvider(passphrase),
    });
    const sig = await signer.signMessage('superhero inline wallet lab');
    say(`signed · sig=${toHex(sig).slice(0, 32)}… (${sig.length}B) · addr=${signer.address}`);
  });

  const onCheckPasskey = () => run('check platform authenticator', async () => {
    const ok = await isPlatformAuthenticatorAvailable();
    say(`platform authenticator available: ${ok} · rpId=${resolveRpId()}`);
  });

  const onEnrollPasskey = () => run('enroll passkey (PRF) — DEVICE TEST', async () => {
    const record = await loadOrThrow();
    const pp = await passphraseUnlockProvider(passphrase)(record);
    const { dek } = await unlockVault(record, pp.factorId, pp.kek);
    const updated = await addPasskeyFactor(store, record, dek, {
      userId: crypto.getRandomValues(new Uint8Array(16)), userName: 'superhero-lab', label: 'This device', now: Date.now(),
    });
    say(`passkey factor enrolled · ${updated.factors.length} factor(s) — PRF WORKS on this device 🎉`);
  });

  const onUnlockPasskey = () => run('unlock via passkey (PRF) + sign', async () => {
    const record = await loadOrThrow();
    const signer = createInlineWalletSigner({
      address: deriveAccount(mnemonic.trim(), 0).address, index: 0, record, unlock: passkeyUnlockProvider(),
    });
    const sig = await signer.signMessage('lab passkey sign');
    say(`passkey-unlocked sign ok · sig=${toHex(sig).slice(0, 32)}…`);
  });

  const onRecovery = () => run('add recovery code', async () => {
    const record = await loadOrThrow();
    const pp = await passphraseUnlockProvider(passphrase)(record);
    const { dek } = await unlockVault(record, pp.factorId, pp.kek);
    const { code } = await addRecoveryCodeFactor(store, record, dek, Date.now());
    say(`recovery code (write it down): ${code}`);
  });

  const onClear = () => run('clear vault', async () => { await store.clear(); say('vault cleared'); });

  const btn = 'px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm text-white/90 '
    + 'hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 max-w-xl mx-auto">
      <h1 className="text-lg font-semibold mb-1">Inline Wallet — Device Lab</h1>
      <p className="text-[12px] text-amber-300/90 mb-3">
        DEV ONLY. Use a THROWAWAY test mnemonic (never a seed with real funds). Not for production.
      </p>
      <p className="text-[12px] text-white/50 mb-4">
        {`standalone(PWA)=${isStandalone()} · iOSWebKit=${isIOSWebKit()} · subtle=${typeof crypto?.subtle !== 'undefined'}`}
      </p>

      <label className="block text-[12px] text-white/60 mb-1" htmlFor="mn">Test mnemonic</label>
      <textarea
        id="mn"
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
        rows={2}
        className="w-full mb-3 p-2 rounded-lg bg-white/5 border border-white/10 text-[13px] font-mono"
      />
      <label className="block text-[12px] text-white/60 mb-1" htmlFor="pp">Passphrase</label>
      <input
        id="pp"
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="high-entropy passphrase"
        className="w-full mb-4 p-2 rounded-lg bg-white/5 border border-white/10 text-[13px]"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <button type="button" className={btn} disabled={busy} onClick={onImport}>1 · Import + create vault</button>
        <button type="button" className={btn} disabled={busy} onClick={onUnlockSign}>2 · Unlock (passphrase) + sign</button>
        <button type="button" className={btn} disabled={busy} onClick={onCheckPasskey}>3 · Check passkey support</button>
        <button type="button" className={btn} disabled={busy} onClick={onEnrollPasskey}>4 · Enroll passkey (PRF)</button>
        <button type="button" className={btn} disabled={busy} onClick={onUnlockPasskey}>5 · Unlock via passkey + sign</button>
        <button type="button" className={btn} disabled={busy} onClick={onRecovery}>6 · Add recovery code</button>
        <button type="button" className={btn} disabled={busy} onClick={onClear}>Clear vault</button>
      </div>

      <div className="rounded-lg bg-black/40 border border-white/10 p-3 h-72 overflow-auto text-[12px] font-mono whitespace-pre-wrap">
        {log.length === 0 ? <span className="text-white/40">results appear here…</span> : log.join('\n')}
      </div>
    </div>
  );
};

export default WalletLab;
