import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { initDAOVote, Vote, VoteState } from 'bctsl-sdk';
import { useAeSdk, useAccount } from '@/hooks';
import { useDao } from './useDao';
import { VOTE_NOT_LISTED } from '../utils/daoErrors';
import {
  DaoVoteStatus, voterActions, voterPosition, voteStatus, voteTally,
} from '../utils/voteRules';

export interface UseDaoVoteProps {
  tokenSaleAddress: Encoded.ContractAddress;
  voteAddress: Encoded.ContractAddress;
  voteId: bigint;
}

export function useDaoVote({ tokenSaleAddress, voteAddress, voteId }: UseDaoVoteProps) {
  const [vote, setVote] = useState<Vote>();
  const [voteState, setVoteState] = useState<VoteState>();
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<unknown>();
  const [loadError, setLoadError] = useState(false);

  const { sdk, currentBlockHeight } = useAeSdk();
  const { activeAccount } = useAccount();
  const queryClient = useQueryClient();

  const dao = useDao({
    tokenSaleAddress,
  });

  // Status, tally and the account's options, computed with the contract's own pass rules
  // (see utils/voteRules).
  const tally = useMemo(
    () => (voteState ? voteTally(voteState, dao.tokenSupply) : undefined),
    [voteState, dao.tokenSupply],
  );

  const status = useMemo((): DaoVoteStatus | undefined => {
    if (!voteState || !dao.state || currentBlockHeight == null) return undefined;
    const entry = dao.state.votes?.get(voteId);
    return voteStatus({
      voteState,
      // The link may pair the id with another contract; only that vote's own flag counts.
      applied: entry?.[1] === voteAddress && entry[0],
      height: currentBlockHeight,
      voteTimeout: Number(dao.state.vote_timeout),
      tokenSupply: dao.tokenSupply,
    });
  }, [voteState, dao.state, dao.tokenSupply, currentBlockHeight, voteId, voteAddress]);

  const position = useMemo(
    () => voterPosition(voteState, activeAccount),
    [voteState, activeAccount],
  );

  const actions = useMemo(
    () => (status ? voterActions(status, position, !!activeAccount) : undefined),
    [status, position, activeAccount],
  );

  const refreshVoteState = useCallback(async () => {
    if (!vote) return;
    setVoteState(await vote.state());
  }, [vote]);

  const init = useCallback(async () => {
    if (!sdk) return;

    const newVote = await initDAOVote(sdk, voteAddress, voteId);
    setVote(newVote);
    setVoteState(await newVote.state());
  }, [sdk, voteAddress, voteId]);

  // A failed or cancelled signature is kept in `actionError` for the page to show.
  const applyAction = useCallback(async (action: () => unknown | Promise<unknown>) => {
    setActionLoading(true);
    setActionError(undefined);
    try {
      await action();
    } catch (error) {
      setActionError(error);
    } finally {
      try {
        await refreshVoteState();
        await dao.init();
        queryClient.invalidateQueries({ queryKey: ['dao-votes'] });
      } finally {
        setActionLoading(false);
      }
    }
  }, [refreshVoteState, dao, queryClient]);

  const revokeVote = useCallback(async () => {
    if (!vote) return;
    await applyAction(() => vote.revokeVote());
  }, [vote, applyAction]);

  const withdraw = useCallback(async () => {
    if (!vote) return;
    await applyAction(() => vote.withdraw());
  }, [vote, applyAction]);

  // The vote address comes from the link. Voting grants that contract an allowance and applying
  // runs the DAO's vote `voteId`, so both need it to be that vote. Read fresh: the state this page
  // loaded can predate a vote created moments ago. Revoke and withdraw grant nothing, and stay
  // open so tokens can come back from the votes of a DAO that was replaced.
  const ensureListed = useCallback(async () => {
    const listed = (await dao.dao?.state())?.votes.get(voteId)?.[1];
    if (listed !== voteAddress) throw new Error(VOTE_NOT_LISTED);
  }, [dao.dao, voteId, voteAddress]);

  const applyVote = useCallback(async () => {
    await applyAction(async () => {
      await ensureListed();
      await dao.applyVoteSubject(voteId);
    });
  }, [dao, voteId, applyAction, ensureListed]);

  // Votes with the account's whole token balance, which the vote contract then holds.
  const voteOption = useCallback(async (option: boolean) => {
    if (!vote || !dao.userTokenBalance || !dao.tokenInstanceRef) {
      return;
    }

    await applyAction(async () => {
      await ensureListed();
      await vote.vote(option, dao.userTokenBalance!, dao.tokenInstanceRef!);
    });
  }, [vote, dao.userTokenBalance, dao.tokenInstanceRef, applyAction, ensureListed]);

  // Initialize when tokenSaleAddress changes
  useEffect(() => {
    setLoadError(false);
    // A wrong or missing vote address would otherwise leave the page loading forever.
    init().catch(() => setLoadError(true));
  }, [tokenSaleAddress, init]);

  return {
    vote,
    voteState,
    actionLoading,
    actionError,
    loadError,

    status,
    tally,
    position,
    actions,
    voteTimeout: dao.state ? Number(dao.state.vote_timeout) : undefined,
    tokenSymbol: dao.tokenMetaInfo?.symbol,
    tokenDecimals: dao.tokenMetaInfo ? Number(dao.tokenMetaInfo.decimals) : 18,
    userTokenBalance: dao.userTokenBalance,
    daoLoaded: dao.loaded,
    // The DAO's setup finished without its state, so the status and the ballot can't be shown.
    daoFailed: dao.loaded && !dao.state,

    // methods
    voteOption,
    revokeVote,
    withdraw,
    applyVote,
    refreshVoteState,
  };
}
