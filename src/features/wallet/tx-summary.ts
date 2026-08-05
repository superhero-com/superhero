/**
 * P4 — WYSIWYS decoding for the in-page signing confirmation (build-plan §3.2
 * step 3, §5.4; threat-model NFR-S "what you see is what you sign").
 *
 * The signer hands the confirmation UI the exact `tx_…` string it is about to
 * sign. Showing that opaque base64 to a user is not consent, so this module
 * decodes it with the SDK's OWN `unpackTx` — the same builder that produced it —
 * into a small set of human-readable rows, and decodes contract calldata with
 * the SDK's own FATE decoder so a token transfer, approval or swap is named in
 * plain language instead of rendered as raw bytes.
 *
 * Deliberate properties:
 *  - **Decode, never re-encode.** We read fields off the unpacked tx; we never
 *    rebuild a tx from the summary. The bytes signed are always the caller's
 *    original string, so a decoding bug can mislead but can never alter what is
 *    signed.
 *  - **Fail closed, never guess.** If the payload cannot be decoded — the
 *    envelope, a contract call's arguments, or a wrapped inner transaction — we
 *    return `null`. The prompt then refuses to offer approval at all: an
 *    undecodable transaction is a reason to refuse, never something to render as
 *    a clean summary and let the user click through. "Show raw bytes and approve
 *    anyway" is the defect this module exists to remove.
 *  - **No network access, no key material.** Pure function over a string. Token
 *    amounts are shown in raw base units, not scaled: decimals are a per-token
 *    on-chain fact this pure decoder cannot know, and inventing a scale would
 *    misstate the amount the user is approving.
 */
import { Tag, unpackTx, hash } from '@aeternity/aepp-sdk';
import { ContractByteArrayEncoder } from '@aeternity/aepp-calldata';

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
  /** Plain-language description of the value-moving effect, when recognised. */
  effect?: string;
  /**
   * A prominent caution: the transaction decoded, but its effect is not a
   * recognised standard shape, so the user must judge it from the raw fields.
   */
  caution?: string;
  /** The wrapped inner transaction of a `PayingForTx` — what is really consented to. */
  inner?: TxSummary;
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
  [Tag.NameRevokeTx]: 'Revoke a name',
  [Tag.PayingForTx]: 'Pay fees for another transaction',
};

type Unpacked = Record<string, unknown> & { tag: Tag };

/**
 * A recognised contract-call function whose value-moving effect can be named.
 * `argRows` maps the decoded, positional FATE arguments to labelled rows;
 * anything it does not consume is still shown by the generic argument renderer.
 */
interface KnownFn {
  title: string;
  effect: string;
  argRows: (args: unknown[]) => (TxSummaryRow | null)[];
}

const stringify = (value: unknown): string => {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(stringify).join(', ')}]`;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    return String(value);
  }
};

/** A token amount in raw base units — decimals are token-specific and unknown here. */
const tokenAmountRow = (label: string, value: unknown, emphasis = true): TxSummaryRow => ({
  label, value: `${stringify(value)} (raw token units)`, emphasis,
});
const addressRow = (label: string, value: unknown, emphasis = true): TxSummaryRow | null => (
  textRow(label, value, emphasis)
);

const KNOWN_FUNCTIONS: Record<string, KnownFn> = {
  transfer: {
    title: 'Send tokens',
    effect: 'Transfers tokens from your account to another account.',
    argRows: (a) => [addressRow('To', a[0]), tokenAmountRow('Amount', a[1])],
  },
  transfer_allowance: {
    title: 'Move tokens using an allowance',
    effect: 'Moves tokens between accounts using a spending allowance.',
    argRows: (a) => [addressRow('From', a[0]), addressRow('To', a[1]), tokenAmountRow('Amount', a[2])],
  },
  create_allowance: {
    title: 'Approve token spending',
    effect: 'Lets another account spend your tokens up to this amount.',
    argRows: (a) => [addressRow('Spender', a[0]), tokenAmountRow('Approved amount', a[1])],
  },
  change_allowance: {
    title: 'Change token spending approval',
    effect: 'Increases or decreases how many of your tokens another account may spend.',
    argRows: (a) => [addressRow('Spender', a[0]), tokenAmountRow('Amount change', a[1])],
  },
  reset_allowance: {
    title: 'Revoke token spending approval',
    effect: 'Removes another account’s permission to spend your tokens.',
    argRows: (a) => [addressRow('Spender', a[0])],
  },
};

// DEX router swaps: named, but their arguments (token paths, deadlines) are shown
// by the generic renderer rather than positionally labelled.
const SWAP_FUNCTIONS = new Set([
  'swap_exact_tokens_for_tokens',
  'swap_tokens_for_exact_tokens',
  'swap_exact_ae_for_tokens',
  'swap_tokens_for_exact_ae',
  'swap_exact_tokens_for_ae',
  'swap_ae_for_exact_tokens',
]);

// Pure Uint8Array → hex: the browser bundle has no Node `Buffer` global, and a
// module-level `Buffer` reference would throw on import and break lazy loading.
const bytesToHex = (bytes: ArrayLike<number>): string => Array.from(bytes)
  .map((b) => (b % 256).toString(16).padStart(2, '0')).join('');

/** hex(blake2b(name)[0..4]) → name, for every function we can name from its calldata selector. */
const SELECTOR_TO_NAME: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const names = [...Object.keys(KNOWN_FUNCTIONS), ...SWAP_FUNCTIONS];
  names.forEach((name) => {
    map.set(bytesToHex(hash(name).subarray(0, 4)), name);
  });
  return map;
})();

const toHex = (bytes: unknown): string | null => {
  if (bytes instanceof Uint8Array) return bytesToHex(bytes);
  // ContractByteArrayEncoder yields the selector as a byte array; be defensive.
  if (Array.isArray(bytes) && bytes.every((b) => typeof b === 'number')) {
    return bytesToHex(bytes as number[]);
  }
  return null;
};

/**
 * Summarise a `ContractCallTx`. Returns `null` when the calldata cannot be
 * decoded — a contract call whose arguments we cannot read is exactly the
 * "cannot explain" case that must fail closed.
 */
function summarizeContractCall(u: Unpacked): TxSummary | null {
  const { callData } = u;
  if (typeof callData !== 'string') return null;

  let decoded: unknown;
  try {
    decoded = new ContractByteArrayEncoder().decode(callData as `cb_${string}`);
  } catch {
    return null;
  }
  if (!Array.isArray(decoded) || decoded.length < 2) return null;

  const selector = toHex(decoded[0]);
  const args = Array.isArray(decoded[1]) ? (decoded[1] as unknown[]) : [decoded[1]];
  if (selector === null) return null;

  const name = SELECTOR_TO_NAME.get(selector);
  const known = name ? KNOWN_FUNCTIONS[name] : undefined;
  const isSwap = name ? SWAP_FUNCTIONS.has(name) : false;

  const envelopeRows: (TxSummaryRow | null)[] = [
    textRow('Contract', u.contractId),
    textRow('From', u.callerId),
    amountRow('AE sent with call', u.amount, (asBigInt(u.amount) ?? 0n) > 0n),
  ];

  let title: string;
  let effect: string | undefined;
  let caution: string | undefined;
  let semanticRows: (TxSummaryRow | null)[];

  if (known) {
    title = known.title;
    effect = known.effect;
    semanticRows = known.argRows(args);
  } else if (isSwap) {
    title = 'Swap tokens';
    effect = 'Swaps one token for another on a decentralised exchange.';
    semanticRows = args.map((arg, i) => ({ label: `Argument ${i + 1}`, value: stringify(arg) }));
  } else {
    title = 'Call a contract';
    caution = 'This calls a contract function that is not a recognised standard one. '
      + 'Only approve it if you started this action and trust this contract.';
    semanticRows = [
      { label: 'Function', value: `unrecognised (0x${selector})` },
      ...args.map((arg, i) => ({ label: `Argument ${i + 1}`, value: stringify(arg) })),
    ];
  }

  const rows = [
    ...semanticRows,
    ...envelopeRows,
    amountRow('Network fee', u.fee),
    textRow('Nonce', asBigInt(u.nonce)?.toString()),
  ].filter((row): row is TxSummaryRow => row !== null);

  return {
    title, rows, effect, caution,
  };
}

/** Depth guard against a pathologically nested `PayingForTx` chain. */
const MAX_DEPTH = 4;

/** Summarise an already-unpacked transaction object. `null` = cannot explain → fail closed. */
function summarizeUnpacked(u: Unpacked, depth: number): TxSummary | null {
  if (depth > MAX_DEPTH) return null;
  const { tag } = u;

  if (tag === Tag.ContractCallTx) return summarizeContractCall(u);

  if (tag === Tag.PayingForTx) {
    // The wrapper pays the fee; the inner tx is what the user actually consents
    // to, so it must decode too — otherwise we cannot explain the transaction.
    const wrapped = u.tx as { encodedTx?: Unpacked } | Unpacked | undefined;
    const innerTx = (wrapped && 'encodedTx' in wrapped ? wrapped.encodedTx : wrapped) as
      Unpacked | undefined;
    if (!innerTx || typeof innerTx.tag !== 'number') return null;
    const inner = summarizeUnpacked(innerTx, depth + 1);
    if (!inner) return null;

    const rows = [
      textRow('Payer', u.payerId, true),
      amountRow('Network fee', u.fee),
      textRow('Nonce', asBigInt(u.nonce)?.toString()),
    ].filter((row): row is TxSummaryRow => row !== null);

    return {
      title: TITLES[Tag.PayingForTx]!,
      rows,
      effect: 'You pay the network fee for the transaction shown below.',
      inner,
    };
  }

  const rows = [
    textRow('To', u.recipientId, true),
    amountRow('Amount', u.amount, true),
    textRow('Contract', u.contractId),
    textRow('Name', u.name),
    textRow('From', u.senderId ?? u.accountId ?? u.callerId ?? u.ownerId),
    amountRow('Network fee', u.fee),
    textRow('Nonce', asBigInt(u.nonce)?.toString()),
  ].filter((row): row is TxSummaryRow => row !== null);

  return { title: TITLES[tag] ?? Tag[tag] ?? `Transaction (tag ${String(tag)})`, rows };
}

/** Decoded, human-readable view of `tx`, or `null` when it cannot be decoded. */
export function summarizeTransaction(tx: string): TxSummary | null {
  let unpacked: Unpacked;
  try {
    unpacked = unpackTx(tx as Parameters<typeof unpackTx>[0]) as unknown as Unpacked;
  } catch {
    return null;
  }
  return summarizeUnpacked(unpacked, 0);
}
