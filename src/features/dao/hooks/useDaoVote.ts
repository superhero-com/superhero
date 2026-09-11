import {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import {
  initDAOVote, toTokenDecimals, Vote, VoteState,
} from 'bctsl-sdk';
import { useAeSdk, useAccount } from '@/hooks';
import { errorToUserMessage } from '@/libs/errorMessages';
import { useDao } from './useDao';
import { getVoteStateLabel, voteYesFraction, voteStakeYesFraction } from '../libs/voteCalculations';

export interface UseDaoVoteProps {
  tokenSaleAddress: Encoded.ContractAddress;
  voteAddress: Encoded.ContractAddress;
  voteId: bigint;
}

export function useDaoVote({ tokenSaleAddress, voteAddress, voteId }: UseDaoVoteProps) {
  const [vote, setVote] = useState<Vote>();
  const [voteState, setVoteState] = useState<VoteState>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const { sdk, currentBlockHeight } = useAeSdk();
  const { activeAccount } = useAccount();

  const dao = useDao({
    tokenSaleAddress,
  });

  const context = useMemo(() => ({
    sdk, tokenSaleAddress, voteAddress, voteId, activeAccount,
  }), [sdk, tokenSaleAddress, voteAddress, voteId, activeAccount]);
  const activeContextRef = useRef(context);
  activeContextRef.current = context;
  const actionInFlightRef = useRef(false);

  const voteMatchesDao = dao.state?.votes.get(voteId)?.[1] === voteAddress;

  const voteStateLabel = useMemo(() => (
    voteMatchesDao && voteState && dao.state
      && dao.tokenSupply !== undefined && currentBlockHeight > 0
      ? getVoteStateLabel(voteState, dao.state, dao.tokenSupply, voteId, currentBlockHeight)
      : undefined
  ), [voteMatchesDao, voteState, dao.state, dao.tokenSupply, voteId, currentBlockHeight]);

  const canVote = useMemo(
    () => activeAccount
      && voteState
      && voteStateLabel
      && sdk
      && vote?.canVote(voteStateLabel, voteState, activeAccount as any),
    [activeAccount, voteState, voteStateLabel, sdk, vote],
  );

  const canRevokeVote = useMemo(
    () => voteState
      && voteStateLabel
      && activeAccount
      && sdk
      && vote?.canRevokeVote(voteStateLabel, voteState, activeAccount as any),
    [voteState, voteStateLabel, activeAccount, sdk, vote],
  );

  const canWithdraw = useMemo(
    () => activeAccount
      && voteState
      && voteStateLabel
      && sdk
      && vote?.canWithdraw(voteStateLabel, voteState, activeAccount as any),
    [voteState, voteStateLabel, sdk, vote, activeAccount],
  );

  const canApply = useMemo(
    () => activeAccount && sdk && dao.dao && voteStateLabel && vote?.canApply(voteStateLabel),
    [activeAccount, sdk, dao.dao, voteStateLabel, vote],
  );

  const voteYesPercentage = useMemo(
    () => voteState && voteYesFraction(voteState),
    [voteState],
  );

  const voteStakeYesPercentage = useMemo(
    () => (voteState && dao.tokenSupply !== undefined
      ? voteStakeYesFraction(voteState, dao.tokenSupply) : undefined),
    [voteState, dao.tokenSupply],
  );

  const userVoteOrLockedInfo = useMemo(() => {
    if (
      voteState
      && dao.tokenMetaInfo
      && sdk
      && vote?.accountVoted(voteState, activeAccount as any)
    ) {
      const accountVotedBalance = vote?.accountVotedBalance(
        voteState,
        activeAccount as any,
      );

      const accountVotedBalanceTokenDecimals = accountVotedBalance !== undefined
        && toTokenDecimals(accountVotedBalance, dao.tokenMetaInfo.decimals, 0n);

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
    } return '';
  }, [voteState, dao.tokenMetaInfo, sdk, vote, activeAccount]);

  const refreshVoteState = useCallback(async () => {
    if (!vote) return;
    const newVoteState = await vote.state();
    if (activeContextRef.current === context) setVoteState(newVoteState);
  }, [vote, context]);

  // Keep the contract and state tied to this route. A previous request must not
  // populate a different proposal after navigation.
  useEffect(() => {
    let cancelled = false;
    setVote(undefined);
    setVoteState(undefined);
    setActionError(null);
    setActionLoading(false);
    actionInFlightRef.current = false;
    if (sdk) {
      (async () => {
        try {
          const newVote = await initDAOVote(sdk, voteAddress, voteId);
          const newVoteState = await newVote.state();
          if (!cancelled && activeContextRef.current === context) {
            setVote(newVote);
            setVoteState(newVoteState);
          }
        } catch (error) {
          if (!cancelled) setActionError(errorToUserMessage(error));
        }
      })();
    }
    return () => { cancelled = true; };
  }, [sdk, voteAddress, voteId, context]);

  const applyAction = useCallback(async (action: () => unknown | Promise<unknown>) => {
    if (activeContextRef.current !== context || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setActionLoading(true);
    setActionError(null);
    try {
      await action();
      if (activeContextRef.current !== context) return;
      await dao.init();
      if (activeContextRef.current !== context) return;
      await refreshVoteState();
    } catch (error) {
      if (activeContextRef.current === context) setActionError(errorToUserMessage(error));
    } finally {
      if (activeContextRef.current === context) {
        actionInFlightRef.current = false;
        setActionLoading(false);
      }
    }
  }, [refreshVoteState, dao, context]);

  const revokeVote = useCallback(async () => {
    if (!vote || !canRevokeVote) return;
    await applyAction(() => vote.revokeVote());
  }, [vote, canRevokeVote, applyAction]);

  const withdraw = useCallback(async () => {
    if (!vote || !canWithdraw) return;
    await applyAction(() => vote.withdraw());
  }, [vote, canWithdraw, applyAction]);

  const applyVote = useCallback(async () => {
    if (!dao.dao || !canApply) return;
    await applyAction(() => dao.dao!.applyVoteSubject(voteId));
  }, [dao.dao, canApply, voteId, applyAction]);

  const voteOption = useCallback(async (option: boolean) => {
    if (!vote || !canVote || !dao.userTokenBalance || !dao.tokenInstanceRef) return;
    await applyAction(() => vote.vote(option, dao.userTokenBalance!, dao.tokenInstanceRef!));
  }, [vote, canVote, dao.userTokenBalance, dao.tokenInstanceRef, applyAction]);

  return {
    vote,
    voteState,
    voteStateLabel,
    actionLoading,
    actionError: actionError || (voteState && dao.state && !voteMatchesDao
      ? 'This proposal does not match the selected DAO and vote number.' : null),

    canVote,
    canRevokeVote,
    canWithdraw,
    canApply,
    userVoteOrLockedInfo,

    voteYesPercentage,
    voteStakeYesPercentage,
    hasTokenBalance: dao.userTokenBalance,
    runTestCheck: refreshVoteState,

    // methods
    voteOption,
    revokeVote,
    withdraw,
    applyVote,
    refreshVoteState,
  };
}
