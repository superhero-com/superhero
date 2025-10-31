import { CONFIG } from '../config';

// Trendminer API client
export const TrendminerApi = {
  async fetchJson(path: string, init?: RequestInit) {
    const base = (CONFIG.SUPERHERO_API_URL || '').replace(/\/$/, '');
    if (!base) throw new Error('SUPERHERO_API_URL not configured');
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TrendminerApi] Base URL: ${base}`);
      console.log(`[TrendminerApi] Fetching: ${url}`);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const error = new Error(`Trendminer request failed: ${res.status} ${body || ''}`.trim());
      if (process.env.NODE_ENV === 'development') {
        console.error(`[TrendminerApi] Error fetching ${url}:`, error);
      }
      throw error;
    }
    return res.json();
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
  getAccountPortfolioHistory(address: string, params: { startDate?: string; endDate?: string; interval?: number; convertTo?: 'ae'|'usd'|'eur'|'aud'|'brl'|'cad'|'chf'|'gbp'|'xau' } = {}) {
    const qp = new URLSearchParams();
    if (params.startDate) qp.set('startDate', params.startDate);
    if (params.endDate) qp.set('endDate', params.endDate);
    if (params.interval != null) qp.set('interval', String(params.interval));
    if (params.convertTo) qp.set('convertTo', params.convertTo);
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
};

const USE_MOCK = false; // Override to true to force mock in development

async function fetchJson(path: string, init?: RequestInit) {
  const mode = (import.meta as any).env?.MODE;
  const isDevLike = mode === 'development' || mode === 'test';
  const base = (CONFIG.BACKEND_URL || 'https://raendom-backend.z52da5wt.xyz').replace(/\/$/, '');
  if ((USE_MOCK || !base) && isDevLike) {
    return mockFetch(path);
  }
  const url = base ? `${base}/${path}` : `/${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${body || ''}`.trim());
  }
  return res.json();
}

function mockFetch(path: string) {
  // very small mock to allow local UI debugging without a backend
  if (path.startsWith('tips?')) {
    const params = new URLSearchParams(path.split('?')[1]);
    const page = Number(params.get('page') || '1');
    return Promise.resolve(new Array(10).fill(0).map((_, i) => ({
      id: `${page}-${i + 1}`,
      title: `Mock tip ${((page - 1) * 10) + i + 1}`,
      url: 'https://aeternity.com',
    })));
  }
  if (path === 'payfortx/post') return Promise.resolve({ challenge: 'mock-challenge' });
  if (path === 'cache/price') return Promise.resolve({ aeternity: { usd: 0.25, eur: 0.23 } });
  if (path === 'stats') return Promise.resolve({ totalTipsLength: 123, totalAmount: '1000000000000000000', sendersLength: 42 });
  if (path.startsWith('comment/api/tip/')) return Promise.resolve([]);
  if (path === 'verified') return Promise.resolve([]);
  if (path === 'static/wallet/graylist') return Promise.resolve([]);
  if (path === 'tokenCache/tokenInfo') return Promise.resolve({});
  if (path.startsWith('tokenCache/')) return Promise.resolve([]);
  if (path.startsWith('tips/single/')) return Promise.resolve({ id: path.split('/').pop(), title: 'Mock Single Tip', url: 'https://aeternity.com' });
  return Promise.resolve({});
}

// API function for new posts endpoint
export async function fetchPosts(limit: number = 5) {
  const response = await fetch(`https://api.superhero.com/api/posts?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }
  return response.json();
}

export const Backend = {
  // New posts API
  fetchPosts,
  // Unified Post aliases (keeping legacy endpoints under the hood)
  getPostById: (id: string) => fetchJson(`tips/single/${id}`),
  getPostChildren: (postId: string) => fetchJson(`comment/api/tip/${encodeURIComponent(postId)}`),
  // Attach a post to another post (tree replies). First call returns challenge; second submits signature.
  sendPost: (address: string, body: any) => fetchJson('comment/api/', {
    method: 'post',
    body: JSON.stringify({ ...body, author: address }),
    headers: { 'Content-Type': 'application/json' },
  }),
  getTipComments: (tipId: string) => fetchJson(`comment/api/tip/${encodeURIComponent(tipId)}`),
  sendTipComment: (_: string, body: any) => fetchJson('comment/api/', {
    method: 'post',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }),
  getUserComments: (address: string) => fetchJson(`comment/api/author/${address}`),
  pinItem: (address: string, postParam: any) => fetchJson(`pin/${address}`, {
    method: 'post',
    body: JSON.stringify(postParam),
    headers: { 'Content-Type': 'application/json' },
  }),
  unPinItem: (address: string, postParam: any) => fetchJson(`pin/${address}`, {
    method: 'delete',
    body: JSON.stringify(postParam),
    headers: { 'Content-Type': 'application/json' },
  }),
  getPinnedItems: (address: string) => fetchJson(`pin/${address}`),
  sendProfileData: (address: string, postParam: any) => fetchJson(`profile/${address}`, {
    method: 'post',
    body: postParam instanceof FormData ? postParam : JSON.stringify(postParam),
    headers: postParam instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
  }),
  setImage: (address: string, data: FormData) => fetchJson(`profile/${address}`, { method: 'post', body: data }),
  // claimFromUrl removed
  sendPostReport: (author: string, postParam: any) => fetchJson('blacklist/api/wallet', {
    method: 'post',
    body: JSON.stringify({ ...postParam, author }),
    headers: { 'Content-Type': 'application/json' },
  }),
  getProfileImageUrl: (address: string) => `${CONFIG.BACKEND_URL}/profile/image/${address}`,
  // Post detail
  getTipById: (id: string) => fetchJson(`tips/single/${id}`),
  getSenderStats: (address: string) => fetchJson(`stats/sender?address=${address}`),
  getFeed: (
    page: number,
    ordering: string,
    address: string | null = null,
    search: string | null = null,
    blacklist = true,
    tips = true,
    posts = true,
  ) => {
    let query = `?ordering=${ordering}&page=${page}`;
    if (tips) query += '&contractVersion=v1&contractVersion=v2';
    if (posts) query += '&contractVersion=v3';
    if (address) query += `&address=${address}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    query += `&blacklist=${blacklist}`;
    return fetchJson(`tips${query}`);
  },
  addToken: (address: string) => fetchJson('tokenCache/addToken', {
    method: 'post',
    body: JSON.stringify({ address }),
    headers: { 'Content-Type': 'application/json' },
  }),
  getTipStats: () => fetchJson('stats'),
  getCacheChainNames: () => fetchJson('cache/chainnames'),
  getPrice: () => fetchJson('cache/price'),
  getTopics: () => fetchJson('tips/topics'),
  getTokenInfo: () => fetchJson('tokenCache/tokenInfo'),
  // WordBazaar-related endpoints (kept for compatibility with the original Vue app)
  getWordRegistry: (ordering?: string, direction?: string, search?: string) => {
    const qp = new URLSearchParams();
    if (ordering) qp.set('ordering', ordering);
    if (direction) qp.set('direction', direction);
    if (search) qp.set('search', search);
    // Match original behavior: if no V2 contract, return empty list without hitting server
    return CONFIG.CONTRACT_V2_ADDRESS
      ? fetchJson(`tokenCache/wordRegistry?${qp.toString()}`)
      : Promise.resolve([]);
  },
  getWordSaleVotesDetails: (address: string) => fetchJson(`tokenCache/wordSaleVotesDetails/${address}`),
  getWordSaleDetailsByToken: (address: string) => fetchJson(`tokenCache/wordSaleByToken/${address}`),
  getWordSale: (address: string) => fetchJson(`tokenCache/wordSale/${address}`),
  getPriceHistory: (address: string) => fetchJson(`tokenCache/priceHistory/${address}`),
  getTokenBalances: (address: string) => fetchJson(`tokenCache/balances?address=${address}`),
  // awaitTip / awaitRetip removed with tipping features
  invalidateTokenCache: (token: string) => fetchJson(`cache/invalidate/token/${token}`),
  invalidateWordSaleCache: (wordSale: string) => fetchJson(`cache/invalidate/wordSale/${wordSale}`),
  invalidateWordRegistryCache: () => fetchJson('cache/invalidate/wordRegistry'),
  invalidateWordSaleVotesCache: (wordSale: string) => fetchJson(`cache/invalidate/wordSaleVotes/${wordSale}`),
  invalidateWordSaleVoteStateCache: (vote: string) => fetchJson(`cache/invalidate/wordSaleVoteState/${vote}`),
  getTipPreviewUrl: (previewLink: string) => `${CONFIG.BACKEND_URL}${previewLink}`,
  getCommentById: (id: string) => fetchJson(`comment/api/${id}`),
  getVerifiedUrls: () => fetchJson('verified'),
  getGrayListedUrls: () => fetchJson('static/wallet/graylist'),
  getTipTraceBackend: (id: string) => fetchJson(`tracing/backend?id=${id}`),
  getTipTraceBlockchain: (id: string) => fetchJson(`tracing/blockchain?id=${id}`),
  // Await endpoints used by legacy flows
  awaitTip: (id?: string | null) => fetchJson(`tips/await/tip/${id || 'v1'}`),
  awaitRetip: (id?: string | null) => fetchJson(`tips/await/retip/${id || 'v1'}`),
  getCookiesConsent: (address: string, query?: { challenge: string; signature: string }) =>
    fetchJson(`consent/${address}${query ? `?challenge=${query.challenge}&signature=${query.signature}` : ''}`),
  setCookiesConsent: (address: string, { scope, status }: { scope: string; status: boolean }) =>
    fetchJson(`consent/${address}/${scope}`, {
      method: 'post',
      body: JSON.stringify({ status: status ? 'ALLOWED' : 'REJECTED' }),
      headers: { 'Content-Type': 'application/json' },
    }),
  // Create a new top-level post (on-chain via challenge + signature). First call returns a challenge; second submits signature.
  sendPostWithoutTip: (address: string, postParam: any) => fetchJson('payfortx/post', {
    method: 'post',
    body: JSON.stringify({ ...postParam, author: address }),
    headers: { 'Content-Type': 'application/json' },
  }),
  // Portfolio history - delegate to TrendminerApi to avoid duplication
  getAccountPortfolioHistory(address: string, params: { startDate?: string; endDate?: string; interval?: number; convertTo?: 'ae'|'usd'|'eur'|'aud'|'brl'|'cad'|'chf'|'gbp'|'xau' } = {}) {
    return TrendminerApi.getAccountPortfolioHistory(address, params);
  },
};



