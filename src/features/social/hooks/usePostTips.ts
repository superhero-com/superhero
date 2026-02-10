import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import camelCaseKeysDeep from 'camelcase-keys-deep';
import { encode, Encoding } from '@aeternity/aepp-sdk';
import moment from 'moment';

import { useAeSdk } from '@/hooks/useAeSdk';
import { fetchJson } from '@/utils/common';
import { DATE_LONG } from '@/utils/constants';
import { fromAettos } from '@/libs/dex';

type MiddlewareTx = {
  hash: string;
  microTime?: number;
  tx?: {
    type?: string;
    senderId?: string;
    recipientId?: string;
    amount?: string | number;
    payload?: string;
  };
};

export type PostTip = {
  hash: string;
  sender: string;
  amountAe: string;
  date: string;
  microTime?: number;
};

function normalizePostIdV3(postId: string): string {
  return String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`;
}

function encodeTipPayload(postId: string): string {
  const payload = `TIP_POST:${normalizePostIdV3(postId)}`;
  return encode(new TextEncoder().encode(payload), Encoding.Bytearray);
}

function formatTipDate(microTime?: number): string {
  if (microTime == null) return 'Unknown';
  const d = moment(microTime);
  return d.isValid() ? d.format(DATE_LONG) : 'Unknown';
}

async function loadTransactionsFromMdw(mdwBase: string, url: string, acc: MiddlewareTx[] = []): Promise<MiddlewareTx[]> {
  const response: any = await fetchJson(url);
  const items: MiddlewareTx[] = response?.data ? (camelCaseKeysDeep(response.data) as any) : [];
  acc.push(...items);
  if (response?.next) {
    const nextUrl = response.next.startsWith('http')
      ? response.next
      : `${mdwBase}${response.next}`;
    return loadTransactionsFromMdw(mdwBase, nextUrl, acc);
  }
  return acc;
}

export function usePostTips(postId?: string, receiverAddress?: string) {
  const { activeNetwork } = useAeSdk();
  const mdwUrl = activeNetwork?.middlewareUrl || '';

  const queryKey = useMemo(() => {
    const id = postId ? normalizePostIdV3(postId) : undefined;
    // Include middleware URL so switching networks doesn't reuse cached results from another network.
    return ['post-tips', mdwUrl, id, receiverAddress] as const;
  }, [postId, receiverAddress, mdwUrl]);

  return useQuery<PostTip[]>({
    queryKey,
    enabled: Boolean(postId && receiverAddress && mdwUrl),
    staleTime: 30_000,
    queryFn: async () => {
      if (!postId || !receiverAddress) return [];
      const mdw = mdwUrl.replace(/\/$/, '');

      const expectedPayload = encodeTipPayload(postId);

      // Fetch spend transactions involving the receiver and filter by payload.
      // NOTE: Middleware query params vary by version; we keep it broad and filter client-side.
      const url = `${mdw}/v3/transactions?account=${encodeURIComponent(receiverAddress)}&limit=100`;
      const txs = await loadTransactionsFromMdw(mdw, url, []);

      const tips = txs
        .filter((t) => t?.tx?.type === 'SpendTx')
        .filter((t) => t?.tx?.recipientId === receiverAddress)
        .filter((t) => t?.tx?.payload === expectedPayload)
        .map((t) => {
          const amountAettos = String(t.tx?.amount ?? '0');
          const amountAe = fromAettos(amountAettos, 18);
          return {
            hash: t.hash,
            sender: String(t.tx?.senderId || ''),
            amountAe: String(amountAe),
            date: formatTipDate(t.microTime),
            microTime: t.microTime,
          } satisfies PostTip;
        })
        .filter((t) => t.sender)
        // newest first
        .sort((a, b) => (b.microTime ?? 0) - (a.microTime ?? 0));

      return tips;
    },
  });
}
