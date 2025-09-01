import BigNumber from 'bignumber.js';
import { LiquidityPosition } from '../types/pool';
import { getPairAddress, initDexContracts, DEX_ADDRESSES } from '../../../libs/dex';
import { LiquidityPositionData } from '../../../atoms/dexAtoms';

export interface CreatePositionParams {
  sdk: any;
  activeAccount: string;
  tokenA: string;
  tokenB: string;
  symbolA: string;
  symbolB: string;
  amountA: string;
  amountB: string;
  pairPreview: {
    sharePct?: string;
    lpMintEstimate?: string;
  } | null;
}

/**
 * Creates a LiquidityPosition object from add liquidity transaction data
 * This is used for optimistic UI updates before blockchain confirmation
 */
export async function createOptimisticPosition({
  sdk,
  activeAccount,
  tokenA,
  tokenB,
  symbolA,
  symbolB,
  amountA,
  amountB,
  pairPreview
}: CreatePositionParams): Promise<LiquidityPosition | null> {
  try {
    // Get the factory contract to find pair address
    const { factory } = await initDexContracts(sdk);
    
    // Convert AE to WAE for pair lookup
    const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
    const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
    
    // Get pair address - this will be our pairId
    const pairAddress = await getPairAddress(sdk, factory, aAddr, bAddr);
    if (!pairAddress) {
      console.warn('Could not find pair address for tokens', { tokenA, tokenB });
      return null;
    }
    
    // Determine token0 and token1 (typically sorted by address)
    const token0 = aAddr.toLowerCase() < bAddr.toLowerCase() ? tokenA : tokenB;
    const token1 = aAddr.toLowerCase() < bAddr.toLowerCase() ? tokenB : tokenA;
    
    // Use LP mint estimate as balance, or fallback to a calculated value
    let balance = pairPreview?.lpMintEstimate || '0';
    
    // If no LP estimate, create a rough estimate based on amounts
    if (!balance || balance === '0') {
      const amtA = new BigNumber(amountA || '0');
      const amtB = new BigNumber(amountB || '0');
      // Simple geometric mean as fallback
      balance = amtA.multipliedBy(amtB).sqrt().toString();
    }
    
    // Calculate approximate USD value (simplified - in real app you'd use token prices)
    // For now, we'll leave it undefined and let the next refresh update it
    const valueUsd = undefined;
    
    const position: LiquidityPosition = {
      pairId: pairAddress,
      token0,
      token1,
      balance,
      sharePct: pairPreview?.sharePct,
      valueUsd,
    };
    
    console.log('Created optimistic position:', position);
    return position;
    
  } catch (error) {
    console.error('Failed to create optimistic position:', error);
    return null;
  }
}

/**
 * Creates optimistic position data that can be used with updateProvidedLiquidity
 */
export async function createOptimisticPositionData({
  sdk,
  activeAccount,
  tokenA,
  tokenB,
  symbolA,
  symbolB,
  amountA,
  amountB,
  pairPreview
}: CreatePositionParams): Promise<{ pairId: string; data: LiquidityPositionData } | null> {
  try {
    // Get the factory contract to find pair address
    const { factory } = await initDexContracts(sdk);
    
    // Convert AE to WAE for pair lookup
    const aAddr = tokenA === 'AE' ? DEX_ADDRESSES.wae : tokenA;
    const bAddr = tokenB === 'AE' ? DEX_ADDRESSES.wae : tokenB;
    
    // Get pair address - this will be our pairId
    const pairAddress = await getPairAddress(sdk, factory, aAddr, bAddr);
    if (!pairAddress) {
      console.warn('Could not find pair address for tokens', { tokenA, tokenB });
      return null;
    }
    
    // Use LP mint estimate as balance, or fallback to a calculated value
    let balance = pairPreview?.lpMintEstimate || '0';
    
    // If no LP estimate, create a rough estimate based on amounts
    if (!balance || balance === '0') {
      const amtA = new BigNumber(amountA || '0');
      const amtB = new BigNumber(amountB || '0');
      // Simple geometric mean as fallback
      balance = amtA.multipliedBy(amtB).sqrt().toString();
    }
    
    const data: LiquidityPositionData = {
      balance,
      token0: symbolA,
      token1: symbolB,
      sharePct: pairPreview?.sharePct,
      valueUsd: undefined, // Will be updated on next refresh
    };
    
    console.log('Created optimistic position data:', { pairId: pairAddress, data });
    return { pairId: pairAddress, data };
    
  } catch (error) {
    console.error('Failed to create optimistic position data:', error);
    return null;
  }
}
