/**
 * Display formatting utilities — ported from
 * `superhero-app/src/features/chat/utils/formatters.ts`. Pure functions.
 * (The app's unused `nip19` import is dropped.)
 */
import type { Contact, Profile, Message } from '../core/types';

export function shortenNpub(npub: string): string {
  if (npub.length < 16) return npub;
  return `${npub.slice(0, 12)}...${npub.slice(-8)}`;
}

export function shortenPubkey(pubkey: string): string {
  if (pubkey.length < 16) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

/**
 * Format a contact name for display.
 * Priority: profile.name > custom nickname > shortened npub.
 */
export function formatContactName(contact: Contact, profile?: Profile): string {
  if (profile?.name) {
    return profile.name;
  }
  if (contact.nickname) {
    return contact.nickname;
  }
  return shortenNpub(contact.npub);
}

/** Format a timestamp as a compact relative label. */
export function formatMessageTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 2 * day) return 'Yesterday';
  if (diff < week) return `${Math.floor(diff / day)}d`;
  return `${Math.floor(diff / week)}w`;
}

/** Format a full date/time using the platform locale. */
export function formatFullDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function formatMessagePreview(content: string, maxLength = 50): string {
  return truncateText(content.replace(/\s+/g, ' ').trim(), maxLength);
}

/** Format a relay URL for display (hostname only). */
export function formatRelayUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function formatProfileBio(bio: string | undefined, maxLength = 150): string {
  if (!bio) return '';
  return truncateText(bio, maxLength);
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0 || words[0] === '') return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Format a number with compact notation (1.2k, 3.4M). */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
  return `${(num / 1000000).toFixed(1)}M`;
}

/**
 * Group the integer-digit string of a raw base-units amount with thousands
 * separators — a pure string op, so it never relies on token `decimals` and
 * never coerces through `Number()`. Returns `null` for empty/non-numeric input.
 */
export function formatThresholdDigits(raw: string | undefined): string | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const trimmed = raw.replace(/^0+(?=\d)/, '');
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format delivery status for display. */
export function formatDeliveryStatus(status: Message['status']): string {
  switch (status.type) {
    case 'sending':
      return 'Sending...';
    case 'sent':
      return 'Sent';
    case 'delivered':
      return 'Delivered';
    case 'read':
      return 'Read';
    case 'failed':
      return `Failed: ${status.reason}`;
    default:
      return 'Unknown';
  }
}
