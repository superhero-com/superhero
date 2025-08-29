import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GovernanceApi } from '../api/governance';
import { useAeSdk } from './useAeSdk';

export const useGovernance = () => {
  const { activeAccount, sdk } = useAeSdk();
  const queryClient = useQueryClient();

  // Polls query
  const usePolls = (params?: { page?: number; pageSize?: number; status?: string; search?: string }) => {
    return useQuery({
      queryKey: ['governance', 'polls', params],
      queryFn: async () => {
        const res = await GovernanceApi.getPolls(params || {});
        const polls = (res && (
          res.polls || res.items || res.data || res.results || (Array.isArray(res) ? res : null)
        )) || [];
        return polls;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Single poll query
  const usePoll = (id: string) => {
    return useQuery({
      queryKey: ['governance', 'poll', id],
      queryFn: () => GovernanceApi.getPoll(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Poll results query
  const usePollResults = (id: string) => {
    return useQuery({
      queryKey: ['governance', 'pollResults', id],
      queryFn: () => GovernanceApi.getPollResults(id),
      enabled: !!id,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // My vote query
  const useMyVote = (pollId: string) => {
    return useQuery({
      queryKey: ['governance', 'myVote', pollId, activeAccount],
      queryFn: async () => {
        if (!activeAccount) return null;
        return GovernanceApi.getMyVote(pollId, activeAccount);
      },
      enabled: !!pollId && !!activeAccount,
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // Delegation query
  const useDelegation = (userAddress?: string) => {
    const targetAddress = userAddress || activeAccount;
    return useQuery({
      queryKey: ['governance', 'delegation', targetAddress],
      queryFn: async () => {
        if (!targetAddress) return { to: null };
        try {
          return await GovernanceApi.getDelegation(targetAddress);
        } catch {
          return { to: null };
        }
      },
      enabled: !!targetAddress,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Delegators query
  const useDelegators = (to: string) => {
    return useQuery({
      queryKey: ['governance', 'delegators', to],
      queryFn: async () => {
        const res = await GovernanceApi.listDelegators(to);
        const list = (res && (res.delegators || res.items || res.data || (Array.isArray(res) ? res : null))) || [];
        return list;
      },
      enabled: !!to,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Account query
  const useAccount = (accountAddress: string) => {
    return useQuery({
      queryKey: ['governance', 'account', accountAddress],
      queryFn: () => GovernanceApi.getAccount(accountAddress),
      enabled: !!accountAddress,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Poll comments query
  const usePollComments = (pollId: string) => {
    return useQuery({
      queryKey: ['governance', 'pollComments', pollId],
      queryFn: async () => {
        const comments = await GovernanceApi.getPollComments(pollId);
        return Array.isArray(comments) ? comments : [];
      },
      enabled: !!pollId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Submit vote mutation
  const useSubmitVote = () => {
    return useMutation({
      mutationFn: async ({ pollId, option }: { pollId: string; option: string }) => {
        if (!activeAccount) throw new Error('No wallet connected');

        // First call may return challenge
        const first = await GovernanceApi.vote(activeAccount, { pollId, option });
        if (first?.challenge) {
          const signature = (await sdk.signMessage(first.challenge)).toString('hex');
          await GovernanceApi.vote(activeAccount, { pollId, option, challenge: first.challenge, signature });
        }
      },
      onSuccess: (_, { pollId }) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['governance', 'pollResults', pollId] });
        queryClient.invalidateQueries({ queryKey: ['governance', 'myVote', pollId, activeAccount] });
      },
    });
  };

  // Revoke vote mutation
  const useRevokeVote = () => {
    return useMutation({
      mutationFn: async (pollId: string) => {
        if (!activeAccount) throw new Error('No wallet connected');

        const first = await GovernanceApi.revokeVote(activeAccount, { pollId } as any);
        if ((first as any)?.challenge) {
          const signature = (await sdk.signMessage((first as any).challenge)).toString('hex');
          await GovernanceApi.revokeVote(activeAccount, { pollId, challenge: (first as any).challenge, signature });
        }
      },
      onSuccess: (_, pollId) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['governance', 'pollResults', pollId] });
        queryClient.invalidateQueries({ queryKey: ['governance', 'myVote', pollId, address] });
      },
    });
  };

  // Set delegation mutation
  const useSetDelegation = () => {
    return useMutation({
      mutationFn: async ({ to }: { to: string }) => {
        if (!activeAccount) throw new Error('No wallet connected');

        const first = await GovernanceApi.setDelegation(activeAccount, { to });
        if (first?.challenge) {
          const signature = (await sdk.signMessage(first.challenge)).toString('hex');
          await GovernanceApi.setDelegation(activeAccount, { to, challenge: first.challenge, signature });
        }
      },
      onSuccess: () => {
        // Invalidate delegation query
        queryClient.invalidateQueries({ queryKey: ['governance', 'delegation', address] });
      },
    });
  };

  // Revoke delegation mutation
  const useRevokeDelegation = () => {
    return useMutation({
      mutationFn: async () => {
        if (!activeAccount) throw new Error('No wallet connected');

        const first = await GovernanceApi.revokeDelegation(activeAccount, {} as any);
        if ((first as any)?.challenge) {
          const signature = (await sdk.signMessage((first as any).challenge)).toString('hex');
          await GovernanceApi.revokeDelegation(activeAccount, { challenge: (first as any).challenge, signature });
        }
      },
      onSuccess: () => {
        // Invalidate delegation query
        queryClient.invalidateQueries({ queryKey: ['governance', 'delegation', activeAccount] });
      },
    });
  };

  // Send poll comment mutation
  const useSendPollComment = () => {
    return useMutation({
      mutationFn: async ({ pollId, text }: { pollId: string; text: string }) => {
        if (!activeAccount) throw new Error('No wallet connected');
        await GovernanceApi.sendPollComment(activeAccount, { pollId, text });
      },
      onSuccess: (_, { pollId }) => {
        // Invalidate poll comments query
        queryClient.invalidateQueries({ queryKey: ['governance', 'pollComments', pollId] });
      },
    });
  };

  return {
    // Queries
    usePolls,
    usePoll,
    usePollResults,
    useMyVote,
    useDelegation,
    useDelegators,
    useAccount,
    usePollComments,

    // Mutations
    useSubmitVote,
    useRevokeVote,
    useSetDelegation,
    useRevokeDelegation,
    useSendPollComment,
  };
};
