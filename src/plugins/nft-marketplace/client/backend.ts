export type NftListing = { id: string; title: string; image?: string; price?: string; owner?: string };

function getBaseUrl() {
  const v = (import.meta as any)?.env?.VITE_EXT_NFT_API_URL || (window as any).__SUPERCONFIG__?.EXT_NFT_API_URL;
  return (v as string | undefined)?.replace(/\/$/, '') || '';
}

export async function searchListings(q: string): Promise<NftListing[]> {
  const base = getBaseUrl();
  if (!base) return [];
  const res = await fetch(`${base}/nft/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await res.json()) as NftListing[];
}


