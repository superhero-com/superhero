import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TokenDto } from '@/api/generated';
import WebSocketClient from '@/libs/WebSocketClient';

export interface ILiveTokenData {
  token: TokenDto;
  onUpdate?: (token: TokenDto) => void;
}

/**
 * Custom React hook that provides live token data for a given token.
 * @param token - The token object.
 * @returns An object containing the reactive token data.
 */
export function useLiveTokenData({ token, onUpdate }: ILiveTokenData) {
  const [tokenData, setTokenData] = useState<TokenDto>({
    ...token,
  });

  const subscriptionRef = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token?.sale_address) return;
    subscriptionRef.current = WebSocketClient.subscribeForTokenUpdates(
      token.sale_address,
      (newComingTokenData: any) => {
        setTokenData(currentTokenData => {
          const newTokenData = {
            ...currentTokenData,
            ...newComingTokenData.data,
          };

          queryClient.setQueryData(['TokensService.findByAddress', token.sale_address], newTokenData);
          queryClient.setQueryData(['TokensService.findByAddress', token.symbol], newTokenData);

          queryClient.refetchQueries({
            queryKey: ['TokensService.listTokenRankings', token.sale_address],
          });

          queryClient
            .refetchQueries({
              queryKey: ['TokensService.getHolders', token.sale_address],
            })
            .then(() => {
              queryClient.refetchQueries({
                queryKey: ['TokensService.findByAddress', token.symbol],
              });
            });

          onUpdate?.(newTokenData);
          return newTokenData;
        });
      },
    );

    return () => {
      subscriptionRef.current?.();
    };
  }, [token?.sale_address, token?.symbol, queryClient, onUpdate]);

  return {
    tokenData,
  };
}
