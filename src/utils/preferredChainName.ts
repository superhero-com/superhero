import {
  type AccountAggregate,
  getLinkedPreferredAensName,
} from '@/api/backend';

/**
 * The name an account shows, per account address. `pendingUntil` marks a name
 * the user just picked or claimed that the API has not caught up with yet:
 * linking a preferred name and claiming a new one both go through on-chain
 * transactions that the backend only indexes later.
 */
export type PreferredChainNameEntry = {
  name: string | null;
  pendingUntil?: number;
};

export type PreferredChainNames = Record<string, PreferredChainNameEntry>;

/** How long a just-picked name wins over what the API still reports. */
export const PREFERRED_CHAIN_NAME_PENDING_MS = 10 * 60 * 1000;

/** How often to re-read the account while a picked name is still pending. */
export const PREFERRED_CHAIN_NAME_POLL_MS = 5_000;

type AccountLike = Pick<AccountAggregate, 'links' | 'profile' | 'chain_name' | 'public_name'> & {
  profile?: (AccountAggregate['profile'] & { prefered_aens_name?: string | null }) | null;
};

const toChainName = (value: unknown): string | null => {
  const name = String(value ?? '').trim().toLowerCase();
  return name.endsWith('.chain') ? name : null;
};

export type ServerChainName = {
  /** The .chain name the API displays for the account. */
  name: string | null;
  /** The preferred name the account linked, if any. */
  linked: string | null;
};

/**
 * The .chain name the API resolves as the account's display name: the
 * preferred name the user linked wins over the middleware-derived one, which
 * is the newest of the names they own rather than the one they picked.
 */
export function resolveAccountChainName(account?: AccountLike | null): ServerChainName {
  if (!account) return { name: null, linked: null };
  const linked = toChainName(account.links?.prefaens)
    ?? toChainName(account.links?.prefered_aens_name)
    ?? toChainName(account.profile?.prefered_aens_name);
  return {
    name: linked ?? toChainName(getLinkedPreferredAensName(account)),
    linked,
  };
}

export function isPreferredChainNamePending(
  entry: PreferredChainNameEntry | undefined,
  now = Date.now(),
): boolean {
  return Boolean(entry?.pendingUntil && entry.pendingUntil > now);
}

/**
 * Merge what the API reports for `address` into the known names. A pending
 * name is kept until the API reports it (for a pending unlink: until the API
 * reports no linked name) or the pending window runs out; otherwise the API
 * wins.
 */
export function mergeServerChainName(
  prev: PreferredChainNames,
  address: string,
  server: ServerChainName,
  now = Date.now(),
): PreferredChainNames {
  if (!address) return prev;
  const current = prev[address];
  if (isPreferredChainNamePending(current, now)) {
    const confirmed = current?.name ? current.name === server.name : !server.linked;
    if (!confirmed) return prev;
  }
  if (current && !current.pendingUntil && current.name === server.name) return prev;
  return { ...prev, [address]: { name: server.name } };
}

/** Record a name the user just picked or claimed (or `null` for an unlink), ahead of the API. */
export function setPendingChainName(
  prev: PreferredChainNames,
  address: string,
  name: string | null,
  now = Date.now(),
): PreferredChainNames {
  if (!address) return prev;
  return {
    ...prev,
    [address]: {
      name: toChainName(name),
      pendingUntil: now + PREFERRED_CHAIN_NAME_PENDING_MS,
    },
  };
}
