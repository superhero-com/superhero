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

export type XAddressLinkClaimResponse = {
  message: string;
  nonce: number;
  value: string;
  verification_token: string;
};

export type XAddressLinkSubmitResponse = {
  txHash: string;
};

export type XAddressLinkUnclaimResponse = {
  message: string;
  nonce: number;
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
    weights?: Partial<Record<
      'comments'|'tipsAmountAE'|'tipsCount'|'uniqueTippers'|'trendingBoost'|'contentQuality'|'reads'|'interactionsPerHour',
      'low'|'med'|'high'
    >>;
  } = {}) {
    const qp = new URLSearchParams();
    if (params.page != null) qp.set('page', String(params.page));
    if (params.limit != null) qp.set('limit', String(params.limit));
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
  listTokens(params: { orderBy?: 'name'|'price'|'market_cap'|'created_at'|'holders_count'|'trending_score'; orderDirection?: 'ASC'|'DESC'; collection?: 'all'|'word'|'number'; limit?: number; page?: number; search?: string; ownerAddress?: string; creatorAddress?: string; factoryAddress?: string } = {}) {
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
  /** Exchange OAuth code (from X redirect) for an address-link claim challenge. */
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
  /** @deprecated Legacy profile update flow; use on-chain writes instead. */
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
