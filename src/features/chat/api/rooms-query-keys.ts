/**
 * React Query keys for the token-gated rooms control plane. Local to the chat
 * feature — the web app has no shared `QUERY_KEYS` registry, so the mobile
 * `@/lib/query-keys` entries are reproduced here with the same shape (keyed by
 * the active account address / sale address) so cache invalidation across the
 * rooms hooks lines up.
 */
export const roomsQueryKeys = {
  config: ['rooms', 'config'] as const,
  list: (address: string | undefined) => ['rooms', 'list', address] as const,
  members: (saleAddress: string, includePending: boolean) => ['rooms', 'members', saleAddress, includePending] as const,
  mute: (saleAddress: string | undefined, address: string | undefined) => ['rooms', 'mute', saleAddress, address] as const,
};
