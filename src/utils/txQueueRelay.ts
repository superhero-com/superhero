import { unpackTx, type Encoded } from '@aeternity/aepp-sdk';
import { safeLocalStringStorage } from './jotaiSafeLocalStorage';

/**
 * Wallet callbacks land on `/tx-queue/:id`, usually in a different tab from the
 * one that asked for the signature (the wallet app re-opens the browser on the
 * callback URL). The requesting tab normally picks the result up through shared
 * localStorage or a BroadcastChannel. iOS Safari Private Browsing gives every tab
 * its own storage and BroadcastChannel scope, so neither reaches the requesting
 * tab and it keeps waiting for a result that never arrives.
 *
 * To handle that, the requesting tab leaves a "pending" marker in localStorage.
 * A callback tab that cannot see the marker knows it is cut off from the
 * requester, so it posts the signed transaction to the node itself. The
 * requesting tab watches the account nonce and stops waiting once the
 * transaction has been used on chain.
 */

export const TX_QUEUE_PENDING_PREFIX = 'txQueue:pending:';

/** Query param on the wallet success URL: the signed tx can be posted to the node as-is. */
export const TX_QUEUE_BROADCAST_PARAM = 'broadcast';

export const markSignRequestPending = (id: string) => {
  safeLocalStringStorage.setItem(`${TX_QUEUE_PENDING_PREFIX}${id}`, String(Date.now()));
};

export const clearSignRequestPending = (id: string) => {
  safeLocalStringStorage.removeItem(`${TX_QUEUE_PENDING_PREFIX}${id}`);
};

export const isSignRequestVisible = (id: string): boolean => (
  safeLocalStringStorage.getItem(`${TX_QUEUE_PENDING_PREFIX}${id}`) != null
);

/**
 * The callback tab should post the transaction itself only when nobody else
 * will: the request allows it, there is no opener tab polling for it, and the
 * requesting tab's pending marker is not visible from here.
 */
export const shouldBroadcastFromCallback = ({
  id,
  signedTx,
  broadcastAllowed,
  hasOpener,
}: {
  id: string;
  signedTx?: string;
  broadcastAllowed: boolean;
  hasOpener: boolean;
}): boolean => (
  Boolean(signedTx)
  && broadcastAllowed
  && !hasOpener
  && !isSignRequestVisible(id)
);

type PostTransactionNode = {
  postTransaction: (body: { tx: Encoded.Transaction }) => Promise<{ txHash: string }>;
};

export const BROADCAST_TIMEOUT_MS = 20000;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** Post a signed transaction to the node, bounded so the callback page can't hang. */
export const broadcastSignedTransaction = async (
  node: PostTransactionNode,
  signedTx: Encoded.Transaction,
  timeoutMs = BROADCAST_TIMEOUT_MS,
): Promise<string> => {
  const { txHash } = await withTimeout(
    node.postTransaction({ tx: signedTx }),
    timeoutMs,
    'Transaction broadcast timeout',
  );
  return txHash;
};

/** Nonce of an unsigned transaction, or null when it has none / can't be decoded. */
export const getTxNonce = (tx: Encoded.Transaction): number | null => {
  try {
    const nonce = Number((unpackTx(tx) as { nonce?: unknown }).nonce);
    return Number.isInteger(nonce) && nonce > 0 ? nonce : null;
  } catch {
    return null;
  }
};

type AccountNonceNode = {
  getAccountByPubkey: (address: string) => Promise<{ nonce: number | bigint }>;
};

/**
 * True once the account has used `nonce` on chain, i.e. the transaction we are
 * waiting for (or one replacing it) was mined. Errors count as "not yet".
 */
export const isNonceUsed = async (
  node: AccountNonceNode,
  address: string,
  nonce: number,
  timeoutMs = 10000,
): Promise<boolean> => {
  try {
    const account = await withTimeout(
      node.getAccountByPubkey(address),
      timeoutMs,
      'Account lookup timeout',
    );
    return Number(account.nonce) >= nonce;
  } catch {
    return false;
  }
};
