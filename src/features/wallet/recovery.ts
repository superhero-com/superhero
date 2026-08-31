/**
 * Recovery code.
 *
 * A 128-bit, high-entropy code shown ONCE at enrollment. It is a `recovery-code`
 * factor (HKDF → KEK, factors.ts) — a device-independent unlock path so a single
 * passkey rekey (Apple FB22434584) or eviction can't orphan the wallet. It is NOT
 * a substitute for the mandatory WRITTEN mnemonic backup; both are required.
 *
 * Rendered as grouped uppercase hex (bijective, no base32 bit-packing to get
 * wrong — for a recovery path, correctness beats brevity). Parsing is lenient
 * about case, spaces and dashes so a user can retype it comfortably.
 */

/** Format 16 raw bytes as `XXXX-XXXX-…` uppercase hex (8 groups of 4). */
export function formatRecoveryCode(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return (hex.match(/.{1,4}/g) ?? []).join('-');
}

/** Parse a recovery code back to 16 bytes. Tolerates case/spaces/dashes; rejects wrong length. */
export function parseRecoveryCode(code: string): Uint8Array {
  const hex = code.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length !== 32) throw new Error('recovery code: expected 128 bits (32 hex characters)');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Generate a fresh 128-bit recovery code: the display string + its raw bytes (for the KEK). */
export function generateRecoveryCode(): { code: string; bytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return { code: formatRecoveryCode(bytes), bytes };
}
