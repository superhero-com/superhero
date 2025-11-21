import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract, Encoded } from '@aeternity/aepp-sdk';
import { GovernanceApi } from '../api/governance';
import { useAeSdk } from './useAeSdk';
import { CONFIG } from '../config';
import REGISTRY_WITH_EVENTS_ACI from '../api/GovernanceRegistryACI.json';
import GOVERNANCE_POLL_ACI from '../api/GovernancePollACI.json';

export const useGovernance = () => {
  const { activeAccount: activeAccountUntyped, sdk } = useAeSdk();
  const queryClient = useQueryClient();

  const activeAccount = activeAccountUntyped as Encoded.AccountAddress;

  // Polls query (combined smart contract + backend ordering/metrics)
  const usePolls = (params: { status: 'all' | 'open' | 'closed'; search?: string }) => {
    return useQuery({
      queryKey: ['governance', 'polls', params],
      queryFn: async () => {
        const registry = await Contract.initialize<{
          polls: () => Map<number, {
            close_height: bigint;
            is_listed: boolean;
            title: string;
            poll: Encoded.ContractAddress;
          }>
        }>({
          ...sdk.getContext(),
          aci: REGISTRY_WITH_EVENTS_ACI,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        });
        const contractPolls = (await registry.polls()).decodedResult;
        const height = await sdk.getHeight();
        
        // Fetch polls from new API endpoint
        const pollsResponse = await GovernanceApi.getAllPolls(1, 1000);
        let allPolls = pollsResponse?.items || [];
        
        // Filter by status if needed
        if (params.status !== 'all') {
          const isClosed = params.status === 'closed';
          allPolls = allPolls.filter((poll) => {
            if (isClosed) {
              return poll.close_height != null && poll.close_height <= height;
            } else {
              return poll.close_height == null || poll.close_height > height;
            }
          });
        }
        
        // Map to expected format
        const data = allPolls.map((poll, index) => ({
          id: Number(poll.poll_seq_id || index),
          poll: poll.poll_address!,
          totalStake: '0', // Not available in new API
          voteCount: poll.votes_count || 0,
          closeHeight: poll.close_height || 0,
          delegationCount: 0, // Not available in new API
          score: poll.votes_count || 0,
        }));

        let merged = data.map(({ id, ...others }) => {
          const pollData = contractPolls.get(BigInt(id));
          return {
            id,
            ...others,
            title: pollData?.title || 'Untitled poll',
            endDate: new Date(Date.now() + (others.closeHeight - height) * 3 * 60 * 1000),
            status: (others.closeHeight == null || others.closeHeight > height
              ? 'open' : 'closed') as 'open' | 'closed',
          };
        });
        
        const search = params.search?.trim().toLowerCase();
        if (search) {
          merged = merged.filter((p) => p.title.toLowerCase().includes(search));
        }

        return merged;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Single poll query
  const usePoll = (id?: Encoded.ContractAddress) => {
    return useQuery({
      queryKey: ['governance', 'poll', id],
      queryFn: async () => {
        if (!id) return undefined;
        const pollWithVotes = await GovernanceApi.getPollWithVotes(id);
        // Convert to old format for backward compatibility
        const poll = pollWithVotes.poll;
        return {
          pollState: {
            metadata: poll.metadata || { title: '', description: '', link: '' },
            vote_options: (poll.vote_options || []).reduce((acc: Record<string, string>, opt: { key: number; val: string }) => {
              acc[String(opt.key)] = opt.val;
              return acc;
            }, {}),
            close_height: poll.close_height,
            create_height: poll.create_height,
            votes: {}, // Will be populated from votes array if needed
            author: poll.author,
          },
          stakesForOption: Object.entries(poll.votes_count_by_option || {}).map(([option, count]) => ({
            option,
            optionStake: '0',
            percentageOfTotal: '0',
            votes: Array(Number(count)).fill(null),
          })),
          totalStake: '0',
          percentOfTotalSupply: '0',
          voteCount: poll.votes_count || 0,
        };
      },
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Poll results query
  const usePollResults = (id: Encoded.ContractAddress) => {
    return useQuery({
      queryKey: ['governance', 'pollResults', id],
      queryFn: async () => {
        const pollWithVotes = await GovernanceApi.getPollWithVotes(id);
        const poll = pollWithVotes.poll;

        // Shape results for UI consumption
        const voteOptions: Record<string, string> = (poll.vote_options || []).reduce((acc: Record<string, string>, opt: { key: number; val: string }) => {
          acc[String(opt.key)] = opt.val;
          return acc;
        }, {});
        
        const votesByOption = poll.votes_count_by_option || {};
        const totalVotes = poll.votes_count || 0;
        
        const options = Object.entries(votesByOption)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([optionKey, count]) => ({
            value: Number(optionKey),
            label: voteOptions[optionKey] ?? `Option ${optionKey}`,
            votes: Number(count) || 0,
            percentageOfTotal: totalVotes > 0 ? (Number(count) / totalVotes * 100).toFixed(2) : '0',
            optionStake: '0',
          }));

        // Find user's vote from votes array
        let myVote: number | undefined;
        if (activeAccount) {
          const accountVotes = (pollWithVotes.votes || [])
            .filter((v: any) => {
              const voter = v.data?.voter || v.data?.governance?.data?.voter;
              return voter === activeAccount && v.function === 'vote';
            })
            .sort((a: any, b: any) => {
              if (b.block_height !== a.block_height) return b.block_height - a.block_height;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
          
          if (accountVotes.length > 0) {
            const latestVote = accountVotes[0];
            const option = latestVote.data?.option || latestVote.data?.governance?.data?.option;
            // Check if revoked
            const hasLaterRevoke = pollWithVotes.votes.some((v: any) => {
              if (v.function !== 'revoke_vote') return false;
              if (v.block_height > latestVote.block_height) return true;
              if (v.block_height === latestVote.block_height) {
                return new Date(v.created_at).getTime() > new Date(latestVote.created_at).getTime();
              }
              return false;
            });
            if (!hasLaterRevoke && typeof option === 'number') {
              myVote = option;
            }
          }
        }

        return {
          options,
          totalVotes,
          totalStake: '0',
          percentOfTotalSupply: '0',
          myVote,
        } as const;
      },
      staleTime: 1 * 60 * 1000, // 1 minute
    });
  };

  // Delegation query
  const useDelegation = () => {
    return useQuery<Encoded.AccountAddress | null>({
      queryKey: ['governance', 'delegation', activeAccount],
      queryFn: async () => {
        const registry = await Contract.initialize<{
          delegatee: (account: Encoded.AccountAddress) => Encoded.AccountAddress | undefined
        }>({
          ...sdk.getContext(),
          aci: REGISTRY_WITH_EVENTS_ACI as any,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        });
        return (await registry.delegatee(activeAccount)).decodedResult ?? null;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Delegators query
  const useDelegators = () => {
    return useQuery({
      queryKey: ['governance', 'delegators', activeAccount],
      queryFn: async () => {
        return (await GovernanceApi.getDelegatedPower(activeAccount)).flattenedDelegationTree;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Submit vote mutation
  const useSubmitVote = () => {
    return useMutation({
      mutationFn: async ({ pollAddress, option }: { pollAddress: Encoded.ContractAddress; option: number }) => {
        if (!activeAccount) throw new Error('No wallet connected');

        const poll = await Contract.initialize<{
          vote: (opt: number) => void
        }>({
          ...sdk.getContext(),
          aci: GOVERNANCE_POLL_ACI as any,
          address: pollAddress,
        });
        await poll.vote(option);
        await GovernanceApi.submitContractEvent("Vote", pollAddress);
      },
      onSuccess: (_, { pollAddress }) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['governance', 'pollResults', pollAddress] });
      },
    });
  };

  // Revoke vote mutation
  const useRevokeVote = () => {
    return useMutation({
      mutationFn: async (pollAddress: Encoded.ContractAddress) => {
        if (!activeAccount) throw new Error('No wallet connected');

        const poll = await Contract.initialize<{
          revoke_vote: () => void
        }>({
          ...sdk.getContext(),
          aci: GOVERNANCE_POLL_ACI as any,
          address: pollAddress,
        });
        await poll.revoke_vote();
        await GovernanceApi.submitContractEvent("RevokeVote", pollAddress);
      },
      onSuccess: (_, pollAddress) => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['governance', 'pollResults', pollAddress] });
      },
    });
  };

  // Set delegation mutation
  const useSetDelegation = () => {
    return useMutation({
      mutationFn: async (to: Encoded.AccountAddress) => {
        if (!activeAccount) throw new Error('No wallet connected');

        const registry = await Contract.initialize<{
          delegate: (to: Encoded.AccountAddress) => void
        }>({
          ...sdk.getContext(),
          aci: REGISTRY_WITH_EVENTS_ACI as any,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        });

        await registry.delegate(to);
        await GovernanceApi.submitContractEvent("Delegation");
      },
      onSuccess: () => {
        // Invalidate delegation query
        queryClient.invalidateQueries({ queryKey: ['governance', 'delegation', activeAccount] });
      },
    });
  };

  // Revoke delegation mutation
  const useRevokeDelegation = () => {
    return useMutation({
      mutationFn: async () => {
        if (!activeAccount) throw new Error('No wallet connected');

        const registry = await Contract.initialize<{
          revoke_delegation: () => void
        }>({
          ...sdk.getContext(),
          aci: REGISTRY_WITH_EVENTS_ACI as any,
          address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
        });

        await registry.revoke_delegation();
        await GovernanceApi.submitContractEvent("RevokeDelegation");
      },
      onSuccess: () => {
        // Invalidate delegation query
        queryClient.invalidateQueries({ queryKey: ['governance', 'delegation', activeAccount] });
      },
    });
  };

  return {
    // Queries
    usePolls,
    usePoll,
    usePollResults,
    useDelegation,
    useDelegators,
    
    // Mutations
    useSubmitVote,
    useRevokeVote,
    useSetDelegation,
    useRevokeDelegation,
  };
};
