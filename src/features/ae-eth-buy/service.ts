import { AeSdk } from '@aeternity/aepp-sdk';
import { bridgeEthToAe } from './ethereum';
import { waitForAeEthDeposit, getAeEthBalance } from './aeternity';
import {
  BridgeOptions,
  BridgeResult,
  BridgeStatus,
  BridgeProgressCallback,
  BridgeError,
  BridgeErrorType,
} from './types';
import {
  initDexContracts,
  toAettos,
  subSlippage,
  ensureAllowanceForRouter,
  DEX_ADDRESSES,
} from '../../libs/dex';

/**
 * Bridge service for ETH to AE operations
 */
export class BridgeService {
  private static instance: any = null;

  public static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService();
    }
    return BridgeService.instance;
  }

  /**
   * Bridge ETH to AE with optional automatic swap
   */
  public static async bridgeEthToAe(
    sdk: AeSdk,
    options: BridgeOptions,
    onProgress?: BridgeProgressCallback,
  ): Promise<BridgeResult> {
    const {
      amountEth,
      aeAccount,
      depositTimeout = 300_000,
      pollInterval = 6000,
      autoSwap = true,
      slippagePercent = 1,
      deadlineMinutes = 20,
      walletProvider,
    } = options;

    let status: BridgeStatus = 'idle';
    const updateStatus = (newStatus: BridgeStatus, message?: string) => {
      status = newStatus;
      onProgress?.(status, message);
    };

    try {
      // Validate inputs
      BridgeService.validateBridgeOptions(options);

      updateStatus('connecting', 'Connecting to Ethereum wallet...');

      const prevAeEthBalance = await getAeEthBalance(sdk, aeAccount);
      const expectedIncrease = BigInt(toAettos(amountEth, 18));

      updateStatus('bridging', 'Bridging ETH to æETH...');

      // 1. Bridge ETH to æETH on Ethereum
      const bridgeResult = await bridgeEthToAe({ amountEth, aeAccount, walletProvider });

      updateStatus('waiting', 'Waiting for æETH deposit on æternity...');

      // 2. Wait for æETH to arrive on æternity
      const depositReceived = await waitForAeEthDeposit(
        sdk,
        aeAccount,
        prevAeEthBalance,
        expectedIncrease,
        depositTimeout,
        pollInterval,
      );

      if (!depositReceived) {
        throw new BridgeError(
          BridgeErrorType.DEPOSIT_TIMEOUT,
          'Timeout waiting for æETH deposit. Please check the transaction status.',
        );
      }

      let swapTxHash: string | undefined;

      if (autoSwap) {
        updateStatus('swapping', 'Swapping æETH to AE...');

        try {
          swapTxHash = await BridgeService.swapAeEthToAe(
            sdk,
            aeAccount,
            expectedIncrease,
            slippagePercent,
            deadlineMinutes,
          );
        } catch (error) {
          throw new BridgeError(
            BridgeErrorType.SWAP_FAILED,
            `Failed to swap æETH to AE: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      updateStatus('completed', 'Bridge operation completed successfully!');

      return {
        success: true,
        ethTxHash: bridgeResult.txHash,
        aeTxHash: swapTxHash,
        status: 'completed',
      };
    } catch (error) {
      const bridgeError = error instanceof BridgeError
        ? error
        : new BridgeError(
          BridgeErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error occurred',
          error,
        );

      updateStatus('failed', bridgeError.message);

      return {
        success: false,
        error: bridgeError.message,
        status: 'failed',
      };
    }
  }

  /**
   * Swap æETH to AE on æternity DEX
   */
  private static async swapAeEthToAe(
    sdk: AeSdk,
    aeAccount: string,
    amountAeEth: bigint,
    slippagePercent: number,
    deadlineMinutes: number,
  ): Promise<string> {
    const { router } = await initDexContracts(sdk);

    const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];

    // Ensure allowance for router
    await ensureAllowanceForRouter(sdk, DEX_ADDRESSES.aeeth, aeAccount, amountAeEth);

    // Get expected output amount
    const { decodedResult } = await (router as any).get_amounts_out(amountAeEth, path);
    const expectedOut = BigInt(decodedResult[decodedResult.length - 1]);
    const minOut = subSlippage(expectedOut, slippagePercent);

    const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, deadlineMinutes)) * 60_000);

    // Execute swap
    const result = await (router as any).swap_exact_tokens_for_ae(
      amountAeEth,
      minOut,
      path,
      aeAccount,
      deadline,
      null,
    );

    return result?.hash || result?.tx?.hash || result?.transactionHash || '';
  }

  /**
   * Validate bridge options
   */
  private static validateBridgeOptions(options: BridgeOptions): void {
    const { amountEth, aeAccount } = options;

    if (!amountEth || Number(amountEth) <= 0) {
      throw new BridgeError(
        BridgeErrorType.UNKNOWN_ERROR,
        'Amount must be greater than 0',
      );
    }

    if (!aeAccount || !aeAccount.startsWith('ak_')) {
      throw new BridgeError(
        BridgeErrorType.UNKNOWN_ERROR,
        'Invalid æternity account format. Must start with "ak_"',
      );
    }
  }
}
