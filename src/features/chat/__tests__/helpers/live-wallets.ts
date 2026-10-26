import { readFileSync } from 'node:fs';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { deriveKeysFromSeed } from '../../nostr/crypto';
import type { UserKeys } from '../../core/types';

interface TestWallet { mnemonic: string; accountIndex: number }

/** Optional PRIVATE fixture. Never include its contents in assertions or logs. */
export function readTestWallets(path?: string): TestWallet[] | null {
  if (!path) return null;
  try {
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    if (fixture.version !== 1
      || !Array.isArray(fixture.accounts) || fixture.accounts.length !== 2) {
      throw new Error();
    }
    const wallets = fixture.accounts as TestWallet[];
    if (wallets.some((wallet) => typeof wallet.mnemonic !== 'string'
      || !validateMnemonic(wallet.mnemonic, wordlist)
      || !Number.isSafeInteger(wallet.accountIndex) || wallet.accountIndex < 0)) throw new Error();
    return wallets;
  } catch {
    // JSON/validation errors may contain the input text, so redact them entirely.
    throw new Error('Private wallet fixture must contain two valid mnemonic accounts.');
  }
}

export function testWalletKeys(wallet: TestWallet): UserKeys {
  const seed = mnemonicToSeedSync(wallet.mnemonic);
  try { return deriveKeysFromSeed(seed, wallet.accountIndex); } finally { seed.fill(0); }
}
