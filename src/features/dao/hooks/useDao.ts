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
  const tokenSaleFactoryRef = useRef<TokenSale>();
  const tokenInstanceRef = useRef<Contract<ContractMethodsBase>>();
  const daoRef = useRef<DAO>();

  // State
  const [state, setState] = useState<DAOState>();
  const [balance, setBalance] = useState<number>();
  const [tokenSupply, setTokenSupply] = useState<bigint>();
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>();
  const [tokenMetaInfo, setTokenMetaInfo] = useState<{ symbol: string; decimals: bigint }>();

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
      }
    } catch (error) {
      console.error('Error updating DAO state:', error);
    }
  }, [activeAccount]);

  const init = useCallback(async () => {
    if (!sdk) return;

    try {
      // Initialize token sale factory if not already done
      if (!tokenSaleFactoryRef.current) {
        tokenSaleFactoryRef.current = await initFallBack(sdk, tokenSaleAddress);
        tokenInstanceRef.current = await tokenSaleFactoryRef.current.tokenContractInstance();
        daoRef.current = await tokenSaleFactoryRef.current.checkAndGetDAO();
      }

      await updateState();
    } catch (error) {
      console.error('Error initializing DAO:', error);
    }
  }, [sdk, tokenSaleAddress, updateState]);

  const addVote = useCallback(async (metadata: VoteMetadata): Promise<Vote | undefined> => {
    if (!daoRef.current) return undefined;
    try {
      const vote = await daoRef.current.addVote(metadata);
      await updateState();
      return vote;
    } catch (error) {
      console.error('Error adding vote:', error);
      return undefined;
    }
  }, [updateState]);

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
