import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Backend } from '../api/backend';
import { performAuthedCall } from '../auth/deeplink';
import { useWallet } from './useWallet';

export const useBackend = () => {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  
  // Local state for things that don't need to be shared across components
  const [userComments, setUserComments] = useState<Record<string, any[]>>({});
  const [tip, setTip] = useState<Record<string, any>>({});
  const [comment, setComment] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Tips queries using React Query
  const useTips = (args: [string, string | null, string | null, boolean, boolean, boolean]) => {
    const key = JSON.stringify(args);
    return useQuery({
      queryKey: ['tips', key],
      queryFn: async () => {
        const [ordering, address, search, blacklist, tips, posts] = args;
        const results = await Backend.getFeed(1, ordering, address, search, blacklist, tips, posts);
        return results;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const useLoadMoreTips = () => {
    return useMutation({
      mutationFn: async ({ 
        args, 
        page 
      }: { 
        args: [string, string | null, string | null, boolean, boolean, boolean]; 
        page: number;
      }) => {
        const [ordering, address, search, blacklist, tips, posts] = args;
        const results = await Backend.getFeed(page, ordering, address, search, blacklist, tips, posts);
        return { key: JSON.stringify(args), list: results, page };
      },
      onSuccess: (data) => {
        // Update the existing tips query data
        queryClient.setQueryData(['tips', data.key], (oldData: any[]) => {
          return oldData ? [...oldData, ...data.list] : data.list;
        });
      },
    });
  };

  // Comment counts using React Query
  const useCommentCount = (postId: string) => {
    return useQuery({
      queryKey: ['commentCount', postId],
      queryFn: async () => {
        try {
          const comments = await Backend.getPostChildren(postId);
          return Array.isArray(comments) ? comments.length : 0;
        } catch (error) {
          console.error('Failed to load comment count for post:', postId, error);
          return 0;
        }
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  const useCommentCounts = (postIds: string[]) => {
    return useQuery({
      queryKey: ['commentCounts', postIds],
      queryFn: async () => {
        const results = await Promise.all(
          postIds.map(async (postId) => {
            try {
              const comments = await Backend.getPostChildren(postId);
              const count = Array.isArray(comments) ? comments.length : 0;
              return { postId, count };
            } catch (error) {
              console.error('Failed to load comment count for post:', postId, error);
              return { postId, count: 0 };
            }
          })
        );
        return results.reduce((acc, { postId, count }) => {
          acc[postId] = count;
          return acc;
        }, {} as Record<string, number>);
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Authenticated backend calls
  const callWithAuth = useCallback(async ({ 
    method, 
    arg, 
    to, 
    forceDeeplink 
  }: { 
    method: keyof typeof Backend; 
    arg?: any; 
    to?: string; 
    forceDeeplink?: boolean;
  }) => {
    // This is a simplified version - you might need to adapt based on your auth implementation
    return performAuthedCall(
      () => {}, // dispatch placeholder
      () => ({ root: { address } }), // getState placeholder
      { method, arg, to }, 
      { forceDeeplink }
    );
  }, [address]);

  const setCookies = useCallback(async ({ scope, status }: { scope: string; status: boolean }) => {
    await callWithAuth({ 
      method: 'setCookiesConsent' as any, 
      arg: { scope, status } 
    });
    return { scope, status };
  }, [callWithAuth]);

  // Reload tips mutation
  const reloadTips = useMutation({
    mutationFn: async (args: [string, string | null, string | null, boolean, boolean, boolean]) => {
      const key = JSON.stringify(args);
      const [ordering, address, search, blacklist, tips, posts] = args;
      const results = await Backend.getFeed(1, ordering, address, search, blacklist, tips, posts);
      return { key, list: results };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['tips', data.key], data.list);
    },
  });

  return {
    // State
    userComments,
    tip,
    comment,
    stats,
    prices,
    
    // Actions
    setUserComments,
    setTip,
    setComment,
    setStats,
    setPrices,
    
    // Queries
    useTips,
    useCommentCount,
    useCommentCounts,
    
    // Mutations
    useLoadMoreTips,
    reloadTips,
    
    // Auth
    callWithAuth,
    setCookies,
  };
};
