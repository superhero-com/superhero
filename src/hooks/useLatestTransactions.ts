import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CustomPagination } from '../utils/types';

import type { TokenDto } from '@/api/generated/models/TokenDto';
import type { TransactionDto } from '../api/generated/models/TransactionDto';
import WebSocketClient from '../libs/WebSocketClient';
import { TransactionsService } from '@/api/generated/services/TransactionsService';

// Global state to maintain singleton pattern like Vue composable
let initialized = false;
let unsubscribeLatestTransactions: (() => void) | null = null;

export type TransactionDtoWithToken = TransactionDto & {
  address: string;
  token: TokenDto;
};



export function useLatestTransactions() {
  const queryClient = useQueryClient();
  const [latestTransactions, setLatestTransactions] = useState<TransactionDtoWithToken[]>([]);


  // Initialize WebSocket subscription (singleton pattern)
  useEffect(() => {

    if (!initialized) {
      initialized = true;

      //   Use the token transaction channel like the carousel component
      unsubscribeLatestTransactions = WebSocketClient.subscribeForTransactions(
        (payload: any) => {
          // Update React Query cache for different page sizes
          const pages = [10, 20, 50, 100];
          pages.forEach((page) => {
            queryClient.setQueryData(
              ['TransactionsService.listTransactions', payload.token.sale_address, page, 1],
              (oldData: Awaited<CustomPagination<TransactionDtoWithToken>> | undefined) => ({
                meta: {
                  ...(oldData?.meta || {}),
                  totalItems: (oldData?.meta.totalItems || 0) + 1,
                },
                items: [payload.data, ...(oldData?.items || []).slice(0, page - 1)],
              }),
            );
          });


          // if (latestTransactions.length > 50) {
          //   setLatestTransactions(latestTransactions.slice(0, 50));
          // }
          setLatestTransactions(prev => ([...prev, {
            token: payload.token,
            address: payload.token?.sale_address || payload.data?.account || '',
            ...payload.data,
          }]));
        }
      );

      TransactionsService.listTransactions({
        limit: 50,
        page: 1,
        includes: "token",
      } as any).then((res) => setLatestTransactions(res.items as TransactionDtoWithToken[]));
    }

    return () => {
      initialized = false;
      unsubscribeLatestTransactions?.();
    };
  }, []);


  return {
    latestTransactions,
    setLatestTransactions,
    unsubscribeLatestTransactions,
  };
}
