/* eslint-disable max-len */
import { CONFIG } from '../config';

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
  // GET /api/posts/popular?window=all&page=1&limit=50
  listPopularPosts(params: { window?: '24h'|'7d'|'all'; page?: number; limit?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.window) qp.set('window', params.window);
    if (params.page != null) qp.set('page', String(params.page));
    if (params.limit != null) qp.set('limit', String(params.limit));
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
  getAccount(address: string) { return this.fetchJson(`/api/accounts/${encodeURIComponent(address)}`); },
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
};

// API function for new posts endpoint (legacy helper used by some screens)
export async function fetchPosts(limit: number = 5) {
  return SuperheroApi.listPosts({ limit });
}
