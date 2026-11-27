import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract, Encoded } from '@aeternity/aepp-sdk';
import { GovernanceApi } from '../api/governance';
import { useAeSdk } from './useAeSdk';
import { CONFIG } from '../config';
import REGISTRY_WITH_EVENTS_ACI from '../api/GovernanceRegistryACI.json';
import GOVERNANCE_POLL_ACI from '../api/GovernancePollACI.json';
import { track } from '../lib/journey';

export const useGovernance = () => {
  const { activeAccount: activeAccountUntyped, sdk } = useAeSdk();
  const queryClient = useQueryClient();

  const activeAccount = activeAccountUntyped as Encoded.AccountAddress;

  // Polls query (combined smart contract + backend ordering/metrics)
  const usePolls = (params: { status: 'all' | 'open' | 'closed'; search?: string }) => useQuery({
    // Search is applied client-side (select), so typing does not refetch the
    // registry and both orderings on every keystroke.
    queryKey: ['governance', 'polls', { status: params.status }],
    queryFn: async () => {
      // Independent reads: fetch them together rather than one after another.
      const [{ decodedResult: contractPolls }, orderings, height] = await Promise.all([
        Contract.initialize<{
          polls:() => Map<bigint, {
            close_height: bigint;
            is_listed: boolean;
            title: string;
            poll: Encoded.ContractAddress;
          }>
            }>({
              ...sdk.getContext(),
              aci: REGISTRY_WITH_EVENTS_ACI,
              address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
            }).then((registry) => registry.polls()),
        Promise.all(params.status === 'all'
          ? [GovernanceApi.getPollOrdering(false), GovernanceApi.getPollOrdering(true)]
          : [GovernanceApi.getPollOrdering(params.status === 'closed')]),
        sdk.getHeight(),
      ]);

      // The registry can list one poll contract under several ids; show it once.
      const seen = new Set<string>();
      const data = orderings
        .flatMap((o) => o.data)
        .filter((p) => {
          if (seen.has(p.poll)) return false;
          seen.add(p.poll);
          return true;
        });

      return data.map(({ id, ...others }) => ({
        id,
        ...others,
        title: contractPolls.get(BigInt(id))?.title ?? '',
        endDate: others.closeHeight == null
          ? undefined
          : new Date(Date.now() + (others.closeHeight - height) * 3 * 60 * 1000),
        status: (others.closeHeight == null || others.closeHeight > height
          ? 'open' : 'closed') as 'open' | 'closed',
      }));
    },
    select: (polls) => {
      const search = params.search?.trim().toLowerCase();
      return search ? polls.filter((p) => p.title.toLowerCase().includes(search)) : polls;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Single poll query
  const usePoll = (id?: Encoded.ContractAddress) => useQuery({
    queryKey: ['governance', 'poll', id],
    queryFn: () => (id ? GovernanceApi.getPollOverview(id) : undefined),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Poll results query
  const usePollResults = (id?: Encoded.ContractAddress) => useQuery({
    queryKey: ['governance', 'pollResults', id, activeAccount],
    enabled: !!id,
    queryFn: async () => {
      const overview = await GovernanceApi.getPollOverview(id!);

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

  // Delegation query
  const useDelegation = () => useQuery<Encoded.AccountAddress | null>({
    queryKey: ['governance', 'delegation', activeAccount],
    enabled: !!activeAccount,
    queryFn: async () => {
      const registry = await Contract.initialize<{
          delegatee:(account: Encoded.AccountAddress) => Encoded.AccountAddress | undefined
            }>({
              ...sdk.getContext(),
              aci: REGISTRY_WITH_EVENTS_ACI as any,
              address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
            });
      return (await registry.delegatee(activeAccount)).decodedResult ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Delegators query
  const useDelegators = () => useQuery({
    queryKey: ['governance', 'delegators', activeAccount],
    enabled: !!activeAccount,
    queryFn: async () => (await GovernanceApi.getDelegatedPower(activeAccount)).flattenedDelegationTree,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // SDK calls wait for a mined transaction and reject failed contract execution.
  // Indexer notifications are best effort and must not turn a confirmed vote into a failure.
  const notifyIndexer = (topic: string, pollAddress?: Encoded.ContractAddress) => {
    GovernanceApi.submitContractEvent(topic, pollAddress).then(() => {
      queryClient.invalidateQueries({
        queryKey: pollAddress
          ? ['governance', 'pollResults', pollAddress]
          : ['governance', 'delegation'],
      });
    }).catch(() => { /* Normal query refresh recovers if the indexer is temporarily unavailable. */ });
  };

  // Submit vote mutation
  const useSubmitVote = () => useMutation({
    mutationFn: async ({ pollAddress, option }: { pollAddress: Encoded.ContractAddress; option: number }) => {
      if (!activeAccount) throw new Error('No wallet connected');

      const poll = await Contract.initialize<{
          vote:(opt: number) => void
            }>({
              ...sdk.getContext(),
              aci: GOVERNANCE_POLL_ACI as any,
              address: pollAddress,
            });
      await poll.vote(option, { waitMined: true, confirm: false });
      track('governance_vote_done');
      return activeAccount;
    },
    onSuccess: (account, { pollAddress, option }) => {
      queryClient.setQueryData(
        ['governance', 'pollResults', pollAddress, account],
        (previous: { myVote?: number } | undefined) => previous && ({ ...previous, myVote: option }),
      );
      notifyIndexer('Vote', pollAddress);
    },
  });

  // Revoke vote mutation
  const useRevokeVote = () => useMutation({
    mutationFn: async (pollAddress: Encoded.ContractAddress) => {
      if (!activeAccount) throw new Error('No wallet connected');

      const poll = await Contract.initialize<{
          revoke_vote:() => void
            }>({
              ...sdk.getContext(),
              aci: GOVERNANCE_POLL_ACI as any,
              address: pollAddress,
            });
      await poll.revoke_vote({ waitMined: true, confirm: false });
      return activeAccount;
    },
    onSuccess: (account, pollAddress) => {
      queryClient.setQueryData(
        ['governance', 'pollResults', pollAddress, account],
        (previous: { myVote?: number } | undefined) => previous && ({ ...previous, myVote: undefined }),
      );
      notifyIndexer('RevokeVote', pollAddress);
    },
  });

  // Set delegation mutation
  const useSetDelegation = () => useMutation({
    mutationFn: async (delegateTo: Encoded.AccountAddress) => {
      if (!activeAccount) throw new Error('No wallet connected');

      const registry = await Contract.initialize<{
          delegate:(to: Encoded.AccountAddress) => void
            }>({
              ...sdk.getContext(),
              aci: REGISTRY_WITH_EVENTS_ACI as any,
              address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
            });

      await registry.delegate(delegateTo, { waitMined: true, confirm: false });
      return activeAccount;
    },
    onSuccess: (account, delegateTo) => {
      queryClient.setQueryData(['governance', 'delegation', account], delegateTo);
      notifyIndexer('Delegation');
    },
  });

  // Revoke delegation mutation
  const useRevokeDelegation = () => useMutation({
    mutationFn: async () => {
      if (!activeAccount) throw new Error('No wallet connected');

      const registry = await Contract.initialize<{
          revoke_delegation:() => void
            }>({
              ...sdk.getContext(),
              aci: REGISTRY_WITH_EVENTS_ACI as any,
              address: CONFIG.GOVERNANCE_CONTRACT_ADDRESS,
            });

      await registry.revoke_delegation({ waitMined: true, confirm: false });
      return activeAccount;
    },
    onSuccess: (account) => {
      queryClient.setQueryData(['governance', 'delegation', account], null);
      notifyIndexer('RevokeDelegation');
    },
  });

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
