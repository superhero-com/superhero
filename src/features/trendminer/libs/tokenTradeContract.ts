import { AeSdkBase, Contract, ContractMethodsBase, Encoded } from '@aeternity/aepp-sdk';
import { BondingCurveTokenSale, initAffiliationTokenGatingTokenSale, toTokenDecimals } from 'bctsl-sdk';
import { TokenDto } from '../types';
import { CONFIG } from '../../../config';
import { fetchJson } from '../../../utils/common';

// Contract instances cache
let tokenSaleInstance: BondingCurveTokenSale | undefined;
let bondingCurveInstance: Contract<ContractMethodsBase> | undefined;

/**
 * Setup contract instance for token trading
 */
export async function setupContractInstance(
  sdk: AeSdkBase, 
  token: TokenDto
): Promise<{
  tokenSaleInstance: BondingCurveTokenSale;
  bondingCurveInstance: Contract<ContractMethodsBase>;
}> {
  if (!token.sale_address) {
    throw new Error('Token sale address not found');
  }

  // Initialize token sale contract
  tokenSaleInstance = await initAffiliationTokenGatingTokenSale(
    sdk,
    token.sale_address as Encoded.ContractAddress,
  );

  // Get bonding curve contract instance
  bondingCurveInstance = (await tokenSaleInstance.bondingCurveContract()).instance;

  return {
    tokenSaleInstance,
    bondingCurveInstance,
  };
}

/**
 * Fetch user token balance
 */
export async function fetchUserTokenBalance(
  tokenSaleInstance: BondingCurveTokenSale,
  token: TokenDto,
  activeAccount: string
): Promise<string> {
  if (!tokenSaleInstance) {
    throw new Error('Contract not initialized');
  }

  let balance = '0';

  try {
    const tokenContract = await tokenSaleInstance.tokenContractInstance();
    if (activeAccount) {
      const result: { decodedResult?: bigint } = await tokenContract.balance(activeAccount);

      if (!result) throw new Error('User balance not fetched');
      const tokenBalance = result.decodedResult || 0n;

      if (!token) throw new Error('Token metadata not fetched');

      balance = toTokenDecimals(tokenBalance, (token.decimals || 18n) as any, 0n);
    }
  } catch (error) {
    console.error('Error fetching user token balance:', error);
    // Return '0' as fallback
  }

  return balance.toString();
}

/**
 * Get token symbol name from middleware
 */
export async function getTokenSymbolName(
  tokenAddress: Encoded.ContractAddress,
  middlewareUrl: string
): Promise<string> {
  try {
    const data = await fetchJson(`${middlewareUrl}/v3/aex9/${tokenAddress}`);
    return data?.symbol || data?.name || 'BCL';
  } catch (error) {
    console.error('Error fetching token symbol:', error);
    return 'BCL';
  }
}

/**
 * Get current contract instances
 */
export function getContractInstances() {
  return {
    tokenSaleInstance,
    bondingCurveInstance,
  };
}

/**
 * Clear contract instances (useful for cleanup)
 */
export function clearContractInstances() {
  tokenSaleInstance = undefined;
  bondingCurveInstance = undefined;
}
