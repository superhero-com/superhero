import { useState, useEffect, useCallback, useMemo } from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import { initDAOVote, toTokenDecimals, Vote, VOTE_STATE_LABEL, VoteState } from 'bctsl-sdk';
import { useAeSdk } from '@/hooks';
import { useAccount } from '@/hooks';
import { useDao } from './useDao';

export interface UseDaoVoteProps {
  tokenSaleAddress: Encoded.ContractAddress;
  voteAddress: Encoded.ContractAddress;
  voteId: bigint;
}

export function useDaoVote({ tokenSaleAddress, voteAddress, voteId }: UseDaoVoteProps) {
  const [vote, setVote] = useState<Vote>();
  const [voteState, setVoteState] = useState<VoteState>();
  const [voteStateLabel, setVoteStateLabel] = useState<VOTE_STATE_LABEL>();
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const { sdk, currentBlockHeight } = useAeSdk();
  const { activeAccount } = useAccount();

  const dao = useDao({
    tokenSaleAddress,
  });


  const canVote = useMemo(
    () =>
      activeAccount &&
      voteState &&
      voteStateLabel &&
      sdk &&
      vote?.canVote(voteStateLabel, voteState, activeAccount as any),
    [activeAccount, voteState, voteStateLabel, sdk, vote]
  );

  const canRevokeVote = useMemo(
    () =>
      voteState &&
      voteStateLabel &&
      activeAccount &&
      sdk &&
      vote?.canRevokeVote(voteStateLabel, voteState, activeAccount as any),
    [voteState, voteStateLabel, activeAccount, sdk, vote]
  );

  const canWithdraw = useMemo(
    () =>
      voteState &&
      voteStateLabel &&
      sdk &&
      vote?.canWithdraw(voteStateLabel, voteState, activeAccount as any),
    [voteState, voteStateLabel, sdk, vote, activeAccount]
  );

  const canApply = useMemo(
    () => voteStateLabel && vote?.canApply(voteStateLabel),
    [voteStateLabel, vote]
  );

  const voteYesPercentage = useMemo(
    () => voteState && vote?.voteYesPercentage(voteState),
    [voteState, vote]
  );

  const voteStakeYesPercentage = useMemo(
    () =>
      voteState && dao.tokenSupply
        ? vote?.voteStakeYesPercentage(voteState, dao.tokenSupply)
        : 1,
    [voteState, dao.tokenSupply, vote]
  );

  const userVoteOrLockedInfo = useMemo(() => {
    if (
      voteState &&
      dao.tokenMetaInfo &&
      sdk &&
      vote?.accountVoted(voteState, activeAccount as any)
    ) {
      const accountVotedBalance = vote?.accountVotedBalance(
        voteState,
        activeAccount as any,
      );

      const accountVotedBalanceTokenDecimals =
        accountVotedBalance !== undefined &&
        toTokenDecimals(accountVotedBalance, dao.tokenMetaInfo.decimals, 0n);

      const accountHasLockedBalance = vote?.accountHasLockedBalance(
        voteState,
        activeAccount as any,
      );

      const accountVotedAgreement = vote?.accountVotedAgreement(
        voteState,
        activeAccount as any,
      );

      return `You ${
        accountHasLockedBalance ? 'Locked' : 'Voted'
      } ${accountVotedBalanceTokenDecimals} ${
        dao.tokenMetaInfo.symbol
      } in ${accountVotedAgreement ? 'Agreement' : 'Disagreement'}`;
    } else return '';
  }, [voteState, dao.tokenMetaInfo, sdk, vote, activeAccount]);

  const refreshVoteState = useCallback(async () => {
    if (!vote) return;
    
    const newVoteState = await vote.state();
    setVoteState(newVoteState);
    
    if (newVoteState && dao.state && dao.tokenSupply !== undefined) {
      const newVoteStateLabel = await vote.voteStateLabel(
        newVoteState, 
        dao.state, 
        dao.tokenSupply
      );
      setVoteStateLabel(newVoteStateLabel);
    }
  }, [vote, dao.state, dao.tokenSupply]);

  const init = useCallback(async () => {
    if (!sdk) return;
    
    const newVote = await initDAOVote(sdk, voteAddress, voteId);
    setVote(newVote);
    
    const newVoteState = await newVote.state();
    setVoteState(newVoteState);
    
    if (dao.state && dao.tokenSupply !== undefined) {
      const newVoteStateLabel = await newVote.voteStateLabel(
        newVoteState, 
        dao.state, 
        dao.tokenSupply
      );
      setVoteStateLabel(newVoteStateLabel);
    }
  }, [sdk, voteAddress, voteId, dao.state, dao.tokenSupply]);

  const runTestCheck = useCallback(async () => {
    if (!voteState || !vote) {
      return;
    }

    if (dao.tokenSupply) {
      const vsl = await vote.voteStateLabel(
        voteState,
        dao.state!,
        dao.tokenSupply,
      );
      console.log('vsl', vsl);
    }

    if (voteStateLabel && voteState) {
      const canV = vote.canVote(
        voteStateLabel,
        voteState,
        activeAccount as any,
      );
      console.log('can vote', canV);
    }
  }, [voteState, vote, dao.tokenSupply, dao.state, voteStateLabel, activeAccount]);

  const applyAction = useCallback(async (action: () => unknown | Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
    } catch (e) {
      console.error(e);
    }
    await refreshVoteState();
    await dao.init();
    setActionLoading(false);
  }, [refreshVoteState, dao]);

  const revokeVote = useCallback(() => {
    if (!vote) return;
    applyAction(() => vote.revokeVote());
  }, [vote, applyAction]);

  const withdraw = useCallback(() => {
    if (!vote) return;
    applyAction(() => vote.withdraw());
  }, [vote, applyAction]);

  const voteOption = useCallback(async (option: boolean) => {
    if (!vote || !dao.userTokenBalance || !dao.tokenInstanceRef) {

        console.log('voteOption', vote, dao.userTokenBalance, dao.tokenInstanceRef);
        return
    }
    
    applyAction(async () =>
      vote.vote(option, dao.userTokenBalance!, dao.tokenInstanceRef!),
    );
  }, [vote, dao.userTokenBalance, dao.tokenInstanceRef, applyAction]);

  // Initialize when tokenSaleAddress changes
  useEffect(() => {
    init();
  }, [tokenSaleAddress, init]);

  return {
    vote,
    voteState,
    voteStateLabel,
    actionLoading,

    canVote,
    canRevokeVote,
    canWithdraw,
    canApply,
    userVoteOrLockedInfo,

    voteYesPercentage,
    voteStakeYesPercentage,
    hasTokenBalance: dao.userTokenBalance,
    runTestCheck,

    // methods
    voteOption,
    revokeVote,
    withdraw,
    refreshVoteState,
  };
}
