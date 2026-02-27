import { useCallback } from 'react';
import { verifyMessage } from '@aeternity/aepp-sdk';
import {
  SuperheroApi,
  type XInviteChallengePurpose,
  type XInviteProgressResponse,
} from '@/api/backend';
import { useAeSdk } from '@/hooks/useAeSdk';
import { buildFrontendXInviteLink } from '@/utils/xInvite';

function isHexLike(value: string): boolean {
  return /^[0-9a-fA-F]+$/u.test(value);
}

function toHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!isHexLike(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex signature format');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return out;
}

function normalizeSignatureHex(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (raw instanceof Uint8Array) return toHex(raw);
  if (typeof raw === 'string') {
    const normalized = raw.startsWith('0x') ? raw.slice(2) : raw;
    return isHexLike(normalized) ? normalized.toLowerCase() : undefined;
  }
  if (typeof raw === 'object') {
    const maybeObject = raw as Record<string, unknown>;
    const fromKnownFields = normalizeSignatureHex(
      maybeObject.signature_hex
      ?? maybeObject.signatureHex
      ?? maybeObject.signature
      ?? maybeObject.raw,
    );
    if (fromKnownFields) return fromKnownFields;
  }
  return undefined;
}

function debugInviteSignature(
  stage: 'create' | 'bind',
  details: Record<string, unknown>,
) {
  // Keep this log concise but diagnostic: enough to compare FE vs BE verification inputs.
  // eslint-disable-next-line no-console
  console.error(`[x-invite:${stage}] signature debug`, details);
}

export function useXInviteFlow() {
  const { aeSdk, activeAccount } = useAeSdk();

  const signMessageHex = useCallback(async (message: string, address?: string): Promise<string> => {
    const signer: any = aeSdk as any;
    if (!signer) {
      throw new Error('Wallet is not connected');
    }

    const signersToTry: Array<() => Promise<unknown>> = [];
    signersToTry.push(() => signer.signMessage(message, { onAccount: address }));
    signersToTry.push(() => signer.signMessage(message));

    let lastError: unknown;
    for (const signerAttempt of signersToTry) {
      try {
        const result = await signerAttempt();
        const signatureHex = normalizeSignatureHex(result);
        if (!signatureHex) continue;
        if (address) {
          const isValid = verifyMessage(message, hexToBytes(signatureHex), address);
          if (!isValid) {
            throw new Error('Signed message does not match inviter wallet address');
          }
        }
        return signatureHex;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      if (lastError.message.includes('signMessage is not a function')) {
        throw new Error('Connected signer does not support message signing. Reconnect wallet and try again.');
      }
      throw lastError;
    }
    throw new Error('Wallet did not return a valid message signature');
  }, [aeSdk]);

  const requestChallenge = useCallback(async (
    address: string,
    purpose: XInviteChallengePurpose,
    code?: string,
  ) => SuperheroApi.createXInviteChallenge({
    address,
    purpose,
    ...(code ? { code } : {}),
  }), []);

  const generateInviteLink = useCallback(async (
    address?: string,
  ): Promise<{ code: string; frontend_invite_link: string; backend_invite_link: string }> => {
    const signerAddress = address || activeAccount;
    if (!signerAddress) {
      throw new Error('Missing wallet address');
    }
    const challenge = await requestChallenge(signerAddress, 'create');
    const signatureHex = await signMessageHex(challenge.message, signerAddress);
    const payload = {
      inviter_address: signerAddress,
      challenge_nonce: challenge.nonce,
      challenge_expires_at: String(challenge.expires_at),
      signature_hex: signatureHex,
    };
    try {
      const invite = await SuperheroApi.createXInvite(payload);
      return {
        code: invite.code,
        frontend_invite_link: buildFrontendXInviteLink(invite.code),
        backend_invite_link: invite.invite_link,
      };
    } catch (error) {
      debugInviteSignature('create', {
        inviter_address: signerAddress,
        challenge_nonce: challenge.nonce,
        challenge_expires_at: String(challenge.expires_at),
        challenge_message_preview: challenge.message.slice(0, 120),
        challenge_message_length: challenge.message.length,
        signature_hex_prefix: signatureHex.slice(0, 16),
        signature_hex_length: signatureHex.length,
        local_verify_result: verifyMessage(challenge.message, hexToBytes(signatureHex), signerAddress),
        error_message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }, [activeAccount, requestChallenge, signMessageHex]);

  const loadInviteProgress = useCallback(async (address?: string): Promise<XInviteProgressResponse> => {
    const targetAddress = address || activeAccount;
    if (!targetAddress) {
      throw new Error('Missing wallet address');
    }
    return SuperheroApi.getXInviteProgress(targetAddress);
  }, [activeAccount]);

  const bindInviteForUserB = useCallback(async (inviteCode: string, address?: string): Promise<void> => {
    const inviteeAddress = address || activeAccount;
    if (!inviteeAddress) {
      throw new Error('Missing wallet address');
    }
    if (!inviteCode?.trim()) {
      throw new Error('Missing invite code');
    }
    const challenge = await requestChallenge(inviteeAddress, 'bind', inviteCode);
    const signatureHex = await signMessageHex(challenge.message, inviteeAddress);
    const payload = {
      invitee_address: inviteeAddress,
      challenge_nonce: challenge.nonce,
      challenge_expires_at: String(challenge.expires_at),
      signature_hex: signatureHex,
    };
    try {
      await SuperheroApi.bindXInvite(inviteCode, payload);
    } catch (error) {
      debugInviteSignature('bind', {
        invitee_address: inviteeAddress,
        invite_code: inviteCode,
        challenge_nonce: challenge.nonce,
        challenge_expires_at: String(challenge.expires_at),
        challenge_message_preview: challenge.message.slice(0, 120),
        challenge_message_length: challenge.message.length,
        signature_hex_prefix: signatureHex.slice(0, 16),
        signature_hex_length: signatureHex.length,
        local_verify_result: verifyMessage(challenge.message, hexToBytes(signatureHex), inviteeAddress),
        error_message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }, [activeAccount, requestChallenge, signMessageHex]);

  return {
    generateInviteLink,
    loadInviteProgress,
    bindInviteForUserB,
  };
}

