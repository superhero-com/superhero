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
        
        const { data } = await GovernanceApi.getPollOrdering(params.status === 'closed');
        if (params.status === 'all') data.push(...(await GovernanceApi.getPollOrdering(true)).data);

        const height = await sdk.getHeight();
        // Resolve titles with robust fallbacks. Some registry entries may have empty title strings.
        // 1) Try registry stored title
        // 2) Fallback to Poll.title() from the poll contract
        // 3) Finally fallback to overview.metadata.title from the backend
        const missingTitleItems = data.filter(({ id, poll }) => {
          const regTitle = (contractPolls as any).get?.(BigInt(id))?.title ?? (contractPolls as any).get?.(id)?.title ?? '';
          return !regTitle || String(regTitle).trim().length === 0;
        });

        const fallbackPairs = await Promise.all(
          missingTitleItems.map(async ({ id, poll }) => {
            // Try poll contract title()
            try {
              const pollContract = await Contract.initialize<{ title: () => string }>({
                ...sdk.getContext(),
                aci: GOVERNANCE_POLL_ACI as any,
                address: poll as Encoded.ContractAddress,
              });
              const t = (await (pollContract as any).title()).decodedResult as string;
              if (t && t.trim().length > 0) return [id, t] as [number, string];
            } catch {}

            // Fallback to backend overview metadata
            try {
              const overview = await GovernanceApi.getPollOverview(poll as Encoded.ContractAddress);
              const t = overview?.pollState?.metadata?.title ?? '';
              return [id, t] as [number, string];
            } catch {}

            return [id, ''] as [number, string];
          })
        );

        const fallbackTitleById = new Map<number, string>(fallbackPairs);

        let merged = data.map(({ id, ...others }) => {
          const regTitle = (contractPolls as any).get?.(BigInt(id))?.title ?? (contractPolls as any).get?.(id)?.title ?? '';
          const title = (regTitle && String(regTitle).trim().length > 0)
            ? regTitle
            : (fallbackTitleById.get(id) || '');
          return {
            id,
            ...others,
            title,
            endDate: new Date(Date.now() + ((others.closeHeight ?? height) - height) * 3 * 60 * 1000),
            status: ((others.closeHeight == null || others.closeHeight > height)
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
      queryFn: () => id ? GovernanceApi.getPollOverview(id) : undefined,
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Poll results query
  const usePollResults = (id: Encoded.ContractAddress) => {
    return useQuery({
      queryKey: ['governance', 'pollResults', id],
      queryFn: async () => {
        const overview = await GovernanceApi.getPollOverview(id);

        // Shape results for UI consumption
        const voteOptions: Record<string, string> = overview.pollState.vote_options || {};
        const options = (overview.stakesForOption || [])
          .sort((a, b) => Number(a.option) - Number(b.option))
          .map((opt) => ({
            value: Number(opt.option),
            label: voteOptions[String(opt.option)] ?? `Option ${opt.option}`,
            votes: Array.isArray(opt.votes) ? opt.votes.length : 0,
            percentageOfTotal: Number(opt.percentageOfTotal),
            optionStake: opt.optionStake,
          }));

        return {
          options,
          totalVotes: overview.voteCount || 0,
          totalStake: overview.totalStake,
          percentOfTotalSupply: overview.percentOfTotalSupply,
          myVote: overview.pollState?.votes[activeAccount] as number | undefined,
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
      enabled: !!activeAccount,
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
      enabled: !!activeAccount,
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
