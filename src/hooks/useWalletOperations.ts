import { useCallback } from 'react';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import {
  buildSignMessageDeepLink,
  parseSignMessageCallback,
} from '@/utils/walletDeepLink';

type SignMethod = 'sdk' | 'reconnect' | 'deeplink';

type SignMessageResult = {
  signatureHex: string;
  signerAddress?: string;
  method: SignMethod;
};

function isHex(value: string): boolean {
  return /^[0-9a-fA-F]+$/u.test(value);
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeSignatureHex(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (typeof value === 'string') {
    const stripped = value.startsWith('0x') ? value.slice(2) : value;
    if (isHex(stripped)) return stripped.toLowerCase();

    // Deep-link callback might return base64-encoded signature.
    try {
      const decoded = atob(value);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i += 1) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return bytesToHex(bytes);
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return normalizeSignatureHex(
      record.signature_hex
      ?? record.signatureHex
      ?? record.signature
      ?? record.raw,
    );
  }
  return undefined;
}

function shouldReconnectForError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return [
    'not connected',
    'disconnected',
    'signMessage is not a function',
    'resolveAccount',
    'do not have access to account',
    'have no access to account',
    'access to account',
    'wallet',
  ].some((marker) => message.toLowerCase().includes(marker.toLowerCase()));
}

export function useWalletOperations() {
  const { aeSdk, activeAccount } = useAeSdk();
  const { reconnectWalletSession } = useWalletConnect();

  const ensureWalletSession = useCallback(async (expectedAddress?: string) => {
    const expected = expectedAddress || activeAccount;
    const connected = await reconnectWalletSession(expected);
    return connected;
  }, [activeAccount, reconnectWalletSession]);

  const signMessageViaDeepLink = useCallback(async (
    message: string,
    expectedAddress?: string,
  ): Promise<SignMessageResult> => {
    const requestId = Math.random().toString(36).slice(2);
    const url = buildSignMessageDeepLink({ message, requestId });

    const popup = window.open(url, '_blank', 'name=Superhero Wallet,width=362,height=594,toolbar=false,location=false,menubar=false,popup');
    if (!popup) {
      throw new Error('Wallet popup was blocked by the browser');
    }

    const startedAt = Date.now();
    const timeoutMs = 120000;

    return new Promise((resolve, reject) => {
      const interval = window.setInterval(() => {
        if (Date.now() - startedAt > timeoutMs) {
          window.clearInterval(interval);
          popup.close();
          reject(new Error('Wallet message signing timed out'));
          return;
        }

        if (popup.closed) {
          window.clearInterval(interval);
          reject(new Error('Wallet message signing was cancelled'));
          return;
        }

        try {
          const href = popup.location.href;
          if (!href.startsWith(window.location.origin)) return;

          const callback = parseSignMessageCallback(href);
          if (!callback || callback.requestId !== requestId) return;

          if (callback.cancelled) {
            window.clearInterval(interval);
            popup.close();
            reject(new Error('Wallet message signing was cancelled'));
            return;
          }

          const signatureHex = normalizeSignatureHex(callback.signature || undefined);
          const signerAddress = callback.address;

          if (!signatureHex) return;
          if (expectedAddress && signerAddress && signerAddress !== expectedAddress) {
            window.clearInterval(interval);
            popup.close();
            reject(new Error(`Wallet signed with unexpected account: ${signerAddress}`));
            return;
          }

          window.clearInterval(interval);
          popup.close();
          resolve({
            signatureHex,
            signerAddress,
            method: 'deeplink',
          });
        } catch {
          // Cross-origin during wallet screens; ignore until callback returns to our domain.
        }
      }, 350);
    });
  }, []);

  const signMessageWithFallback = useCallback(async (
    message: string,
    expectedAddress?: string,
  ): Promise<SignMessageResult> => {
    const signer: any = aeSdk as any;
    const targetAddress = expectedAddress || activeAccount;
    if (!targetAddress) {
      throw new Error('Missing signer address');
    }

    const signWithSdk = async (): Promise<string> => {
      const result = await signer.signMessage(message, { onAccount: targetAddress });
      const normalized = normalizeSignatureHex(result);
      if (!normalized) throw new Error('Wallet did not return a valid signature');
      return normalized;
    };

    try {
      const signatureHex = await signWithSdk();
      return { signatureHex, signerAddress: targetAddress, method: 'sdk' };
    } catch (err) {
      if (!shouldReconnectForError(err)) {
        throw err;
      }
    }

    const reconnected = await ensureWalletSession(targetAddress);
    if (reconnected) {
      try {
        const signatureHex = await signWithSdk();
        return { signatureHex, signerAddress: targetAddress, method: 'reconnect' };
      } catch {
        // Fall through to deep-link path
      }
    }

    return signMessageViaDeepLink(message, targetAddress);
  }, [aeSdk, activeAccount, ensureWalletSession, signMessageViaDeepLink]);

  const signTransactionWithFallback = useCallback(async (
    transaction: string,
    expectedAddress?: string,
    options?: Record<string, unknown>,
  ) => {
    const signer: any = aeSdk as any;
    try {
      return await signer.signTransaction(transaction, options);
    } catch (error) {
      if (!shouldReconnectForError(error)) throw error;
      const reconnected = await ensureWalletSession(expectedAddress);
      if (!reconnected) throw error;
      return signer.signTransaction(transaction, options);
    }
  }, [aeSdk, ensureWalletSession]);

  return {
    ensureWalletSession,
    signMessageWithFallback,
    signTransactionWithFallback,
  };
}

