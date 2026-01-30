import { CONFIG } from '@/config';

export const SolanaApi = {
  async fetchJson(path: string, init?: RequestInit, options?: { allow404?: boolean }) {
    const defaultSolanaApi = 'https://sol-api.growae.io';
    const base = (CONFIG.SOLANA_API_URL || CONFIG.SUPERHERO_API_URL || defaultSolanaApi).replace(/\/$/, '');
    if (!base) throw new Error('SUPERHERO_API_URL not configured');
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

    let timeoutController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    if (!init?.signal && typeof AbortController !== 'undefined') {
      timeoutController = new AbortController();
      timeoutId = setTimeout(() => timeoutController!.abort(), 90000);
    }

    try {
      const res = await fetch(url, {
        ...init,
        signal: init?.signal || timeoutController?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404 && options?.allow404) return null;

        let errorMessage = `Request failed with status ${res.status}`;
        try {
          const body = await res.text();
          if (body) {
            try {
              const json = JSON.parse(body);
              errorMessage = json.message || json.error || errorMessage;
            } catch {
              errorMessage = body.length > 200 ? `${body.substring(0, 200)}...` : body;
            }
          }
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(`Superhero API error (${res.status}): ${errorMessage}`);
      }

      const contentType = res.headers.get('content-type');
      const contentLength = res.headers.get('content-length');
      if (contentLength === '0' || (!contentType?.includes('application/json') && !contentType?.includes('text/json'))) {
        return null;
      }

      const text = await res.text();
      if (!text || text.trim().length === 0) return null;
      return JSON.parse(text);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      throw err;
    }
  },
  listPopularPosts(params: { window?: '24h' | '7d' | 'all'; page?: number; limit?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.window) qp.set('window', params.window);
    if (params.page != null) qp.set('page', String(params.page));
    if (params.limit != null) qp.set('limit', String(params.limit));
    const query = qp.toString();
    return this.fetchJson(`/api/posts/popular${query ? `?${query}` : ''}`);
  },
  listTrendingTags(params: { orderBy?: 'score' | 'source' | 'token_sale_address' | 'created_at'; orderDirection?: 'ASC' | 'DESC'; limit?: number; page?: number; search?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.search) qp.set('search', params.search);
    const query = qp.toString();
    return this.fetchJson(`/api/trending-tags${query ? `?${query}` : ''}`);
  },
  getTopicByName(name: string) {
    const topic = String(name || '').replace(/^#/, '');
    const encoded = encodeURIComponent(topic);
    return this.fetchJson(`/api/topics/name/${encoded}`);
  },
  listBclTokens(params: {
    search?: string;
    name?: string;
    saleAddress?: string;
    mintAddress?: string;
    ownerAddress?: string;
    creatorAddress?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    page?: number;
    includes?: string;
  } = {}) {
    const qp = new URLSearchParams();
    if (params.search) qp.set('search', params.search);
    if (params.name) qp.set('name', params.name);
    if (params.saleAddress) qp.set('sale_address', params.saleAddress);
    if (params.mintAddress) qp.set('mint_address', params.mintAddress);
    if (params.ownerAddress) qp.set('owner_address', params.ownerAddress);
    if (params.creatorAddress) qp.set('creator_address', params.creatorAddress);
    if (params.orderBy) qp.set('order_by', params.orderBy);
    if (params.orderDirection) qp.set('order_direction', params.orderDirection);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.includes) qp.set('includes', params.includes);
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/tokens${query ? `?${query}` : ''}`);
  },
  getBclToken(address: string) {
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}`);
  },
  listBclTokenRankings(address: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}/rankings${query ? `?${query}` : ''}`);
  },
  getBclTokenPerformance(address: string) {
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}/performance`);
  },
  getBclTokenPriceChartsPreview(address: string, params: { interval?: '1d' | '7d' | '30d'; convertTo?: 'sol' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau' } = {}) {
    const qp = new URLSearchParams();
    if (params.interval) qp.set('interval', params.interval);
    if (params.convertTo) qp.set('convertTo', params.convertTo);
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}/price-charts-preview${query ? `?${query}` : ''}`);
  },
  listBclTokenTrades(address: string, params: { limit?: number; page?: number; includes?: string } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    if (params.includes) qp.set('includes', params.includes);
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}/trades${query ? `?${query}` : ''}`);
  },
  listBclTokenHolders(address: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/tokens/${encodeURIComponent(address)}/holders${query ? `?${query}` : ''}`);
  },
  listBclTrades(params: { tokenAddress?: string; accountAddress?: string; includes?: string; limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.tokenAddress) qp.set('token_address', params.tokenAddress);
    if (params.accountAddress) qp.set('account_address', params.accountAddress);
    if (params.includes) qp.set('includes', params.includes);
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/trades${query ? `?${query}` : ''}`);
  },
  listBclAccountBalances(address: string, params: { limit?: number; page?: number } = {}) {
    const qp = new URLSearchParams();
    if (params.limit != null) qp.set('limit', String(params.limit));
    if (params.page != null) qp.set('page', String(params.page));
    const query = qp.toString();
    return this.fetchJson(`/api/bcl/accounts/${encodeURIComponent(address)}/balances${query ? `?${query}` : ''}`);
  },
};
