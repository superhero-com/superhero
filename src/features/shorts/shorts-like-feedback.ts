export type LikePhase = 'connecting' | 'signing' | 'cancelled' | 'error';

export function likeFailurePhase(error: unknown): 'cancelled' | 'error' {
  const value = error as { name?: string; message?: string } | null;
  return value?.name === 'RpcRejectedByUserError'
    || /cancelled|canceled|rejected by user|user rejected|user denied/i.test(value?.message || '')
    ? 'cancelled' : 'error';
}
