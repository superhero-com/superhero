import BigNumber from 'bignumber.js';
import { CONFIG } from '@/config';

/** What the blockchain itself says about one reward payout. */
export type OnChainPayout = {
  /** In a block. A transaction still waiting for one is not. */
  mined: boolean;
  /** Mined, a plain spend, and sent to the wallet we asked about. */
  verified: boolean;
  /** Decimal AE actually transferred, when `verified`. */
  amountAe: string | null;
  /** ISO time of the block it landed in, when `verified` and known. */
  time: string | null;
};

/**
 * "Show all" can render a hundred rows at once. Each reads one transaction, so
 * cap how many are in flight rather than hit a shared public middleware with a
 * hundred requests in the same tick.
 */
const MAX_CONCURRENT_READS = 4;
let inFlight = 0;
const waiting: Array<() => void> = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_CONCURRENT_READS) {
    await new Promise<void>((resolve) => { waiting.push(resolve); });
  }
  inFlight += 1;
  try {
    return await task();
  } finally {
    inFlight -= 1;
    waiting.shift()?.();
  }
}

const stripTrailingSlash = (value?: string) => (value || '').replace(/\/+$/, '');

const readJson = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Pure: turn a `/v3/transactions/:hash` record (middleware or node, requested
 * with `int-as-string=true`) into what the reward history shows.
 *
 * Only a mined SpendTx to `recipient` counts as verified. A hash that resolves
 * to anything else keeps the row on what the API reported, rather than show
 * someone else's transfer as this wallet's reward.
 */
export function parseOnChainPayout(record: any, recipient: string): OnChainPayout {
  const tx = record?.tx ?? {};
  const height = Number(record?.block_height ?? -1);
  const mined = Number.isFinite(height) && height > 0;
  const verified = mined && tx.type === 'SpendTx' && tx.recipient_id === recipient;

  // Amounts arrive as strings (int-as-string): 50 AE is 5e19 aettos, past
  // what a JS number holds exactly.
  const rawAmount = String(tx.amount ?? '');
  const amountAe = verified && /^\d+$/.test(rawAmount)
    ? new BigNumber(rawAmount).shiftedBy(-18).toFixed()
    : null;

  // Only the middleware carries the block time; the node record has none.
  const microTime = Number(record?.micro_time);
  const time = verified && Number.isFinite(microTime) && microTime > 0
    ? new Date(microTime).toISOString()
    : null;

  return {
    mined, verified, amountAe, time,
  };
}

/**
 * Read one payout straight from the chain: the middleware first, because it is
 * the only source with the block time, then the node, which still settles
 * whether the money arrived and how much. Null when neither answers, so the
 * caller falls back to what the API reported.
 */
export async function fetchOnChainPayout(
  txHash: string,
  recipient: string,
): Promise<OnChainPayout | null> {
  const path = `/v3/transactions/${encodeURIComponent(txHash)}?int-as-string=true`;
  const record = await limited(async () => {
    const middleware = stripTrailingSlash(CONFIG.MIDDLEWARE_URL);
    const node = stripTrailingSlash(CONFIG.NODE_URL);
    return (middleware && await readJson(`${middleware}${path}`))
      || (node && await readJson(`${node}${path}`))
      || null;
  });
  return record ? parseOnChainPayout(record, recipient) : null;
}
