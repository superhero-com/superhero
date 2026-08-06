/**
 * P4 — WYSIWYS decoding for the in-page signing confirmation (the wallet build plan §3.2
 * step 3, §5.4; the threat model NFR-S "what you see is what you sign").
 *
 * The signer hands the confirmation UI the exact `tx_…` string it is about to
 * sign. Showing that opaque base64 to a user is not consent, so this module
 * decodes it with the SDK's OWN `unpackTx` — the same builder that produced it —
 * into a small set of human-readable rows.
 *
 * Deliberate properties:
 *  - **Decode, never re-encode.** We read fields off the unpacked tx; we never
 *    rebuild a tx from the summary. The bytes signed are always the caller's
 *    original string, so a decoding bug can mislead but can never alter what is
 *    signed.
 *  - **Fail visible, not silent.** If the payload cannot be decoded we return
 *    `null` and the prompt shows a loud "could not decode" state plus the raw
 *    payload. An undecodable transaction is a reason for the user to refuse, so
 *    it must never render as a clean, confident summary.
 *  - **No network access, no key material.** Pure function over a string.
 */
import { Tag, unpackTx } from '@aeternity/aepp-sdk';

export interface TxSummaryRow {
  label: string;
  value: string;
  /** Rows that move value are emphasised in the prompt. */
  emphasis?: boolean;
}

export interface TxSummary {
  /** Human name for the transaction tag, e.g. "Send AE". */
  title: string;
  rows: TxSummaryRow[];
}

const AETTOS_PER_AE = 10n ** 18n;

/**
 * Format an aettos amount as AE. Integer maths only — a float round-trip on an
 * 18-decimal value can print an amount the user did not agree to.
 */
export function formatAe(aettos: bigint): string {
  const negative = aettos < 0n;
  const abs = negative ? -aettos : aettos;
  const whole = abs / AETTOS_PER_AE;
  const fraction = (abs % AETTOS_PER_AE).toString().padStart(18, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''} AE`;
}

const asBigInt = (value: unknown): bigint | null => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  return null;
};

const amountRow = (label: string, value: unknown, emphasis = false): TxSummaryRow | null => {
  const amount = asBigInt(value);
  return amount === null ? null : { label, value: formatAe(amount), emphasis };
};

const textRow = (label: string, value: unknown, emphasis = false): TxSummaryRow | null => (
  typeof value === 'string' && value.length > 0 ? { label, value, emphasis } : null
);

/** Readable names for the tags the app actually issues; unknown tags fall back to the tag name. */
const TITLES: Partial<Record<Tag, string>> = {
  [Tag.SpendTx]: 'Send AE',
  [Tag.ContractCallTx]: 'Call a contract',
  [Tag.ContractCreateTx]: 'Deploy a contract',
  [Tag.NamePreclaimTx]: 'Reserve a name',
  [Tag.NameClaimTx]: 'Claim a name',
  [Tag.NameUpdateTx]: 'Update a name',
  [Tag.NameTransferTx]: 'Transfer a name',
  [Tag.PayingForTx]: 'Pay fees for another transaction',
};

/** Decoded, human-readable view of `tx`, or `null` when it cannot be decoded. */
export function summarizeTransaction(tx: string): TxSummary | null {
  let unpacked: Record<string, unknown> & { tag: Tag };
  try {
    unpacked = unpackTx(tx as Parameters<typeof unpackTx>[0]) as unknown as
      Record<string, unknown> & { tag: Tag };
  } catch {
    return null;
  }

  const { tag } = unpacked;
  const rows = [
    textRow('To', unpacked.recipientId, true),
    amountRow('Amount', unpacked.amount, true),
    textRow('Contract', unpacked.contractId),
    textRow('Name', unpacked.name),
    textRow('From', unpacked.senderId ?? unpacked.accountId ?? unpacked.callerId ?? unpacked.ownerId),
    amountRow('Network fee', unpacked.fee),
    textRow('Nonce', asBigInt(unpacked.nonce)?.toString()),
  ].filter((row): row is TxSummaryRow => row !== null);

  return { title: TITLES[tag] ?? Tag[tag] ?? `Transaction (tag ${String(tag)})`, rows };
}
