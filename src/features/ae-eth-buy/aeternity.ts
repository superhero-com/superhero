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
  pollIntervalMs: number = 6000,
): Promise<boolean> {
  const startTime = Date.now();
  const delay = (ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

  const poll = async (): Promise<boolean> => {
    if (Date.now() - startTime >= timeoutMs) {
      return false;
    }
    try {
      const currentBalance = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, aeAccount);

      // Check if we received the expected amount (with some tolerance for precision)
      const actualIncrease = currentBalance - prevAeEthBalance;
      const tolerance = expectedIncrease / 1000n; // 0.1% tolerance

      if (actualIncrease >= (expectedIncrease - tolerance)) {
        return true;
      }
    } catch {
      // Continue polling despite errors
    }

    // Wait before next poll
    await delay(pollIntervalMs);
    return poll();
  };

  return poll();
}

/**
 * Get current æETH balance for an account
 */
export async function getAeEthBalance(sdk: AeSdk, aeAccount: string): Promise<bigint> {
  if (!sdk) {
    throw new Error('æternity SDK not available');
  }

  return getTokenBalance(sdk, DEX_ADDRESSES.aeeth, aeAccount);
}

/**
 * Check if account has sufficient æETH balance
 */
export async function hasMinimumAeEthBalance(
  sdk: AeSdk,
  aeAccount: string,
  minAmount: bigint,
): Promise<boolean> {
  try {
    const balance = await getAeEthBalance(sdk, aeAccount);
    return balance >= minAmount;
  } catch {
    return false;
  }
}
