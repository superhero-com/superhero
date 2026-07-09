import {
  decode,
  type Encoded,
  verifyMessageSignature,
} from '@aeternity/aepp-sdk';
import type { MessageSignRequest } from '@/atoms/txQueueAtoms';
import i18n from '@/i18n';

type SignMessageOptions = {
  request?: MessageSignRequest;
};

type SignMessageFn = (
  message: string,
  messageOptions?: SignMessageOptions,
) => Promise<string>;

const normalizeSignatureHex = (signature: string): string => {
  const trimmed = signature.trim();
  if (trimmed.startsWith('sg_')) {
    return Array.from(decode(trimmed as Encoded.Signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  const clean = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-f]+$/iu.test(clean) && clean.length % 2 === 0) return clean.toLowerCase();
  return clean;
};

const hexToBytes = (hex: string): Uint8Array => {
  const clean = normalizeSignatureHex(hex);
  if (clean.length % 2 !== 0) {
    throw new Error(i18n.t('common.messages.invalidHexSignature'));
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
};

export const normalizeLinkSignature = (signature: unknown): string => {
  if (typeof signature === 'string') return normalizeSignatureHex(signature);
  if (signature instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  if (ArrayBuffer.isView(signature)) {
    return Array.from(new Uint8Array(signature.buffer, signature.byteOffset, signature.byteLength))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  if (signature instanceof Uint8Array || Array.isArray(signature)) {
    return Array.from(signature)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  if (typeof (signature as { signature?: unknown })?.signature === 'string') {
    return normalizeSignatureHex((signature as { signature: string }).signature);
  }
  const nested = (signature as { signature?: Uint8Array | number[] })?.signature;
  if (nested instanceof Uint8Array || Array.isArray(nested)) {
    return Array.from(nested)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  if (signature && typeof signature === 'object') {
    const value = (signature as Record<string, unknown>).raw
      ?? (signature as Record<string, unknown>).value;
    if (value != null) return normalizeLinkSignature(value);
  }
  throw new Error(i18n.t('common.messages.invalidWalletSignature'));
};

const signatureToBytes = (signature: string): Uint8Array => {
  const trimmed = signature.trim();
  if (trimmed.startsWith('sg_')) {
    return decode(trimmed as Encoded.Signature);
  }
  return hexToBytes(trimmed);
};

/** Sign an address-link challenge via wallet signed-message flow. */
export async function signLinkMessage(
  signMessage: SignMessageFn,
  challengeMessage: string,
  signOptions?: SignMessageOptions,
): Promise<string> {
  const signature = await signMessage(challengeMessage, signOptions);
  return normalizeLinkSignature(signature);
}

/** Verify signature using aepp-sdk signed-message semantics. */
export function verifyLinkMessageSignature(
  address: string,
  message: string,
  signature: string,
): boolean {
  const isValid = verifyMessageSignature(
    message,
    signatureToBytes(signature),
    address as Encoded.AccountAddress,
  );

  // eslint-disable-next-line no-console
  console.log('[address-link] local signature verification', {
    address,
    message,
    isValid,
  });

  return isValid;
}

export async function signAndVerifyLinkMessage(
  address: string,
  signMessage: SignMessageFn,
  challengeMessage: string,
  signOptions?: SignMessageOptions,
): Promise<string> {
  const signature = await signLinkMessage(signMessage, challengeMessage, signOptions);
  const isValid = verifyLinkMessageSignature(address, challengeMessage, signature);
  if (!isValid) {
    throw new Error(i18n.t('common.messages.signatureVerificationFailed'));
  }
  return signature;
}
