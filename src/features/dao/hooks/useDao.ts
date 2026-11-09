import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  DAO, initFallBack, TokenSale, Vote, VoteMetadata,
} from 'bctsl-sdk';
import { Encoded, toAe, Contract } from '@aeternity/aepp-sdk';
import type { ContractMethodsBase } from '@aeternity/aepp-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useAtom } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';

export interface UseDaoProps {
  tokenSaleAddress: Encoded.ContractAddress;
}

export interface DAOState {
    factory: Encoded.ContractAddress;
    token_sale: Encoded.ContractAddress;
    vote_timeout: bigint;
    votes: Map<bigint, [boolean, Encoded.ContractAddress]>;
}

export function useDao({ tokenSaleAddress }: UseDaoProps) {
  const { sdk } = useAeSdk();
  const [activeAccount] = useAtom(activeAccountAtom);

  // Refs for contract instances
  const tokenSaleFactoryRef = useRef<TokenSale>(undefined);
  const tokenInstanceRef = useRef<Contract<ContractMethodsBase>>(undefined);
  const daoRef = useRef<DAO>(undefined);
  // The contracts are bound to the SDK they were created with. Connecting a wallet swaps the
  // read-only SDK for the wallet one, so they are rebuilt then; otherwise calls that need a
  // signature (create, vote, apply) would go to the read-only SDK.
  const boundSdkRef = useRef<unknown>(undefined);

  // State
  const [state, setState] = useState<DAOState>();
  const [balance, setBalance] = useState<number>();
  const [tokenSupply, setTokenSupply] = useState<bigint>();
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>();
  const [tokenMetaInfo, setTokenMetaInfo] = useState<{ symbol: string; decimals: bigint }>();
  const [loaded, setLoaded] = useState(false);

  const updateState = useCallback(async () => {
    if (!tokenInstanceRef.current || !daoRef.current) return;

    try {
      // Get token supply
      const supplyResult = await tokenInstanceRef.current.total_supply();
      setTokenSupply(supplyResult.decodedResult);

      // Get token meta info
      const metaResult = await tokenInstanceRef.current.meta_info();
      setTokenMetaInfo(metaResult.decodedResult);

      // Get DAO state
      const daoState = await daoRef.current.state();
      setState(daoState);

      // Get DAO balance
      const balanceAettos = await daoRef.current.balanceAettos();
      setBalance(Number(toAe(balanceAettos || 0)));

      // Get user token balance if account is active
      if (activeAccount) {
        const balanceResult = await tokenInstanceRef.current.balance(activeAccount);
        setUserTokenBalance(balanceResult.decodedResult || 0n);
      } else {
        setUserTokenBalance(undefined);
      }
    } catch {
      // Ignore DAO state update errors
    }
  }, [activeAccount]);

  const init = useCallback(async () => {
    if (!sdk) return;

    try {
      if (!tokenSaleFactoryRef.current || boundSdkRef.current !== sdk) {
        boundSdkRef.current = sdk;
        tokenSaleFactoryRef.current = await initFallBack(sdk, tokenSaleAddress);
        tokenInstanceRef.current = await tokenSaleFactoryRef.current.tokenContractInstance();
        daoRef.current = await tokenSaleFactoryRef.current.checkAndGetDAO();
      }

      await updateState();
    } catch {
      // Ignore DAO init errors
    } finally {
      setLoaded(true);
    }
  }, [sdk, tokenSaleAddress, updateState]);

  // Errors are passed on: the create form shows them.
  const addVote = useCallback(async (metadata: VoteMetadata): Promise<Vote | undefined> => {
    if (!daoRef.current) return undefined;
    const vote = await daoRef.current.addVote(metadata);
    await updateState();
    return vote;
  }, [updateState]);

  const applyVoteSubject = useCallback(async (voteId: bigint) => {
    if (!daoRef.current) return;
    await daoRef.current.applyVoteSubject(voteId);
  }, []);

  // Initialize when tokenSaleAddress or sdk changes
  useEffect(() => {
    init();
  }, [init]);

  return {
    tokenSaleFactoryRef: tokenSaleFactoryRef.current,
    tokenInstanceRef: tokenInstanceRef.current,
    dao: daoRef.current,
    state,
    balance,
    addVote,
    applyVoteSubject,
    tokenSupply,
    userTokenBalance,
    tokenMetaInfo,
    loaded,
    updateState,
    init,
  };
}
