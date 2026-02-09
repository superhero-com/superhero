import { CONFIG } from '../config';

function pickDexBackendUrl(): string | null {
  // Prefer explicit DEX_BACKEND_URL, otherwise choose based on NODE_URL
  const explicit = (CONFIG as any).DEX_BACKEND_URL as string | undefined;
  if (explicit) return explicit;
  const isTestnet = /uat|testnet/i.test(CONFIG.NODE_URL);
  const mainnet = (CONFIG as any).MAINNET_DEX_BACKEND_URL as string | undefined;
  const testnet = (CONFIG as any).TESTNET_DEX_BACKEND_URL as string | undefined;
  return (isTestnet ? testnet : mainnet) || null;
}

async function safeFetch<T>(url: string, { timeoutMs = 2000 }: { timeoutMs?: number } = {}): Promise<T | null> {
  const baseUrl = pickDexBackendUrl();
  if (!baseUrl) return null;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const fullUrl = `${base}${url.startsWith('/') ? '' : '/'}${url}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(fullUrl, { signal: controller.signal });
    const body = await resp.json();
    if (!resp.ok) return null;
    return body as T;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

export type ListedToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
};

export async function getListedTokens(): Promise<ListedToken[] | null> {
  return safeFetch<ListedToken[]>('tokens/listed');
}

export async function getAllTokens(): Promise<any[] | null> {
  return safeFetch<any[]>('tokens');
}

export async function getTokenWithUsd(tokenId: string): Promise<any | null> {
  return safeFetch<any>(`tokens/${tokenId}`);
}

export async function getPairs(onlyListed = false): Promise<any[] | null> {
  return safeFetch<any[]>(`pairs?only-listed=${onlyListed ? 'true' : 'false'}`);
}

export async function getPairDetails(pairAddress: string): Promise<any | null> {
  return safeFetch<any>(`pairs/${pairAddress}`);
}

export async function getPairsByToken(tokenId: string): Promise<any[] | null> {
  return safeFetch<any[]>(`tokens/${tokenId}/pairs`);
}

export async function getPairsByTokenUsd(tokenId: string): Promise<any[] | null> {
  return safeFetch<any[]>(`pairs?token=${encodeURIComponent(tokenId)}`);
}

export async function getSwapRoutes(tokenA: string, tokenB: string): Promise<any[][] | null> {
  return safeFetch<any[][]>(`swap-routes/${tokenA}/${tokenB}`);
}

export async function getGraph(params: Record<string, any>): Promise<any | null> {
  const qs = new URLSearchParams(params as any).toString();
  return safeFetch<any>(`graph?${qs}`);
}

export async function getHistory(params: Record<string, any>): Promise<any[] | null> {
  const qs = new URLSearchParams(params as any).toString();
  return safeFetch<any[]>(`history?${qs}`);
}
