/* eslint-disable max-len */
import { CONFIG } from '../config';

type ProfileEditablePayload = {
  fullname?: string;
  bio?: string;
  nostrkey?: string;
  avatarurl?: string;
  username?: string;
  x_username?: string;
  chain_name?: string;
  sol_name?: string;
};

type ProfileChallengeResponse = {
  challenge: string;
  payload_hash: string;
  expires_at: string;
  ttl_seconds: number;
};

type ProfileUpdateResponse = {
  address: string;
  fullname: string | null;
  bio: string | null;
  nostrkey: string | null;
  avatarurl: string | null;
  username: string | null;
  x_username: string | null;
  chain_name: string | null;
  sol_name: string | null;
  created_at: string;
  updated_at: string;
};

type DisplaySource = 'custom' | 'chain' | 'x';

type ProfilePayload = {
  fullname: string;
  bio: string;
  avatarurl: string;
  username: string | null;
  x_username: string | null;
  chain_name: string | null;
  display_source: DisplaySource | null;
  chain_expires_at: string | null;
};

export type ProfileAggregate = {
  address: string;
  profile: ProfilePayload;
  public_name: string | null;
};

export type AccountLinks = {
  x?: string | null;
  bio?: string | null;
  /** Linked via POST /api/address-links/prefered-aens-name */
  prefaens?: string | null;
  prefered_aens_name?: string | null;
  /** Website/domain linked via POST /api/address-links/site */
  site?: string | null;
};

export type AccountAggregate = {
  address: string;
  bio?: string | null;
  chain_name?: string | null;
  chain_name_updated_at?: string | null;
  links?: AccountLinks | null;
  profile?: ProfilePayload | null;
  public_name?: string | null;
  x_username?: string | null;
};

/** X link username from GET /api/accounts/:address (`links.x`, then profile fallback). */
export function getLinkedXUsername(
  account?: Pick<AccountAggregate, 'links' | 'profile' | 'x_username'> | null,
): string | null {
  const fromLinks = String(account?.links?.x ?? '').trim();
  if (fromLinks) return fromLinks.replace(/^@/u, '');
  const fromProfile = String(account?.profile?.x_username ?? '').trim();
  if (fromProfile) return fromProfile.replace(/^@/u, '');
  const legacy = String(account?.x_username ?? '').trim();
  if (legacy) return legacy.replace(/^@/u, '');
  return null;
}

export function isXLinked(
  account?: Pick<AccountAggregate, 'links' | 'profile' | 'x_username'> | null,
): boolean {
  return Boolean(getLinkedXUsername(account));
}

/** Bio link text from GET /api/accounts/:address (`links.bio`, then profile/account fallbacks). */
export function getLinkedBio(
  account?: Pick<AccountAggregate, 'links' | 'profile' | 'bio'> | null,
): string | null {
  const fromLinks = String(account?.links?.bio ?? '').trim();
  if (fromLinks) return fromLinks;
  const fromProfile = String(account?.profile?.bio ?? '').trim();
  if (fromProfile) return fromProfile;
  const legacy = String(account?.bio ?? '').trim();
  if (legacy) return legacy;
  return null;
}

/** Linked website/domain from GET /api/accounts/:address (`links.site`). */
export function getLinkedSite(
  account?: Pick<AccountAggregate, 'links'> | null,
): string | null {
  const fromLinks = String(account?.links?.site ?? '').trim();
  if (fromLinks) return fromLinks;
  return null;
}

const normalizePreferredAensName = (value: string) => value.trim().toLowerCase();

const readPreferredAensNameFromLinks = (
  links?: AccountLinks | Record<string, unknown> | null,
): string => {
  if (!links || typeof links !== 'object') return '';
  const record = links as Record<string, unknown>;
  return String(
    record.prefaens
    ?? record.prefered_aens_name
    ?? record['prefered-aens-name']
    ?? '',
  ).trim();
};

/** Preferred .chain name from account links (then profile/public_name/legacy fallbacks). */
export function getLinkedPreferredAensName(
  account?: Pick<AccountAggregate, 'links' | 'profile' | 'chain_name' | 'public_name'> | null,
): string | null {
  const fromLinks = readPreferredAensNameFromLinks(account?.links);
  if (fromLinks) return normalizePreferredAensName(fromLinks);
  const fromPublic = String(account?.public_name ?? '').trim();
  if (fromPublic.includes('.')) return normalizePreferredAensName(fromPublic);
  const fromProfile = String(account?.profile?.chain_name ?? '').trim();
  if (fromProfile) return normalizePreferredAensName(fromProfile);
  const legacy = String(account?.chain_name ?? '').trim();
  if (legacy) return normalizePreferredAensName(legacy);
  return null;
}

type ProfileSource = Pick<
AccountAggregate,
'address' | 'links' | 'profile' | 'bio' | 'public_name' | 'x_username' | 'chain_name'
>;

const emptyProfilePayload = (): ProfilePayload => ({
  fullname: '',
  bio: '',
  avatarurl: '',
  username: null,
  x_username: null,
  chain_name: null,
  display_source: null,
  chain_expires_at: null,
});

/** Merge account (links.bio) and profile API payloads into a single aggregate for UI cache. */
export function profileAggregateFromSources(
  source: ProfileSource,
  fallback?: ProfileAggregate | ProfileSource | null,
): ProfileAggregate {
  const fallbackProfile = (
    fallback && 'profile' in fallback ? fallback.profile : null
  ) ?? ('profile' in (source || {}) ? source.profile : null);
  const linkedBio = getLinkedBio(source);
  const linkedPreferredAensName = getLinkedPreferredAensName(source);
  return {
    address: source.address,
    public_name: linkedPreferredAensName
      ?? source.public_name
      ?? (fallback && 'public_name' in fallback ? fallback.public_name : null)
      ?? null,
    profile: {
      ...emptyProfilePayload(),
      ...fallbackProfile,
      ...source.profile,
      bio: linkedBio ?? fallbackProfile?.bio ?? '',
      x_username: source.profile?.x_username
        ?? source.x_username
        ?? fallbackProfile?.x_username
        ?? null,
      chain_name: linkedPreferredAensName
        ?? source.profile?.chain_name
        ?? source.chain_name
        ?? fallbackProfile?.chain_name
        ?? null,
    },
  };
}

/** Resolve linked bio for React Query account cache after a profile save. */
export function resolveLinkedBioForCache(
  opts: {
    bioChanged: boolean;
    formBio: string;
    updated?: Pick<AccountAggregate, 'links' | 'profile' | 'bio'> | null;
    previous?: Pick<AccountAggregate, 'links' | 'profile' | 'bio'> | null;
  },
): string | null {
  if (opts.bioChanged) return opts.formBio.trim() || null;
  return getLinkedBio(opts.updated) ?? getLinkedBio(opts.previous);
}

/** Resolve linked preferred .chain name for React Query account cache after a profile save. */
export function resolveLinkedPreferredAensNameForCache(
  opts: {
    chainNameChanged: boolean;
    formChainName: string;
    updated?: Pick<AccountAggregate, 'links' | 'profile' | 'chain_name' | 'public_name'> | null;
    previous?: Pick<AccountAggregate, 'links' | 'profile' | 'chain_name' | 'public_name'> | null;
  },
): string | null {
  if (opts.chainNameChanged) return opts.formChainName.trim() || null;
  return getLinkedPreferredAensName(opts.updated) ?? getLinkedPreferredAensName(opts.previous);
}

export function patchAccountCacheEntry(
  prev: Record<string, unknown> | null | undefined,
  opts: {
    updatedProfile?: ProfileAggregate | null;
    bioChanged?: boolean;
    formBio?: string;
    chainNameChanged?: boolean;
    formChainName?: string;
  },
): Record<string, unknown> {
  const bioChanged = Boolean(opts.bioChanged);
  const chainNameChanged = Boolean(opts.chainNameChanged);
  const linkedXUsername = getLinkedXUsername(opts.updatedProfile)
    ?? getLinkedXUsername(prev as AccountAggregate | null);
  const linkedBio = resolveLinkedBioForCache({
    bioChanged,
    formBio: opts.formBio ?? '',
    updated: opts.updatedProfile,
    previous: prev as AccountAggregate | null,
  });
  const linkedPreferredAensName = resolveLinkedPreferredAensNameForCache({
    chainNameChanged,
    formChainName: opts.formChainName ?? '',
    updated: opts.updatedProfile,
    previous: prev as AccountAggregate | null,
  });
  let bioLinkPatch: Record<string, unknown> = {};
  if (linkedBio != null) {
    bioLinkPatch = { bio: linkedBio };
  } else if (bioChanged) {
    bioLinkPatch = { bio: null };
  }
  let preferredNameLinkPatch: Record<string, unknown> = {};
  if (linkedPreferredAensName != null) {
    preferredNameLinkPatch = {
      prefaens: linkedPreferredAensName,
      prefered_aens_name: linkedPreferredAensName,
    };
  } else if (chainNameChanged) {
    preferredNameLinkPatch = { prefaens: null, prefered_aens_name: null };
  }
  const profileBio = bioChanged
    ? (linkedBio ?? '')
    : (linkedBio ?? opts.updatedProfile?.profile?.bio);
  const profileChainName = chainNameChanged
    ? (linkedPreferredAensName ?? '')
    : (linkedPreferredAensName ?? opts.updatedProfile?.profile?.chain_name);
  return {
    ...prev,
    bio: bioChanged ? linkedBio : (linkedBio ?? (prev as AccountAggregate)?.bio),
    fullname: opts.updatedProfile?.profile?.fullname ?? (prev as AccountAggregate)?.fullname,
    avatarurl: opts.updatedProfile?.profile?.avatarurl ?? (prev as AccountAggregate)?.avatarurl,
    username: opts.updatedProfile?.profile?.username ?? (prev as AccountAggregate)?.username,
    chain_name: chainNameChanged
      ? linkedPreferredAensName
      : (linkedPreferredAensName ?? (prev as AccountAggregate)?.chain_name),
    public_name: chainNameChanged
      ? linkedPreferredAensName
      : (linkedPreferredAensName ?? (prev as AccountAggregate)?.public_name),
    x_username: linkedXUsername ?? (prev as AccountAggregate)?.x_username,
    links: {
      ...(prev as AccountAggregate)?.links,
      ...(linkedXUsername ? { x: linkedXUsername } : {}),
      ...bioLinkPatch,
      ...preferredNameLinkPatch,
    },
    profile: opts.updatedProfile?.profile
      ? {
        ...(prev as AccountAggregate)?.profile,
        ...opts.updatedProfile.profile,
        bio: profileBio ?? opts.updatedProfile.profile.bio,
        chain_name: profileChainName ?? opts.updatedProfile.profile.chain_name,
      }
      : (prev as AccountAggregate)?.profile,
  };
}

export type AddressLinkClaimResponse = {
  message: string;
  nonce: number;
  value: string;
  verification_token: string;
};

export type AddressLinkSubmitResponse = {
  txHash: string;
};

export type AddressLinkUnclaimResponse = {
  message: string;
  nonce: number;
};

export type XAddressLinkClaimResponse = AddressLinkClaimResponse;
export type XAddressLinkSubmitResponse = AddressLinkSubmitResponse;
export type XAddressLinkUnclaimResponse = AddressLinkUnclaimResponse;

export type ChainNameChallengeResponse = {
  nonce: string;
  expires_at: string | number;
  message: string;
};

export type ChainNameClaimRequest = {
  address: string;
  name: string;
  challenge_nonce: string;
  challenge_expires_at: string;
  signature_hex: string;
};

export type ChainNameClaimResponse = {
  status: string;
  message?: string | null;
};

export type ChainNameClaimStatusResponse = {
  status: string;
  name?: string | null;
  error?: string | null;
  preclaim_tx_hash?: string | null;
  claim_tx_hash?: string | null;
  update_tx_hash?: string | null;
  transfer_tx_hash?: string | null;
  expires_at?: string | number | null;
  approximate_expire_time?: string | number | null;
  approximateExpireTime?: string | number | null;
  expire_time?: string | number | null;
  expireTime?: string | number | null;
};

export type ChainNameSponsorshipResponse = {
  name: string;
  /** true when the sponsor account can fund the claim (claim is free for the user) */
  sponsorable: boolean;
  sponsor_configured: boolean;
  sponsor_balance_aettos: string | null;
  /** total estimated on-chain cost (preclaim + claim + update + transfer), in aettos */
  required_balance_aettos: string;
  reason: string | null;
};

/** Challenge bound to an address; the wallet signs `message` to prove ownership. */
export type XPostingRewardChallengeResponse = {
  nonce: string;
  expires_at: string | number;
  message: string;
};

export type XPostingRewardOnboardingStatus =
  | 'not_started'
  | 'pending'
  | 'paid'
  | 'failed';

/** Read-only reward status (GET) and the body returned by a successful recheck. */
export type XPostingRewardStatus = {
  onboarding_status: XPostingRewardOnboardingStatus | string;
  qualified_posts_count?: number;
  tx_hash?: string | null;
  next_check_allowed_at?: string | number | null;
  // Fields surfaced by the rewards UI (X posting reward redesign).
  status?: XPostingRewardOnboardingStatus | string;
  x_username?: string | null;
  per_post_total_paid_count?: number;
  current_streak_days?: number;
  tier_amount_ae?: number;
  follower_count?: number;
  referral_link?: string | null;
  // Human-readable reason a reward was NOT sent, returned even on a successful
  // (HTTP 200) recheck — e.g. below the follower minimum, the X identity is
  // already rewarded, or the payout failed. Null when there is nothing to report.
  error?: string | null;
};

/**
 * Result of a recheck submit. On the 24h-cap (HTTP 429) the scan is skipped and
 * `nextAllowedAt` carries when the next check is permitted.
 */
export type XPostingRewardRecheckResult =
  | { rateLimited: false; status: XPostingRewardStatus }
  | { rateLimited: true; nextAllowedAt: string | number | null };

/** Challenge issued before a manual recheck; the wallet signs `message` to authorize the scan. */
export type XRecheckChallengeResponse = XPostingRewardChallengeResponse;

/** Signed proof of address ownership submitted with a recheck or referral-link request. */
export type XSignedProof = {
  challenge_nonce: string;
  challenge_expires_at: string;
  signature_hex: string;
};

/** Referral link issued for a qualifying X-linked account. */
export type XReferralLinkResponse = {
  link: string;
};

// Superhero API client
export const SuperheroApi = {
  async fetchJson(path: string, init?: RequestInit) {
    const base = (CONFIG.SUPERHERO_API_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('SUPERHERO_API_URL not configured');
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    // Create timeout controller if no signal provided
    let timeoutController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    if (!init?.signal && typeof AbortController !== 'undefined') {
      timeoutController = new AbortController();
      // Increased timeout to 90 seconds for portfolio data queries that process large date ranges
      timeoutId = setTimeout(() => timeoutController!.abort(), 90000); // 90 second timeout
    }

    try {
      const res = await fetch(url, {
        ...init,
        signal: init?.signal || timeoutController?.signal,
      });

      // Clear timeout if request succeeded
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        let errorMessage = `Request failed with status ${res.status}`;
        try {
          const body = await res.text();
          if (body) {
            // Try to parse as JSON for better error messages
            try {
              const json = JSON.parse(body);
              errorMessage = json.message || json.error || errorMessage;
            } catch {
              errorMessage = body.length > 200 ? `${body.substring(0, 200)}...` : body;
            }
          }
        } catch {
          // If we can't read the body, use the status text
          errorMessage = res.statusText || errorMessage;
        }

        const error = new Error(`Superhero API error (${res.status}): ${errorMessage}`);
        throw error;
      }

      // Check if response has content before trying to parse JSON
      const contentType = res.headers.get('content-type');
      const contentLength = res.headers.get('content-length');

      if (contentLength === '0' || (!contentType?.includes('application/json') && !contentType?.includes('text/json'))) {
        // Return null for empty responses instead of throwing
        return null;
      }

      const text = await res.text();
      if (!text || text.trim().length === 0) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from ${url}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (err) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Enhanced error handling for network errors and timeouts
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          const timeoutError = new Error('Request timeout: The API request took too long. Please try again.');
          throw timeoutError;
        }
        if (err instanceof TypeError && err.message.includes('fetch')) {
          const networkError = new Error('Network error: Unable to connect to API. Please check your internet connection.');
          throw networkError;
        }
      }
      // Re-throw if it's already our custom error or other errors
      throw err;
    }
  },
  listPopularPosts(params: {
    page?: number;
    limit?: number;
    seed?: number;
    weights?: Partial<Record<
      'comments'|'tipsAmountAE'|'tipsCount'|'uniqueTippers'|'trendingBoost'|'contentQuality'|'reads'|'interactionsPerHour'|'freshness'|'randomness',
      'low'|'med'|'high'
    >>;
  } = {}) {
    const qp = new URLSearchParams();
    if (params.page != null) qp.set('page', String(params.page));
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.seed != null) qp.set('seed', String(params.seed));
    if (params.weights) {
      Object.entries(params.weights).forEach(([key, value]) => {
        if (value) qp.set(key, value);
      });
    }
    const query = qp.toString();
    return this.fetchJson(`/api/posts/popular${query ? `?${query}` : ''}`);
  },
  // GET /api/tips/posts/{postId}/summary
  getPostTipSummary(postId: string) {
    return this.fetchJson(`/api/tips/posts/${encodeURIComponent(postId)}/summary`);
  },
  // GET /api/factory - returns active community factory schema (address, collections, rules)
  getFactory() {
    return this.fetchJson('/api/factory');
  },
  // GET /api/trending-tags?order_by=score&order_direction=DESC&limit=100
  listTrendingTags(params: { orderBy?: 'score'|'source'|'token_sale_address'|'created_at'; orderDirection?: 'ASC'|'DESC'; limit?: number; page?: number; search?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.search) qp.set('search', params.search);
    const query = qp.toString();
    return this.fetchJson(`/api/trending-tags${query ? `?${query}` : ''}`);
  },
  // Topics API helpers
  // GET /api/topics/name/{name} — expects raw topic (no leading '#')
  // We accept either form and normalize by stripping a leading '#'.
  getTopicByName(name: string) {
    const topic = String(name || '').replace(/^#/, '');
    const encoded = encodeURIComponent(topic);
    return this.fetchJson(`/api/topics/name/${encoded}`);
  },
  // GET /api/tokens?order_by=market_cap&order_direction=DESC
  listTokens(params: { orderBy?: 'name'|'price'|'market_cap'|'created_at'|'holders_count'|'trending_score'; orderDirection?: 'ASC'|'DESC'; collection?: string; limit?: number; page?: number; search?: string; ownerAddress?: string; creatorAddress?: string; factoryAddress?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.collection) qp.set('collection', params.collection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.search) qp.set('search', params.search);
    if (params.ownerAddress) qp.set('owner_address', params.ownerAddress);
    if (params.creatorAddress) qp.set('creator_address', params.creatorAddress);
    if (params.factoryAddress) qp.set('factory_address', params.factoryAddress);
    const query = qp.toString();
    return this.fetchJson(`/api/tokens${query ? `?${query}` : ''}`);
  },
  getToken(address: string) { return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}`); },
  getTokenPerformance(address: string) { return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}/performance`); },
  listTokenHolders(address: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}/holders${query ? `?${query}` : ''}`);
  },
  // Token transactions
  // Backend expects /api/transactions?token_address=<sale_address>
  listTokenTransactions(addressOrSaleAddress: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    qp.set('token_address', addressOrSaleAddress);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    return this.fetchJson(`/api/transactions?${qp.toString()}`);
  },
  getTokenScore(address: string) { return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}/score`); },
  listTokenRankings(address: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}/rankings${query ? `?${query}` : ''}`);
  },
  // Accounts tokens
  listAccountTokens(address: string, params: { orderBy?: 'balance'; orderDirection?: 'ASC'|'DESC'; limit?: number; page?: number; search?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.search) qp.set('search', params.search);
    const query = qp.toString();
    return this.fetchJson(`/api/accounts/${encodeURIComponent(address)}/tokens${query ? `?${query}` : ''}`);
  },
  // Analytics helpers
  listDailyCreatedTokensCount(startDate?: string, endDate?: string) {
    const qp = new URLSearchParams();
    if (startDate) qp.set('start_date', startDate);
    if (endDate) qp.set('end_date', endDate);
    const query = qp.toString();
    return this.fetchJson(`/api/analytics/daily-created-tokens-count${query ? `?${query}` : ''}`);
  },
  listDailyTradeVolume(startDate?: string, endDate?: string, tokenAddress?: string, accountAddress?: string) {
    const qp = new URLSearchParams();
    if (startDate) qp.set('start_date', startDate);
    if (endDate) qp.set('end_date', endDate);
    if (tokenAddress) qp.set('token_address', tokenAddress);
    if (accountAddress) qp.set('account_address', accountAddress);
    const query = qp.toString();
    return this.fetchJson(`/api/analytics/daily-trade-volume${query ? `?${query}` : ''}`);
  },
  listDailyUniqueActiveUsers(startDate?: string, endDate?: string, tokenAddress?: string) {
    const qp = new URLSearchParams();
    if (startDate) qp.set('start_date', startDate);
    if (endDate) qp.set('end_date', endDate);
    if (tokenAddress) qp.set('token_address', tokenAddress);
    const query = qp.toString();
    return this.fetchJson(`/api/analytics/daily-unique-active-users${query ? `?${query}` : ''}`);
  },
  // Price history / candles
  getTokenHistory(address: string, params: { interval?: number; convertTo?: 'ae'|'usd'|'eur'|'aud'|'brl'|'cad'|'chf'|'gbp'|'xau'; limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.interval != null) qp.set('interval', String(params.interval));
    if (params.convertTo) qp.set('convertTo', params.convertTo);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/tokens/${encodeURIComponent(address)}/history${query ? `?${query}` : ''}`);
  },
  // Portfolio history
  getAccountPortfolioHistory(address: string, params: { startDate?: string; endDate?: string; interval?: number; convertTo?: 'ae'|'usd'|'eur'|'aud'|'brl'|'cad'|'chf'|'gbp'|'xau'; include?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.startDate) qp.set('startDate', params.startDate);
    if (params.endDate) qp.set('endDate', params.endDate);
    if (params.interval != null) qp.set('interval', String(params.interval));
    if (params.convertTo) qp.set('convertTo', params.convertTo);
    if (params.include) qp.set('include', params.include);
    const query = qp.toString();
    return this.fetchJson(`/api/accounts/${encodeURIComponent(address)}/portfolio/history${query ? `?${query}` : ''}`);
  },
  // Accounts leaderboard and details
  listAccounts(params: { orderBy?: 'total_volume'|'total_tx_count'|'total_buy_tx_count'|'total_sell_tx_count'|'total_created_tokens'|'total_invitation_count'|'total_claimed_invitation_count'|'total_revoked_invitation_count'|'created_at'; orderDirection?: 'ASC'|'DESC'; limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    return this.fetchJson(`/api/accounts?${qp.toString()}`);
  },
  getAccount(address: string) {
    return this.fetchJson(`/api/accounts/${encodeURIComponent(address)}`) as Promise<AccountAggregate>;
  },
  // Invitations
  listInvitations(params: { orderBy?: 'amount'|'created_at'; orderDirection?: 'ASC'|'DESC'; limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    return this.fetchJson(`/api/invitations?${qp.toString()}`);
  },
  // Analytics
  getTotalMarketCap() { return this.fetchJson('/api/analytics/total-market-cap'); },
  getTotalCreatedTokens() { return this.fetchJson('/api/analytics/total-created-tokens'); },
  listDailyMarketCapSum(params: { startDate?: string; endDate?: string; tokenSaleAddresses?: string[] } = {}) {
    const qp = new URLSearchParams();
    if (params.startDate) qp.set('start_date', params.startDate);
    if (params.endDate) qp.set('end_date', params.endDate);
    if (params.tokenSaleAddresses) qp.set('token_sale_addresses', (params.tokenSaleAddresses as any));
    return this.fetchJson(`/api/analytics/daily-market-cap-sum?${qp.toString()}`);
  },
  // Coins endpoints
  getCurrencyRates() {
    return this.fetchJson('/api/coins/aeternity/rates');
  },
  getMarketData(currency: string = 'usd') {
    const qp = new URLSearchParams();
    if (currency) qp.set('currency', currency);
    return this.fetchJson(`/api/coins/aeternity/market-data?${qp.toString()}`);
  },
  // Posts endpoints
  listPosts(params: { limit?: number; page?: number; orderBy?: 'total_comments'|'created_at'; orderDirection?: 'ASC'|'DESC'; search?: string; accountAddress?: string; topics?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.search) qp.set('search', params.search);
    if (params.accountAddress) qp.set('account_address', params.accountAddress);
    if (params.topics) qp.set('topics', params.topics);
    const query = qp.toString();
    return this.fetchJson(`/api/posts${query ? `?${query}` : ''}`);
  },
  getProfile(address: string, includeOnChain?: boolean) {
    const qp = new URLSearchParams();
    if (includeOnChain != null) qp.set('includeOnChain', String(includeOnChain));
    const query = qp.toString();
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}${query ? `?${query}` : ''}`) as Promise<ProfileAggregate>;
  },
  getProfilesByAddresses(addresses: string[], includeOnChain?: boolean) {
    const qp = new URLSearchParams();
    if (addresses.length) qp.set('addresses', addresses.join(','));
    if (includeOnChain != null) qp.set('includeOnChain', String(includeOnChain));
    return this.fetchJson(`/api/profile?${qp.toString()}`) as Promise<ProfileAggregate[]>;
  },
  claimXAddressLink(address: string, accessToken: string) {
    return this.fetchJson('/api/address-links/x/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        x_access_token: accessToken,
      }),
    }) as Promise<XAddressLinkClaimResponse>;
  },
  createChainNameChallenge(address: string) {
    return this.fetchJson('/api/profile/chain-name/challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
      }),
    }) as Promise<ChainNameChallengeResponse>;
  },
  claimChainName(payload: ChainNameClaimRequest) {
    return this.fetchJson('/api/profile/chain-name/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<ChainNameClaimResponse>;
  },
  getChainNameClaimStatus(address: string) {
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}/chain-name-claim`) as Promise<ChainNameClaimStatusResponse>;
  },
  /** Ask for a signature challenge bound to `address` for the X-posting reward recheck. */
  createXPostingRewardRecheckChallenge(address: string) {
    return this.fetchJson('/api/profile/x-posting-reward/recheck-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    }) as Promise<XPostingRewardChallengeResponse>;
  },
  /** Read the reward status without triggering a scan (no signature, no X-API cost). */
  getXPostingRewardStatus(address: string) {
    return this.fetchJson(
      `/api/profile/${encodeURIComponent(address)}/x-posting-reward`,
    ) as Promise<XPostingRewardStatus>;
  },
  /**
   * Submit the signed challenge to run the (once-per-24h) capped X scan.
   * Returns the reward status, or `{ rateLimited: true }` when the daily cap is hit (HTTP 429).
   */
  async recheckXPostingReward(payload: {
    address: string;
    challenge_nonce: string;
    challenge_expires_at: string;
    signature_hex: string;
  }): Promise<XPostingRewardRecheckResult> {
    const base = (CONFIG.SUPERHERO_API_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('SUPERHERO_API_URL not configured');
    const { address, ...body } = payload;
    const res = await fetch(
      `${base}/api/profile/${encodeURIComponent(address)}/x-posting-reward/recheck`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (res.status === 429) {
      const capBody = await res.json().catch(() => ({} as Record<string, unknown>));
      return {
        rateLimited: true,
        nextAllowedAt: (capBody.nextAllowedAt as string | number | null) ?? null,
      };
    }
    if (!res.ok) {
      throw new Error(`Reward check failed with status ${res.status}`);
    }
    const status = (await res.json()) as XPostingRewardStatus;
    return { rateLimited: false, status };
  },
  /** Check whether the sponsor account can fund a chain name claim. `name` is the label without `.chain`. */
  checkChainNameSponsorship(name: string) {
    return this.fetchJson(
      `/api/profile/chain-name/sponsorship/${encodeURIComponent(name)}`,
    ) as Promise<ChainNameSponsorshipResponse>;
  },
  /** Exchange OAuth code (from X redirect) for an X address-link claim; backend swaps the code for a token and creates the claim. */
  claimXAddressLinkFromCode(
    address: string,
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ) {
    return this.fetchJson('/api/address-links/x/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        x_code: code,
        x_code_verifier: codeVerifier,
        x_redirect_uri: redirectUri,
      }),
    }) as Promise<XAddressLinkClaimResponse>;
  },
  submitXAddressLink(payload: {
    address: string;
    value: string;
    nonce: number;
    signature: string;
    verification_token: string;
  }) {
    return this.fetchJson('/api/address-links/x/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<XAddressLinkSubmitResponse>;
  },
  unclaimXAddressLink(address: string) {
    return this.fetchJson('/api/address-links/x/unclaim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    }) as Promise<XAddressLinkUnclaimResponse>;
  },
  submitXAddressLinkUnclaim(payload: {
    address: string;
    nonce: number;
    signature: string;
  }) {
    return this.fetchJson('/api/address-links/x/unclaim/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<XAddressLinkSubmitResponse>;
  },
  claimBioAddressLink(address: string, value: string) {
    return this.fetchJson('/api/address-links/bio/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, value }),
    }) as Promise<AddressLinkClaimResponse>;
  },
  submitBioAddressLink(payload: {
    address: string;
    value: string;
    nonce: number;
    signature: string;
    verification_token: string;
  }) {
    return this.fetchJson('/api/address-links/bio/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  unclaimBioAddressLink(address: string) {
    return this.fetchJson('/api/address-links/bio/unclaim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    }) as Promise<AddressLinkUnclaimResponse>;
  },
  submitBioAddressLinkUnclaim(payload: {
    address: string;
    nonce: number;
    signature: string;
  }) {
    return this.fetchJson('/api/address-links/bio/unclaim/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  claimPreferredAensNameAddressLink(address: string, value: string) {
    return this.fetchJson('/api/address-links/prefered-aens-name/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, value }),
    }) as Promise<AddressLinkClaimResponse>;
  },
  submitPreferredAensNameAddressLink(payload: {
    address: string;
    value: string;
    nonce: number;
    signature: string;
    verification_token: string;
  }) {
    return this.fetchJson('/api/address-links/prefered-aens-name/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  unclaimPreferredAensNameAddressLink(address: string) {
    return this.fetchJson('/api/address-links/prefered-aens-name/unclaim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    }) as Promise<AddressLinkUnclaimResponse>;
  },
  submitPreferredAensNameAddressLinkUnclaim(payload: {
    address: string;
    nonce: number;
    signature: string;
  }) {
    return this.fetchJson('/api/address-links/prefered-aens-name/unclaim/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  claimSiteAddressLink(address: string, value: string) {
    return this.fetchJson('/api/address-links/site/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, value }),
    }) as Promise<AddressLinkClaimResponse>;
  },
  submitSiteAddressLink(payload: {
    address: string;
    value: string;
    nonce: number;
    signature: string;
    verification_token: string;
  }) {
    return this.fetchJson('/api/address-links/site/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  unclaimSiteAddressLink(address: string) {
    return this.fetchJson('/api/address-links/site/unclaim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    }) as Promise<AddressLinkUnclaimResponse>;
  },
  submitSiteAddressLinkUnclaim(payload: {
    address: string;
    nonce: number;
    signature: string;
  }) {
    return this.fetchJson('/api/address-links/site/unclaim/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<AddressLinkSubmitResponse>;
  },
  // X Posting Reward endpoints (recheck challenge, manual recheck, referral link).
  // `getXPostingRewardStatus` is defined above (read-only status).
  createXRecheckChallenge(address: string) {
    return this.fetchJson('/api/profile/x-posting-reward/recheck-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    }) as Promise<XRecheckChallengeResponse>;
  },
  runXPostingRewardRecheck(address: string, proof: XSignedProof) {
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}/x-posting-reward/recheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    }) as Promise<XPostingRewardStatus>;
  },
  getXReferralLink(address: string, proof: XSignedProof) {
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}/x-reward/referral-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    }) as Promise<XReferralLinkResponse>;
  },
  /** @deprecated Legacy profile update flow; use on-chain writes instead. */
  issueProfileChallenge(address: string, payload: ProfileEditablePayload) {
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<ProfileChallengeResponse>;
  },
  updateProfile(
    address: string,
    payload: ProfileEditablePayload & { challenge: string; signature: string },
  ) {
    return this.fetchJson(`/api/profile/${encodeURIComponent(address)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }) as Promise<ProfileUpdateResponse>;
  },
};
