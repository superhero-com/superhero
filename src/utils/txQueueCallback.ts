const TX_QUEUE_CALLBACK_KEY = 'txQueue:nextCallback';
const TX_QUEUE_CALLBACK_TTL_MS = 5 * 60 * 1000;
const ALLOWED_SUCCESS_ACTIONS = new Set(['redirect-post-by-tx']);
export type TxQueueCallbackState = {
  successAction?: string;
  successUrl?: string;
  accountAddress?: string;
  content?: string;
};
type StoredTxQueueCallbackState = TxQueueCallbackState & {
  createdAt: number;
};
export function setNextTxQueueCallback(state: TxQueueCallbackState) {
  sessionStorage.setItem(TX_QUEUE_CALLBACK_KEY, JSON.stringify({
    ...state,
    createdAt: Date.now(),
  }));
}
export function clearNextTxQueueCallback() {
  sessionStorage.removeItem(TX_QUEUE_CALLBACK_KEY);
}
export function consumeNextTxQueueCallback(): TxQueueCallbackState | null {
  try {
    const raw = sessionStorage.getItem(TX_QUEUE_CALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) as StoredTxQueueCallbackState : null;
    if (!parsed) return null;
    if (Date.now() - parsed.createdAt > TX_QUEUE_CALLBACK_TTL_MS) return null;
    if (parsed.successAction && !ALLOWED_SUCCESS_ACTIONS.has(parsed.successAction)) return null;
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _createdAt,
      ...state
    } = parsed;
    return state;
  } catch {
    return null;
  } finally {
    clearNextTxQueueCallback();
  }
}
