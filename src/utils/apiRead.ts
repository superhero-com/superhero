import { CONFIG } from '@/config';

const stripTrailingSlash = (value: string) => value.replace(/\/$/, '');

const getApiBases = () => Array.from(
  new Set(
    [
      CONFIG.NODE_URL,
      CONFIG.MIDDLEWARE_URL,
    ].filter(Boolean).map((value) => stripTrailingSlash(String(value))),
  ),
);

const readJson = async (url: string) => {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchApiRecord = async (path: string) => {
  const bases = getApiBases();
  const tryRead = async (index: number): Promise<any> => {
    if (index >= bases.length) return null;
    const data = await readJson(`${bases[index]}${path}`);
    if (data) return data;
    return tryRead(index + 1);
  };
  return tryRead(0);
};

export const fetchTransactionRecord = async (txHash: string) => (
  fetchApiRecord(`/v3/transactions/${encodeURIComponent(txHash)}?int-as-string=false`)
);

export const isTransactionMined = async (txHash?: string | null) => {
  if (!txHash) return false;
  const record = await fetchTransactionRecord(txHash);
  const blockHeight = Number(record?.block_height ?? record?.blockHeight ?? -1);
  return Number.isFinite(blockHeight) && blockHeight > 0;
};

export const fetchNameRecord = async (name: string) => (
  fetchApiRecord(`/v3/names/${encodeURIComponent(name)}`)
);
