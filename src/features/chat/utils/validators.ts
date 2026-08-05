/**
 * Input validation utilities — ported from
 * `superhero-app/src/features/chat/utils/validators.ts`. Pure functions.
 */
import * as nip19 from 'nostr-tools/nip19';

/** Validate a Nostr public key (hex). */
export function isValidPubkey(pubkey: string): boolean {
  return /^[0-9a-f]{64}$/i.test(pubkey);
}

/** Validate npub (bech32). */
export function isValidNpub(npub: string): boolean {
  try {
    return nip19.decode(npub).type === 'npub';
  } catch {
    return false;
  }
}

/** Validate nsec (bech32). */
export function isValidNsec(nsec: string): boolean {
  try {
    return nip19.decode(nsec).type === 'nsec';
  } catch {
    return false;
  }
}

/** Validate a private key (hex). */
export function isValidPrivateKey(privateKey: string): boolean {
  return /^[0-9a-f]{64}$/i.test(privateKey);
}

/** Validate a Nostr identifier (npub or hex pubkey). */
export function isValidNostrIdentifier(identifier: string): boolean {
  return isValidPubkey(identifier) || isValidNpub(identifier);
}

/** Validate a relay URL (must be `ws://` or `wss://`). */
export function isValidRelayUrl(url: string): boolean {
  try {
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      return false;
    }
    return Boolean(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Validate message content (non-empty after trimming). */
export function isValidMessageContent(content: string): boolean {
  return content != null && content.trim().length > 0;
}

/** Validate a profile name (non-empty, <= 50 chars). */
export function isValidProfileName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 50;
}

/** Validate a NIP-05 identifier (email-like). */
export function isValidNip05(nip05: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(nip05);
}

/** Validate a Lightning address (LNURL, NIP-05-like). */
export function isValidLightningAddress(lud16: string): boolean {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lud16);
}

/** Validate an arbitrary URL. */
export function isValidUrl(url: string): boolean {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
}

/** Collapse whitespace and trim message content. */
export function sanitizeMessageContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

/** Trim and clamp a profile field. */
export function sanitizeProfileField(field: string, maxLength = 500): string {
  return field.trim().slice(0, maxLength);
}
