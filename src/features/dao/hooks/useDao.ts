import {
  useCallback, useEffect, useRef, useState, useMemo,
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

  const context = useMemo(() => ({
    sdk, tokenSaleAddress, activeAccount,
  }), [sdk, tokenSaleAddress, activeAccount]);
  const activeContextRef = useRef(context);
  activeContextRef.current = context;

  // Refs for contract instances
  const tokenSaleFactoryRef = useRef<TokenSale>(undefined);
  const tokenInstanceRef = useRef<Contract<ContractMethodsBase>>(undefined);
  const daoRef = useRef<DAO>(undefined);
  const generationRef = useRef(0);

  // State
  const [state, setState] = useState<DAOState>();
  const [balance, setBalance] = useState<number>();
  const [tokenSupply, setTokenSupply] = useState<bigint>();
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>();
  const [tokenMetaInfo, setTokenMetaInfo] = useState<{ symbol: string; decimals: bigint }>();

  const updateState = useCallback(async () => {
    if (activeContextRef.current !== context
      || !tokenInstanceRef.current || !daoRef.current) return;

    const generation = generationRef.current;
    const tokenContract = tokenInstanceRef.current;
    const daoContract = daoRef.current;
    try {
      const [
        supplyResult, metaResult, daoState, balanceAettos, accountBalance,
      ] = await Promise.all([
        tokenContract.total_supply(),
        tokenContract.meta_info(),
        daoContract.state(),
        daoContract.balanceAettos(),
        activeAccount ? tokenContract.balance(activeAccount) : Promise.resolve(undefined),
      ]);
      if (generation !== generationRef.current) return;
      setTokenSupply(supplyResult.decodedResult);
      setTokenMetaInfo(metaResult.decodedResult);
      setState(daoState);
      setBalance(Number(toAe(balanceAettos || 0)));
      setUserTokenBalance(activeAccount ? accountBalance?.decodedResult || 0n : undefined);
    } catch {
      // Keep the latest successfully fetched state for this DAO.
    }
  }, [activeAccount, context]);

  const init = useCallback(async () => {
    if (activeContextRef.current !== context || !sdk) return;
    const generation = generationRef.current;
    try {
      if (!tokenSaleFactoryRef.current) {
        const tokenSale = await initFallBack(sdk, tokenSaleAddress);
        const [tokenContract, daoContract] = await Promise.all([
          tokenSale.tokenContractInstance(), tokenSale.checkAndGetDAO(),
        ]);
        if (generation !== generationRef.current) return;
        tokenSaleFactoryRef.current = tokenSale;
        tokenInstanceRef.current = tokenContract;
        daoRef.current = daoContract;
      }
      await updateState();
    } catch {
      // The DAO may not have been deployed for this token yet.
    }
  }, [sdk, tokenSaleAddress, updateState, context]);

  const addVote = useCallback(async (metadata: VoteMetadata): Promise<Vote> => {
    if (activeContextRef.current !== context || !daoRef.current) {
      throw new Error('DAO is not available yet. Please try again.');
    }
    const generation = generationRef.current;
    const vote = await daoRef.current.addVote(metadata);
    if (generation === generationRef.current) await updateState();
    return vote;
  }, [updateState, context]);

  // Reset contracts as well as visible data when switching DAO or wallet SDK.
  useEffect(() => {
    generationRef.current += 1;
    tokenSaleFactoryRef.current = undefined;
    tokenInstanceRef.current = undefined;
    daoRef.current = undefined;
    setState(undefined);
    setBalance(undefined);
    setTokenSupply(undefined);
    setTokenMetaInfo(undefined);
    setUserTokenBalance(undefined);
    return () => { generationRef.current += 1; };
  }, [sdk, tokenSaleAddress]);

  useEffect(() => {
    generationRef.current += 1;
    setUserTokenBalance(undefined);
  }, [activeAccount]);

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
    tokenSupply,
    userTokenBalance,
    tokenMetaInfo,
    updateState,
    init,
  };
}
