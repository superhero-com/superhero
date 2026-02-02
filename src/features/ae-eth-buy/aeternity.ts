import { AeSdk } from '@aeternity/aepp-sdk';
import { getTokenBalance, DEX_ADDRESSES } from '../../libs/dex';

/**
 * Wait for æETH deposit to arrive on æternity network
 */
export async function waitForAeEthDeposit(
  sdk: AeSdk,
  aeAccount: string,
  prevAeEthBalance: bigint,
  expectedIncrease: bigint,
  timeoutMs: number = 300_000,
  pollIntervalMs: number = 6000
): Promise<boolean> {

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const currentBalance = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, aeAccount);

      // Check if we received the expected amount (with some tolerance for precision)
      const actualIncrease = currentBalance - prevAeEthBalance;
      const tolerance = expectedIncrease / 1000n; // 0.1% tolerance

      if (actualIncrease >= (expectedIncrease - tolerance)) {
        return true;
      }
    } catch (error) {
      // Continue polling despite errors
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

/**
 * Get current æETH balance for an account
 */
export async function getAeEthBalance(sdk: AeSdk, aeAccount: string): Promise<bigint> {
  if (!sdk) {
    throw new Error('æternity SDK not available');
  }

  return await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, aeAccount);
}

/**
 * Check if account has sufficient æETH balance
 */
export async function hasMinimumAeEthBalance(
  sdk: AeSdk,
  aeAccount: string,
  minAmount: bigint
): Promise<boolean> {
  try {
    const balance = await getAeEthBalance(sdk, aeAccount);
    return balance >= minAmount;
  } catch (error) {
    return false;
  }
}
