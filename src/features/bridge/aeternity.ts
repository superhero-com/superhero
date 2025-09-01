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
  console.info('[Bridge] Waiting for æETH deposit…', {
    expectedIncrease: expectedIncrease.toString(),
    account: aeAccount
  });

  while (Date.now() - startTime < timeoutMs) {
    try {
      const currentBalance = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, aeAccount);

      console.info('[Bridge] æETH balance check', {
        previous: prevAeEthBalance.toString(),
        current: currentBalance.toString(),
        expectedIncrease: expectedIncrease.toString()
      });

      // Check if we received the expected amount (with some tolerance for precision)
      const actualIncrease = currentBalance - prevAeEthBalance;
      const tolerance = expectedIncrease / 1000n; // 0.1% tolerance

      if (actualIncrease >= (expectedIncrease - tolerance)) {
        console.info('[Bridge] æETH deposit confirmed', {
          actualIncrease: actualIncrease.toString(),
          expectedIncrease: expectedIncrease.toString()
        });
        return true;
      }
    } catch (error) {
      console.warn('[Bridge] Error checking æETH balance:', error);
      // Continue polling despite errors
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn('[Bridge] Timeout waiting for æETH deposit');
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
    console.error('[Bridge] Error checking æETH balance:', error);
    return false;
  }
}
