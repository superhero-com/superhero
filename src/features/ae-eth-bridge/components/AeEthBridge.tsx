/* eslint-disable no-nested-ternary */
import {
  useState, useMemo, useCallback, useEffect,
} from 'react';
import { useAppKitProvider } from '@reown/appkit/react';
import BigNumber from 'bignumber.js';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useRecentActivities } from '@/hooks/useRecentActivities';
import { useFlowWatcher } from '@/hooks';
import { ConfirmationPreviewCard } from '@/components/flow/ConfirmationPreviewCard';

import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import Spinner from '@/components/Spinner';
import { FromTo } from '@/features/shared/components';
import { Decimal } from '@/libs/decimal';
import { isAmountGreaterThanBalance } from '@/utils/balance';
import BridgeTokenSelector from './BridgeTokenSelector';
import ConnectEthereumWallet from './ConnectEthereumWallet';
import { AETERNITY_FUNDS_ADDRESS, BRIDGE_USAGE_INTERVAL_IN_HOURS, BridgeConstants } from '../constants';
import { useBridge } from '../hooks/useBridge';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { AppKitProvider } from '../providers/AppKitProvider';
import * as Aeternity from '../services/aeternity';
import * as Ethereum from '../services/ethereum';
import {
  Asset,
  BRIDGE_AETERNITY_ACTION_TYPE,
  BRIDGE_ETH_ACTION_TYPE,
  BRIDGE_TOKEN_ACTION_TYPE,
  BridgeAction, Direction,
} from '../types';
import { addTokenToEthereumWallet } from '../utils/addTokenToEthereumWallet';
import { getTxUrl } from '../utils/getTxUrl';
import { Logger } from '../utils/logger';

const checkEvmNetworkHasEnoughBalance = async (
  asset: any,
  normalizedAmount: BigNumber,
  walletProvider: Eip1193Provider,
): Promise<boolean> => {
  if (asset.symbol === 'WAE') return true;

  const bridgeAddress = BridgeConstants.ethereum.bridge_address;

  try {
    if (asset.symbol === 'ETH') {
      const provider = new BrowserProvider(walletProvider, {
        name: 'Ethereum Bridge',
        chainId: parseInt(BridgeConstants.ethereum.ethChainId, 16),
      });
      const balance = await provider.getBalance(bridgeAddress);
      return new BigNumber(balance.toString()).isGreaterThanOrEqualTo(normalizedAmount);
    }

    const provider = new BrowserProvider(walletProvider, {
      name: 'Ethereum Bridge',
      chainId: parseInt(BridgeConstants.ethereum.ethChainId, 16),
    });
    const signer = await provider.getSigner();
    const assetContract = new Ethereum.Contract(
      asset.ethAddress,
      BridgeConstants.ethereum.asset_abi,
      signer,
    );

    // Add timeout for balance check
    const balancePromise = assetContract.balanceOf(bridgeAddress);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Balance check timeout')), 10000);
    });

    const balance = await Promise.race([balancePromise, timeoutPromise]);
    const tokenBalanceOfBridge = new BigNumber(balance.toString());

    return tokenBalanceOfBridge.isGreaterThanOrEqualTo(normalizedAmount);
  } catch (error) {
    Logger.warn('Failed to check bridge balance, assuming sufficient:', error);
    return true; // Assume sufficient balance if check fails
  }
};

// Check if user has enough balance using useTokenBalances data
const checkUserHasEnoughBalance = (
  asset: Asset,
  normalizedAmount: BigNumber,
  direction: Direction,
  aeBalances: Record<string, string>,
  ethBalances: Record<string, string>,
): boolean => {
  if (!asset) return false;

  let userBalance: string;

  if (direction === Direction.EthereumToAeternity) {
    // User is bridging from Ethereum to Aeternity, check ETH balance
    userBalance = ethBalances[asset.symbol] || '0';
  } else {
    // User is bridging from Aeternity to Ethereum, check AE balance
    userBalance = aeBalances[asset.symbol] || '0';
  }

  // Convert user balance to the same units as normalizedAmount (raw token units)
  const userBalanceBN = new BigNumber(userBalance).shiftedBy(asset.decimals);
  return userBalanceBN.isGreaterThanOrEqualTo(normalizedAmount);
};

const checkAeAccountHasEligibleBridgeUse = async (account: string) => {
  const bridge = BridgeConstants.aeternity.bridge_address;
  const { aeAPI } = BridgeConstants;

  const response = await fetch(
    `${aeAPI}/v3/transactions?account=${account}&contract_id=${bridge}&entrypoint=bridge_out&limit=1`,
  ).then((res) => res.json());

  if (!response.data.length) {
    return true;
  }

  const lastTxTime = new Date(response.data[0].micro_time);
  const timeNow = new Date();
  const diffInHours = (timeNow.getTime() - lastTxTime.getTime()) / 1000 / 60 / 60;

  return diffInHours >= BRIDGE_USAGE_INTERVAL_IN_HOURS;
};

export const AeEthBridge = () => {
  const { t } = useTranslation('dex');
  const { push: showToast } = useToast();
  const {
    asset, assets, direction, updateAsset, updateDirection, isMainnet,
  } = useBridge();
  const { sdk, activeAccount } = useAeSdk();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155');
  const { addActivity } = useRecentActivities();
  const {
    startFlow,
    getFlowById,
    setCurrentStepStatus,
    advanceFlowStep,
    completeFlow,
    failFlow,
  } = useFlowWatcher();

  const [buttonBusy, setButtonBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState<'allowance' | 'bridge' | null>(null);
  const [confirmingMsg, setConfirmingMsg] = useState('');
  const [bridgeActionSummary, setBridgeActionSummary] = useState<BridgeAction | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [ethereumAccounts, setEthereumAccounts] = useState<string[]>([]);
  const [selectedEthAccount, setSelectedEthAccount] = useState<string>('');
  const [maxBusy, setMaxBusy] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  // TODO: Implement these checks properly
  const isBridgeContractEnabled = true;
  const hasOperatorEnoughBalance = true;
  const aeternityAddress = activeAccount;
  const effectiveEthAccount = selectedEthAccount || ethereumAccounts[0] || '';

  // Use the new useTokenBalances hook
  const {
    aeBalances, ethBalances, loading: loadingBalance, refetch: refetchBalances,
  } = useTokenBalances({
    assets,
    direction,
    aeAccount: aeternityAddress,
    ethAccount: effectiveEthAccount,
    sdk,
  });

  // Get the current token balance based on direction
  const tokenBalance = useMemo(() => {
    if (!asset) return '';

    if (direction === Direction.EthereumToAeternity) {
      return ethBalances[asset.symbol] || '0';
    }
    return aeBalances[asset.symbol] || '0';
  }, [asset, direction, aeBalances, ethBalances]);

  // Fetch Ethereum accounts
  const fetchEthereumAccounts = useCallback(async () => {
    if (!walletProvider) {
      setEthereumAccounts([]);
      return;
    }

    try {
      const provider = new BrowserProvider(walletProvider);
      const accounts = await provider.send('eth_accounts', []);
      setEthereumAccounts(accounts || []);

      // Set first account as selected if none selected
      if (accounts.length > 0 && !selectedEthAccount) {
        setSelectedEthAccount(accounts[0]);
        setTimeout(() => {
          refetchBalances();
        }, 500);
      }
    } catch (error) {
      Logger.error('Error fetching Ethereum accounts:', error);
      setEthereumAccounts([]);
    }
  }, [walletProvider, selectedEthAccount, refetchBalances]);

  const handleDirectionChange = useCallback((value: Direction) => {
    updateDirection(value);
    setDestination('');
    setAmount('');
  }, [updateDirection]);

  const handleEthAccountChange = useCallback((account: string) => {
    setSelectedEthAccount(account);
    // Balance will be automatically refetched by the useTokenBalances hook
  }, []);

  const handleEthereumWalletConnected = useCallback((accounts: string[]) => {
    setEthereumAccounts(accounts);
    if (accounts.length > 0) {
      setSelectedEthAccount(accounts[0]);
    }
  }, []);

  const handleEthereumWalletError = useCallback((error: string) => {
    showToast(error.substring(0, 100));
  }, [showToast]);

  const handleEthereumWalletDisconnected = useCallback(() => {
    setEthereumAccounts([]);
    setSelectedEthAccount('');
    Logger.log('Ethereum wallet disconnected');
  }, []);

  const handleAssetChange = useCallback((selectedAsset: Asset) => {
    updateAsset(selectedAsset);
    setAmount(''); // Reset amount when changing assets
  }, [updateAsset]);

  const normalizedAmount = useMemo(() => {
    if (!amount) {
      return new BigNumber(0);
    }
    return new BigNumber(amount).shiftedBy(asset.decimals);
  }, [asset, amount]);

  const hasInsufficientBalance = useMemo(() => {
    // Only validate when we have a connected source account and balances are not loading
    const hasSourceAccount = direction === Direction.EthereumToAeternity
      ? !!selectedEthAccount
      : !!aeternityAddress;
    if (!hasSourceAccount || loadingBalance || !amount) return false;

    return isAmountGreaterThanBalance(amount, tokenBalance || '0');
  }, [direction, selectedEthAccount, aeternityAddress, loadingBalance, amount, tokenBalance]);

  const isValidDestination = useMemo(() => {
    if (!destination) {
      return false;
    }
    if (direction === Direction.AeternityToEthereum) {
      return Ethereum.isAddressValid(destination);
    }
    return Aeternity.isAddressValid(destination);
  }, [destination, direction]);

  const showTransactionSubmittedMessage = useCallback((message: string, hash: string) => {
    const url = getTxUrl(direction, hash);
    showToast(
      <div>
        <div>{message}</div>
        <Button
          variant="link"
          className="p-0 h-auto text-blue-400"
          onClick={() => window.open(url, '_blank')?.focus()}
        >
          {t('bridge.viewTransaction')}
        </Button>
      </div>,
    );
  }, [direction, showToast, t]);

  const showSnackMessage = useCallback((message: string) => {
    showToast(message.substring(0, 100));
  }, [showToast]);

  // Fetch Ethereum accounts when direction changes to Ethereum or wallet provider changes
  useEffect(() => {
    if (direction === Direction.EthereumToAeternity && walletProvider) {
      fetchEthereumAccounts();
    }
  }, [direction, walletProvider, fetchEthereumAccounts]);

  const bridgeToAeternity = useCallback(async () => {
    let startedFlowId: string | null = null;
    try {
      if (!walletProvider) {
        showSnackMessage(t('bridge.connectEthereumWalletFirst'));
        return;
      }

      const ethersProvider = new BrowserProvider(walletProvider, {
        name: 'Ethereum Bridge',
        chainId: parseInt(BridgeConstants.ethereum.ethChainId, 16),
      });
      const signer = await ethersProvider.getSigner();
      const signerAddress = selectedEthAccount || await signer.getAddress();

      Logger.log('=== Bridge Transaction Starting ===');
      Logger.log('Ethereum Account:', signerAddress);
      Logger.log('Aeternity Destination:', destination);

      // Check if on correct network
      const network = await ethersProvider.getNetwork();
      Logger.log('Connected to chain ID:', network.chainId.toString(), `(expected: ${parseInt(BridgeConstants.ethereum.ethChainId, 16)})`);

      const expectedChainId = BridgeConstants.ethereum.ethChainId;
      if (network.chainId.toString() !== parseInt(expectedChainId, 16).toString()) {
        showSnackMessage(
          t('bridge.switchNetwork', { network: BridgeConstants.isMainnet ? `${t('bridge.networks.ethereum')} Mainnet` : t('bridge.networks.ethereumSepoliaTestnet') }),
        );
        return;
      }

      const bridge = new Ethereum.Contract(
        BridgeConstants.ethereum.bridge_address,
        BridgeConstants.ethereum.bridge_abi,
        signer,
      );
      const assetContract = new Ethereum.Contract(
        asset.ethAddress,
        BridgeConstants.ethereum.asset_abi,
        signer,
      );

      if (!isValidDestination || !destination?.startsWith('ak_')) {
        showSnackMessage(t('bridge.invalidDestination'));
        return;
      }
      if (!normalizedAmount || normalizedAmount.isLessThanOrEqualTo(0)) {
        showSnackMessage(t('bridge.invalidAmount'));
        return;
      }

      Logger.log('Bridge params:', {
        assetAddress: asset.ethAddress,
        destination,
        amount: normalizedAmount.toString(),
        signerAddress,
      });

      setButtonBusy(true);
      startedFlowId = startFlow({
        flowType: 'ae_eth_bridge',
        context: { direction: 'eth_to_ae' },
        steps: [
          {
            id: 'confirm_allowance',
            label: 'Confirm token allowance',
            kind: 'wallet_confirmation',
            status: 'pending',
            preview: {
              title: 'Confirm token approval',
              network: 'Ethereum',
              action: 'Approve bridge contract',
              asset: asset.symbol,
              amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
              spenderOrContract: BridgeConstants.ethereum.bridge_address,
              riskHint: 'This approval lets the bridge contract transfer the selected token amount.',
            },
          },
          {
            id: 'confirm_bridge',
            label: 'Confirm bridge transaction',
            kind: 'wallet_confirmation',
            status: 'pending',
            preview: {
              title: 'Confirm bridge transfer',
              network: 'Ethereum',
              action: 'Bridge to Aeternity',
              asset: asset.symbol,
              amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
              spenderOrContract: BridgeConstants.ethereum.bridge_address,
              riskHint: 'A bridge transaction finalizes the transfer to the destination network.',
            },
          },
        ],
      });
      setActiveFlowId(startedFlowId);

      // Check if user has enough balance first
      const hasUserBalance = checkUserHasEnoughBalance(
        asset,
        normalizedAmount,
        direction,
        aeBalances,
        ethBalances,
      );
      if (!hasUserBalance) {
        setButtonBusy(false);
        showSnackMessage(t('bridge.insufficientBalanceBridge', { symbol: asset.symbol }));
        return;
      }

      let actionType = BRIDGE_TOKEN_ACTION_TYPE;
      let ethAmount = BigInt(0);
      let allowanceTxHash = '';

      if (asset.ethAddress === BridgeConstants.ethereum.default_eth) {
        actionType = BRIDGE_ETH_ACTION_TYPE;
        ethAmount = BigInt(normalizedAmount.toString());
      } else if (asset.ethAddress === BridgeConstants.ethereum.wae) {
        actionType = BRIDGE_AETERNITY_ACTION_TYPE;
      } else {
        try {
          setConfirming(true);
          setConfirmPhase('allowance');
          if (startedFlowId) {
            setCurrentStepStatus(startedFlowId, 'awaiting_user');
          }
          setConfirmingMsg(t('bridge.checkingTokenAllowance'));
          Logger.log('Checking allowance for asset:', asset.ethAddress);
          Logger.log('Signer address:', signerAddress);
          Logger.log('Bridge address:', BridgeConstants.ethereum.bridge_address);

          // Add retry mechanism with shorter timeout
          let allowance;
          let retryCount = 0;
          const maxRetries = 3;
          const timeoutMs = 5000; // Reduced to 5 seconds for faster fallback

          while (retryCount < maxRetries) {
            try {
              Logger.log(`Allowance check attempt ${retryCount + 1}/${maxRetries}`);
              Logger.log(`Contract address: ${asset.ethAddress}`);
              Logger.log(`Method: allowance(${signerAddress}, ${BridgeConstants.ethereum.bridge_address})`);

              // First, test if contract is reachable with a simple call
              if (retryCount === 0) {
                Logger.log('Testing contract connectivity...');
                try {
                  const testPromise = assetContract.balanceOf(signerAddress);
                  const testTimeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Contract test timeout')), 3000);
                  });
                  // eslint-disable-next-line no-await-in-loop
                  await Promise.race([testPromise, testTimeout]);
                  Logger.log('Contract is reachable');
                } catch (testError) {
                  Logger.warn('Contract connectivity test failed:', testError.message);
                }
              }

              const allowancePromise = assetContract
                .allowance(signerAddress, BridgeConstants.ethereum.bridge_address);
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Allowance check timeout after ${timeoutMs / 1000} seconds`)), timeoutMs);
              });

              // eslint-disable-next-line no-await-in-loop
              allowance = await Promise.race([allowancePromise, timeoutPromise]);
              Logger.log('Current allowance:', allowance.toString());
              break; // Success, exit retry loop
            } catch (retryError: any) {
              retryCount += 1;
              Logger.warn(`Allowance check attempt ${retryCount} failed:`, retryError.message);

              if (retryCount >= maxRetries) {
                throw retryError; // Re-throw the last error
              }

              // Wait before retry (exponential backoff)
              const waitTime = Math.min(1000 * 2 ** (retryCount - 1), 5000);
              Logger.log(`Waiting ${waitTime}ms before retry...`);
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) => { setTimeout(resolve, waitTime); });
            }
          }

          const allowanceBigInt = BigInt(allowance.toString());
          const requiredAmount = BigInt(normalizedAmount.toString());

          if (allowanceBigInt < requiredAmount) {
            setConfirmingMsg(t('bridge.confirmTokenApproval'));
            if (startedFlowId) setCurrentStepStatus(startedFlowId, 'awaiting_user');
            Logger.log('Approving allowance:', normalizedAmount.toString());

            const approveResult = await assetContract.approve(
              BridgeConstants.ethereum.bridge_address,
              normalizedAmount.toString(),
            );

            allowanceTxHash = approveResult.hash;
            showTransactionSubmittedMessage(t('bridge.allowanceTransactionSubmitted'), approveResult.hash);

            setConfirmingMsg(t('bridge.waitingForApprovalConfirmation'));
            if (startedFlowId) setCurrentStepStatus(startedFlowId, 'submitted');
            Logger.log('Waiting for approval confirmation...');
            await approveResult.wait(1);
            setConfirmingMsg(t('bridge.approvalConfirmed'));
            if (startedFlowId) {
              setCurrentStepStatus(startedFlowId, 'confirmed');
              advanceFlowStep(startedFlowId);
            }
            Logger.log('Approval confirmed');
          }
        } catch (e: any) {
          Logger.error('Allowance/Approval error:', e);
          let errorMsg = e.message || t('bridge.failedToCheckOrApproveAllowance');

          // Check if it's a timeout or network error - offer fallback
          if (e.message?.includes('timeout') || e.message?.includes('network') || e.code === 'NETWORK_ERROR') {
            Logger.warn('Allowance check failed, proceeding with approval as fallback');
            setConfirmingMsg(t('bridge.allowanceCheckFailed'));

            try {
              // Skip allowance check and go directly to approval
              const approveResult = await assetContract.approve(
                BridgeConstants.ethereum.bridge_address,
                normalizedAmount.toString(),
              );

              allowanceTxHash = approveResult.hash;
              showTransactionSubmittedMessage(t('bridge.approvalTransactionSubmitted'), approveResult.hash);

              setConfirmingMsg(t('bridge.waitingForApprovalConfirmation'));
              if (startedFlowId) setCurrentStepStatus(startedFlowId, 'submitted');
              Logger.log('Waiting for approval confirmation...');
              await approveResult.wait(1);
              setConfirmingMsg(t('bridge.approvalConfirmed'));
              if (startedFlowId) {
                setCurrentStepStatus(startedFlowId, 'confirmed');
                advanceFlowStep(startedFlowId);
              }
              Logger.log('Approval confirmed');
            } catch (approvalError: any) {
              Logger.error('Approval also failed:', approvalError);
              if (approvalError.message?.includes('insufficient funds') || approvalError.message?.includes('gas')) {
                errorMsg = t('bridge.insufficientEthForGas');
              } else if (approvalError.message?.includes('network') || approvalError.code === 'NETWORK_ERROR') {
                errorMsg = t('bridge.failedToConnectTokenContract');
              } else if (approvalError.message?.includes('user rejected') || approvalError.message?.includes('rejected by user')) {
                errorMsg = t('bridge.transactionRejectedByUser');
              } else {
                errorMsg = t('bridge.transactionFailedTokenRestrictions');
              }
              showSnackMessage(errorMsg);
              if (startedFlowId) failFlow(startedFlowId, errorMsg);
              setButtonBusy(false);
              setConfirmPhase(null);
              setConfirming(false);
              setConfirmingMsg('');
              return;
            }
          } else {
            // Other errors - show specific message
            if (e.message?.includes('insufficient funds')) {
              errorMsg = t('bridge.insufficientEthForGas');
            } else if (e.code === 'UNPREDICTABLE_GAS_LIMIT' || e.code === 'CALL_EXCEPTION') {
              errorMsg = t('bridge.failedToConnectTokenContract');
            } else if (e.message?.includes('user rejected') || e.code === 'ACTION_REJECTED') {
              errorMsg = t('bridge.transactionRejectedByUser');
            } else if (e.message?.includes('execution reverted')) {
              errorMsg = t('bridge.transactionFailedTokenRestrictions');
            }

            showSnackMessage(errorMsg);
            if (startedFlowId) failFlow(startedFlowId, errorMsg);
            setButtonBusy(false);
            setConfirming(false);
            setConfirmingMsg('');
            return;
          }
        } finally {
          setConfirming(false);
          setConfirmingMsg('');
        }
      }

      let timeout: NodeJS.Timeout;
      try {
        setConfirmPhase('bridge');
        setConfirming(true);
        setConfirmingMsg(t('bridge.confirmBridgeTransaction'));
        if (startedFlowId) {
          // If no allowance was needed, first step is still pending.
          const flow = getFlowById(startedFlowId);
          const currentStep = flow?.steps?.[flow.currentStepIndex];
          if (currentStep?.id === 'confirm_allowance') {
            setCurrentStepStatus(startedFlowId, 'skipped');
            advanceFlowStep(startedFlowId);
          }
          setCurrentStepStatus(startedFlowId, 'awaiting_user');
        }

        Logger.log('Calling bridge_out with:', {
          assetAddress: asset.ethAddress,
          destination,
          amount: normalizedAmount.toString(),
          actionType,
          value: ethAmount.toString(),
        });

        const bridgeOutResult = await bridge.bridge_out(
          asset.ethAddress,
          destination,
          normalizedAmount.toString(),
          actionType,
          {
            value: ethAmount,
          },
        );

        Logger.log('Bridge transaction submitted:', bridgeOutResult.hash);

        setBridgeActionSummary({
          direction,
          asset,
          destination,
          amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
          allowanceTxHash,
          bridgeTxHash: bridgeOutResult.hash,
        });

        setConfirmingMsg(t('bridge.waitingForBridgeConfirmation'));
        if (startedFlowId) setCurrentStepStatus(startedFlowId, 'submitted');
        timeout = setTimeout(() => {
          setConfirmingMsg(t('bridge.waitingLongerThanExpected'));
        }, 30000);
        Logger.log('Waiting for bridge confirmation...');
        await bridgeOutResult.wait(1);
        clearTimeout(timeout);
        setConfirmingMsg(t('bridge.bridgeTransactionConfirmed'));
        if (startedFlowId) {
          setCurrentStepStatus(startedFlowId, 'confirmed');
          completeFlow(startedFlowId);
        }
        Logger.log('Bridge transaction confirmed');
        // Add bridge activity to recent activities
        addActivity({
          type: 'bridge',
          flowId: startedFlowId || undefined,
          hash: bridgeOutResult.hash,
          account: activeAccount ?? destination,
          tokenIn: asset.symbol,
          tokenOut: direction === Direction.EthereumToAeternity ? `æ${asset.symbol}` : asset.symbol,
          amountIn: normalizedAmount.shiftedBy(-asset.decimals).toString(),
          amountOut: normalizedAmount.shiftedBy(-asset.decimals).toString(),
          status: {
            confirmed: true,
            blockNumber: bridgeOutResult.blockNumber,
          },
        });
      } catch (e: any) {
        clearTimeout(timeout);
        Logger.error('Bridge transaction error:', e);
        let errorMsg = e.message || t('bridge.genericBridgeError');

        if (e.message?.includes('insufficient funds')) {
          errorMsg = t('bridge.insufficientFundsForTransaction');
        } else if (e.message?.includes('user rejected')) {
          errorMsg = t('bridge.transactionRejectedByUser');
        } else if (e.code === 'UNPREDICTABLE_GAS_LIMIT' || e.code === 'CALL_EXCEPTION') {
          errorMsg = t('bridge.transactionWouldFail');
        }

        showSnackMessage(errorMsg);
        if (startedFlowId) failFlow(startedFlowId, errorMsg);
      } finally {
        setConfirmPhase(null);
        setConfirming(false);
        setConfirmingMsg('');
      }
      refetchBalances();
      setButtonBusy(false);
    } catch (e: any) {
      Logger.error(e);
      showSnackMessage(e.message);
      if (startedFlowId) failFlow(startedFlowId, e?.message || 'Bridge failed');
      setButtonBusy(false);
    }
  }, [
    walletProvider,
    selectedEthAccount,
    destination,
    asset,
    isValidDestination,
    normalizedAmount,
    direction,
    aeBalances,
    ethBalances,
    refetchBalances,
    showSnackMessage,
    t,
    showTransactionSubmittedMessage,
    addActivity,
    activeAccount,
    setButtonBusy,
    setConfirming,
    setConfirmingMsg,
    setBridgeActionSummary,
    startFlow,
    setCurrentStepStatus,
    advanceFlowStep,
    completeFlow,
    failFlow,
    getFlowById,
  ]);

  const bridgeToEvm = useCallback(async (): Promise<void> => {
    let startedFlowId: string | null = null;
    if (!isValidDestination || !destination?.startsWith('0x')) {
      showSnackMessage(t('bridge.invalidDestination'));
      return;
    }
    if (!normalizedAmount || normalizedAmount.isLessThanOrEqualTo(0)) {
      showSnackMessage(t('bridge.invalidAmount'));
      return;
    }
    if (!aeternityAddress) {
      showSnackMessage(t('bridge.aeternityWalletNotConnected'));
      return;
    }

    setButtonBusy(true);
    startedFlowId = startFlow({
      flowType: 'ae_eth_bridge',
      context: { direction: 'ae_to_eth' },
      steps: [
        {
          id: 'confirm_allowance',
          label: 'Confirm token allowance',
          kind: 'wallet_confirmation',
          status: 'pending',
          preview: {
            title: 'Confirm token allowance',
            network: 'Aeternity',
            action: 'Approve bridge contract',
            asset: asset.symbol,
            amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
            spenderOrContract: BridgeConstants.aeternity.bridge_address,
            riskHint: 'Allowance may be required before bridging tokens.',
          },
        },
        {
          id: 'confirm_bridge',
          label: 'Confirm bridge transaction',
          kind: 'wallet_confirmation',
          status: 'pending',
          preview: {
            title: 'Confirm bridge transaction',
            network: 'Aeternity',
            action: 'Bridge to Ethereum',
            asset: asset.symbol,
            amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
            spenderOrContract: BridgeConstants.aeternity.bridge_address,
          },
        },
      ],
    });
    setActiveFlowId(startedFlowId);

    // Check if user has enough balance
    const hasUserBalance = checkUserHasEnoughBalance(
      asset,
      normalizedAmount,
      direction,
      aeBalances,
      ethBalances,
    );
    if (!hasUserBalance) {
      setButtonBusy(false);
      showSnackMessage(t('bridge.insufficientBalanceBridge', { symbol: asset.symbol }));
      return;
    }

    // Also check if bridge contract has enough balance (for liquidity)
    const hasBridgeBalance = await checkEvmNetworkHasEnoughBalance(
      asset,
      normalizedAmount,
      walletProvider,
    );
    if (!hasBridgeBalance) {
      setButtonBusy(false);
      showSnackMessage(t('bridge.bridgeContractInsufficientBalance'));
      return;
    }

    const hasEligibleBridgeUse = await checkAeAccountHasEligibleBridgeUse(aeternityAddress);
    if (!hasEligibleBridgeUse) {
      setButtonBusy(false);
      showSnackMessage(
        t('bridge.bridgeUsageLimit', { hours: BRIDGE_USAGE_INTERVAL_IN_HOURS }),
      );
      return;
    }

    try {
      let actionType = BRIDGE_TOKEN_ACTION_TYPE;
      let aeAmount = BigInt(0);
      let allowanceTxHash = '';

      if (asset.aeAddress === BridgeConstants.aeternity.default_ae) {
        actionType = BRIDGE_AETERNITY_ACTION_TYPE;
        aeAmount = BigInt(normalizedAmount.toString());
      } else {
        actionType = asset.aeAddress === BridgeConstants.aeternity.aeeth
          ? BRIDGE_ETH_ACTION_TYPE
          : BRIDGE_TOKEN_ACTION_TYPE;

        // Initialize contract using asset.aeAddress (we're bridging FROM Aeternity)
        const assetContract = await Aeternity.initializeContract(sdk, {
          aci: BridgeConstants.aeternity.asset_aci,
          address: asset.aeAddress as `ct_${string}`,
          omitUnknown: true,
        });

        // Check and handle allowance
        setConfirming(true);
        setConfirmPhase('allowance');
        if (startedFlowId) setCurrentStepStatus(startedFlowId, 'awaiting_user');
        setConfirmingMsg(t('bridge.checkingTokenAllowance'));
        let allowance;
        try {
          const result = await assetContract.allowance({
            from_account: aeternityAddress,
            for_account: BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
          });
          allowance = result.decodedResult;
        } catch {
          // If allowance check fails, treat as undefined (no allowance set)
          Logger.log('Allowance check failed, will create new allowance');
          allowance = undefined;
        }

        if (allowance === undefined) {
          setConfirmingMsg(t('bridge.confirmTokenAllowance'));
          if (startedFlowId) setCurrentStepStatus(startedFlowId, 'submitted');
          const allowanceCall = await assetContract.create_allowance(
            BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
            normalizedAmount.toString(),
          );
          allowanceTxHash = allowanceCall.hash;
          showTransactionSubmittedMessage(t('bridge.allowanceTransactionSubmitted'), allowanceCall.hash);
        } else if (normalizedAmount.isGreaterThan(allowance)) {
          setConfirmingMsg(t('bridge.confirmTokenAllowanceUpdate'));
          if (startedFlowId) setCurrentStepStatus(startedFlowId, 'submitted');
          const allowanceCall = await assetContract.change_allowance(
            BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
            normalizedAmount.toString(),
          );
          allowanceTxHash = allowanceCall.hash;
          showTransactionSubmittedMessage(t('bridge.allowanceTransactionSubmitted'), allowanceCall.hash);
        }
        if (startedFlowId) {
          setCurrentStepStatus(startedFlowId, 'confirmed');
          advanceFlowStep(startedFlowId);
        }
        setConfirmPhase(null);
        setConfirming(false);
        setConfirmingMsg('');
      }

      const bridgeContract = await Aeternity.initializeContract(sdk, {
        aci: BridgeConstants.aeternity.bridge_aci,
        address: BridgeConstants.aeternity.bridge_address,
        omitUnknown: true,
      });

      setConfirmPhase('bridge');
      setConfirmingMsg(t('bridge.confirmBridgeTransaction'));
      setConfirming(true);
      if (startedFlowId) {
        const flow = getFlowById(startedFlowId);
        const currentStep = flow?.steps?.[flow.currentStepIndex];
        if (currentStep?.id === 'confirm_allowance') {
          setCurrentStepStatus(startedFlowId, 'skipped');
          advanceFlowStep(startedFlowId);
        }
        setCurrentStepStatus(startedFlowId, 'awaiting_user');
      }
      const bridgeOutCall = await bridgeContract.bridge_out(
        [asset.ethAddress, destination, normalizedAmount.toString(), actionType],
        { amount: aeAmount },
      );
      setConfirmingMsg(t('bridge.bridgeTransactionConfirmed'));
      if (startedFlowId) {
        setCurrentStepStatus(startedFlowId, 'confirmed');
        completeFlow(startedFlowId);
      }
      setBridgeActionSummary({
        direction,
        asset,
        destination,
        amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
        allowanceTxHash,
        bridgeTxHash: bridgeOutCall.hash,
      });

      // Add bridge activity to recent activities
      addActivity({
        type: 'bridge',
        flowId: startedFlowId || undefined,
        hash: bridgeOutCall.hash,
        account: aeternityAddress ?? destination,
        tokenIn: `æ${asset.symbol}`,
        tokenOut: asset.symbol,
        amountIn: normalizedAmount.shiftedBy(-asset.decimals).toString(),
        amountOut: normalizedAmount.shiftedBy(-asset.decimals).toString(),
        status: {
          confirmed: true,
          blockNumber: bridgeOutCall?.txData?.blockHeight,
        },
      });
    } catch (e: any) {
      Logger.error(e);
      showSnackMessage(e.message);
      if (startedFlowId) failFlow(startedFlowId, e?.message || 'Bridge failed');
    } finally {
      setConfirmPhase(null);
      setConfirming(false);
      setConfirmingMsg('');
    }

    setButtonBusy(false);
  }, [
    isValidDestination,
    destination,
    normalizedAmount,
    aeternityAddress,
    asset,
    direction,
    aeBalances,
    ethBalances,
    walletProvider,
    showSnackMessage,
    t,
    sdk,
    addActivity,
    showTransactionSubmittedMessage,
    setButtonBusy,
    setConfirming,
    setConfirmingMsg,
    setBridgeActionSummary,
    startFlow,
    setCurrentStepStatus,
    advanceFlowStep,
    completeFlow,
    failFlow,
    getFlowById,
  ]);

  const isBridgeActionFromAeternity = (
    bridgeActionSummary?.direction === Direction.AeternityToEthereum
  );

  const destinationTokenAddress = useMemo(() => (
    direction === Direction.EthereumToAeternity ? asset.aeAddress : asset.ethAddress
  ), [direction, asset]);
  const destinationTokenLabel = useMemo(() => {
    if (!asset) return '';
    if (direction === Direction.EthereumToAeternity) {
      // Destination is æternity → prefix with æ (except WAE which becomes AE)
      return asset.symbol === 'WAE' ? 'AE' : `æ${asset.symbol}`;
    }
    // Destination is Ethereum → use plain symbol
    return asset.symbol;
  }, [asset, direction]);

  const handleCopyTokenAddress = useCallback(async () => {
    try {
      if (destinationTokenAddress) {
        await navigator.clipboard?.writeText(destinationTokenAddress);
        showSnackMessage(t('bridge.tokenAddressCopied'));
      }
    } catch {
      showSnackMessage(t('bridge.failedToCopy'));
    }
  }, [destinationTokenAddress, showSnackMessage, t]);

  const handleMaxClick = useCallback(async () => {
    if (!asset) return;

    // For native ETH, reserve some ETH for gas fees so the tx doesn’t fail.
    const isNativeEth = asset.ethAddress === BridgeConstants.ethereum.default_eth;
    if (
      direction === Direction.EthereumToAeternity
      && isNativeEth
      && walletProvider
      && effectiveEthAccount
    ) {
      setMaxBusy(true);
      try {
        const provider = new BrowserProvider(walletProvider, {
          name: 'Ethereum Bridge',
          chainId: parseInt(BridgeConstants.ethereum.ethChainId, 16),
        });
        const signer = await provider.getSigner();

        const bridge = new Ethereum.Contract(
          BridgeConstants.ethereum.bridge_address,
          BridgeConstants.ethereum.bridge_abi,
          signer,
        );

        const feeData = await provider.getFeeData();
        const feePerGas = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;

        // Use a valid destination for gas estimation; prefer user input, otherwise a safe constant.
        const destinationForEstimate = (destination?.startsWith('ak_') && isValidDestination ? destination : (activeAccount || AETERNITY_FUNDS_ADDRESS));

        // Estimate with a tiny amount/value; gas usage is effectively independent of the amount.
        const gasEstimate = await bridge.bridge_out.estimateGas(
          asset.ethAddress,
          destinationForEstimate,
          '1', // 1 wei as amount
          BRIDGE_ETH_ACTION_TYPE,
          { value: 1n },
        );

        // Add a safety buffer (20%) to handle fee spikes.
        const gasCost = (gasEstimate * feePerGas * 12n) / 10n;

        const balanceWei = await provider.getBalance(effectiveEthAccount);
        const maxWei = balanceWei > gasCost ? (balanceWei - gasCost) : 0n;

        const maxEth = new BigNumber(maxWei.toString())
          .shiftedBy(-18)
          .toFixed(6, BigNumber.ROUND_DOWN);

        setAmount(maxEth);
        return;
      } catch (e) {
        Logger.warn('Failed to estimate max ETH amount, falling back to balance:', e);
        // fall through to default behaviour
      } finally {
        setMaxBusy(false);
      }
    }

    // Default: just use the fetched balance (now kept at 6 decimals and rounded down).
    setAmount(tokenBalance);
  }, [
    asset,
    direction,
    walletProvider,
    effectiveEthAccount,
    destination,
    isValidDestination,
    activeAccount,
    tokenBalance,
    setAmount,
  ]);

  const activeFlow = activeFlowId ? getFlowById(activeFlowId) : null;
  const activeFlowStep = activeFlow?.steps?.[activeFlow.currentStepIndex];

  return (
    <AppKitProvider>
      <>
        <div className="flex justify-center">
          <div className="w-full mx-auto bg-transparent border-0 p-0 relative overflow-hidden box-border sm:bg-white/[0.02] sm:border sm:border-white/10 sm:backdrop-blur-[20px] sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 sm:mb-3 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold m-0 sh-dex-title min-w-0 flex-shrink">
                {t('bridge.title')}
              </h2>

              <div className="text-xs text-white/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-[10px] transition-all duration-300 ease-out font-medium flex-shrink-0">
                {direction === Direction.AeternityToEthereum ? t('bridge.direction.aeToEth') : t('bridge.direction.ethToAe')}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 sm:mb-5">
              <p className="m-0 text-sm text-white/60 leading-relaxed">
                {t('bridge.description')}
              </p>
            </div>

            {/* Mainnet Warning */}
            {!isMainnet && (
            <div className="mb-4 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
              {t('bridge.mainnetWarning')}
            </div>
            )}

            {/* Network & Token Selection */}
            <div className="mb-4">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-xs text-white/60 font-medium uppercase tracking-wider block mb-2">
                {t('bridge.fromNetwork')}
              </label>
              <Select value={direction} onValueChange={handleDirectionChange}>
                <SelectTrigger className="bg-white/[0.05] border-white/10 rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Direction.AeternityToEthereum}>
                    {t('bridge.networks.aeternity')}
                    {' '}
                    {!isMainnet && t('bridge.networks.aeternityTestnet')}
                  </SelectItem>
                  <SelectItem value={Direction.EthereumToAeternity}>
                    {t('bridge.networks.ethereum')}
                    {' '}
                    {!isMainnet && t('bridge.networks.ethereumSepoliaTestnet')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ethereum Account Selector - Only show when bridging from Ethereum */}
            {direction === Direction.EthereumToAeternity && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className="text-xs text-white/60 font-medium uppercase tracking-wider">
                  {t('bridge.ethereumAccount')}
                </label>
                {ethereumAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchEthereumAccounts}
                    className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa] transition-colors"
                  >
                    {t('bridge.refresh')}
                  </button>
                  <ConnectEthereumWallet
                    onConnected={handleEthereumWalletConnected}
                    onDisconnected={handleEthereumWalletDisconnected}
                    onError={handleEthereumWalletError}
                  />
                </div>
                )}
              </div>
              {ethereumAccounts.length > 0 ? (
                ethereumAccounts.length >= 2 ? (
                  <Select value={selectedEthAccount} onValueChange={handleEthAccountChange}>
                    <SelectTrigger className="bg-white/[0.05] border-white/10 rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ethereumAccounts.map((account) => (
                        <SelectItem key={account} value={account}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="font-mono text-sm">
                              {account.slice(0, 6)}
                              ...
                              {account.slice(-4)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-white/[0.05] border border-white/10 rounded-xl h-10 flex items-center px-4 text-white/60 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="font-mono">
                        {ethereumAccounts[0].slice(0, 6)}
                        ...
                        {ethereumAccounts[0].slice(-4)}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white/[0.05] border border-white/10 rounded-xl h-10 flex items-center px-4 text-white/40 text-sm">
                  No Ethereum account connected
                </div>
              )}
            </div>
            )}

            {/* From/To Amount (visuals only) */}
            <FromTo
              fromLabel={t('bridge.from')}
              toLabel={t('bridge.to')}
              inputType="number"
              inputStep="0.000001"
              fromAmount={amount}
              onChangeFromAmount={setAmount}
              fromBalanceText={
                loadingBalance
                  ? t('bridge.loadingBalance')
                  : (direction === Direction.EthereumToAeternity
                    ? !!effectiveEthAccount
                    : !!aeternityAddress
                  )
                    ? t('bridge.balance', { balance: Decimal.from(tokenBalance).prettify() })
                    : null
              }
              onMaxClick={tokenBalance ? () => { handleMaxClick(); } : undefined}
              maxDisabled={maxBusy || loadingBalance}
              fromTokenNode={(
                <BridgeTokenSelector
                  selected={asset}
                  onSelect={handleAssetChange}
                  assets={assets}
                  direction={direction}
                  aeBalances={aeBalances}
                  ethBalances={ethBalances}
                />
              )}
              toValue={amount || '0.0'}
              toLoading={false}
              toTokenNode={(
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl border border-white/10">
                    <span className="text-white text-sm sm:text-base font-semibold">
                      {destinationTokenLabel}
                    </span>
                  </div>
                  {destinationTokenAddress && (
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <span
                        className="font-mono text-[10px] text-white/60 truncate"
                        title={destinationTokenAddress}
                      >
                        {destinationTokenAddress}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTokenAddress}
                        className="text-[10px] text-[#4ecdc4] hover:text-[#3ab3aa]"
                      >
                        {t('actions.copy', { ns: 'common' })}
                      </button>
                    </div>
                  )}
                </div>
              )}
            />

            {hasInsufficientBalance && (
            <div className="text-red-400 text-sm py-3 px-3 sm:px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-4 sm:mb-5">
              Insufficient balance. Available:
              {' '}
              {Decimal.from(tokenBalance || '0').prettify(6)}
              {' '}
              {asset?.symbol}
            </div>
            )}

            {/* Destination Address */}
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
              <div className="flex justify-between items-center mb-2">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label className="text-xs text-white/60 font-medium uppercase tracking-wider block mb-2">
                  {t('bridge.destinationAddressLabel', { network: direction === Direction.EthereumToAeternity ? t('bridge.networks.aeternity') : t('bridge.networks.ethereum') })}
                </label>
                {(activeAccount && direction === Direction.EthereumToAeternity) && (
                <button
                  type="button"
                  onClick={() => {
                    if (direction === Direction.EthereumToAeternity) {
                      // Bridging from Ethereum to Aeternity, use Aeternity account
                      setDestination(activeAccount);
                    } else if (selectedEthAccount) {
                      // Bridging from Aeternity to Ethereum, use Ethereum account
                      setDestination(selectedEthAccount);
                    }
                  }}
                  className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa] bg-[#4ecdc4]/10 hover:bg-[#4ecdc4]/20 border border-[#4ecdc4]/30 hover:border-[#4ecdc4]/50 rounded-lg px-2 py-1 transition-all duration-200 font-medium"
                >
                  {t('bridge.useConnectedAccount')}
                </button>
                )}
              </div>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={direction === Direction.EthereumToAeternity ? t('bridge.placeholderAddressAe') : t('bridge.placeholderAddressEth')}
                className={`w-full bg-transparent border-none text-white text-sm font-mono outline-none shadow-none ${!isValidDestination && destination ? 'text-red-400' : ''
                }`}
              />
              {!isValidDestination && destination && (
                <div className="text-red-400 text-xs mt-1">{t('bridge.invalidAddressFormat')}</div>
              )}
            </div>

            {/* Bridge Process Status */}
            {activeFlowStep?.preview && (
            <ConfirmationPreviewCard
              preview={activeFlowStep.preview}
              currentStep={activeFlow ? activeFlow.currentStepIndex + 1 : undefined}
              totalSteps={activeFlow?.steps.length}
              nextStepLabel={activeFlow?.steps[activeFlow.currentStepIndex + 1]?.label}
              waitingForWallet={activeFlowStep.status === 'awaiting_user' || activeFlowStep.status === 'submitted'}
            />
            )}
            {(confirming || buttonBusy) && (
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/60">
                  {t('bridge.transactionStatus')}
                </span>
                <span className="text-sm font-semibold text-yellow-400">
                  {confirming
                    ? (confirmPhase === 'allowance'
                      ? t('bridge.approvingToken')
                      : t('bridge.executingBridge'))
                    : t('bridge.processing')}
                </span>
              </div>

              <div className="w-full h-1 bg-white/10 rounded overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded animate-pulse" />
              </div>

              <div className="text-xs text-white/60 text-center">
                {confirming ? confirmingMsg : t('bridge.preparingTransaction')}
              </div>
            </div>
            )}

            {/* Warnings */}
            {(!isBridgeContractEnabled || !hasOperatorEnoughBalance) && (
            <div className="text-yellow-400 text-sm py-3 px-3 sm:px-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl mb-4 sm:mb-5">
              {!isBridgeContractEnabled && t('bridge.smartContractDisabled')}
              {!hasOperatorEnoughBalance && t('bridge.bridgeOperatorInsufficientFunds')}
            </div>
            )}

            <div className="grid gap-2">
              {/* Bridge Button */}
              {(direction === Direction.EthereumToAeternity && ethereumAccounts.length === 0) && (
                <ConnectEthereumWallet
                  onConnected={handleEthereumWalletConnected}
                  onDisconnected={handleEthereumWalletDisconnected}
                  onError={handleEthereumWalletError}
                />
              )}

              {(direction === Direction.AeternityToEthereum && !activeAccount) && (
                <ConnectWalletButton />
              )}
              {
                (
                  (direction === Direction.AeternityToEthereum && activeAccount)
                    || (direction === Direction.EthereumToAeternity && ethereumAccounts.length > 0)
                ) && (
                <button
                  type="button"
                  onClick={() => {
                    if (direction === Direction.AeternityToEthereum) {
                      bridgeToEvm();
                    } else {
                      bridgeToAeternity();
                    }
                  }}
                  disabled={(buttonBusy
                    || !isBridgeContractEnabled
                    || !hasOperatorEnoughBalance
                    || !isValidDestination
                    || !amount
                    || parseFloat(amount) <= 0
                    || hasInsufficientBalance
                    || (
                      direction === Direction.EthereumToAeternity
                      && ethereumAccounts.length === 0
                    ))}
                  className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${buttonBusy || !isBridgeContractEnabled || !hasOperatorEnoughBalance || !isValidDestination || !amount || parseFloat(amount) <= 0 || hasInsufficientBalance || (direction === Direction.EthereumToAeternity && ethereumAccounts.length === 0)
                    ? 'bg-white/10 cursor-not-allowed opacity-60'
                    : 'bg-black hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {buttonBusy ? (
                    <div className="flex items-center justify-center gap-2">
                      <Spinner className="w-4 h-4" />
                      {confirming
                        ? (confirmPhase === 'allowance'
                          ? t('bridge.approving')
                          : t('bridge.bridging'))
                        : t('bridge.processing')}
                    </div>
                  ) : t('bridge.bridgeTo', { network: direction === Direction.AeternityToEthereum ? t('bridge.networks.ethereum') : t('bridge.networks.aeternity') })}
                </button>
                )
            }
            </div>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={!!bridgeActionSummary} onOpenChange={() => setBridgeActionSummary(null)}>
          <DialogContent className="max-w-md bg-[#1a1a2e] border border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">✨</span>
                {t('bridge.bridgeTransactionSubmitted')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold mb-2">
                  <span className="text-2xl">✓</span>
                  <span>{t('bridge.successfullySubmitted')}</span>
                </div>
                <div className="text-xs text-white/60 text-center">
                  {t('bridge.bridgeTransactionSubmittedDescription')}
                </div>
              </div>

              <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">{t('bridge.directionLabel')}</span>
                  <span className="text-white font-semibold">
                    {isBridgeActionFromAeternity ? t('bridge.bridgeDirection.aeternityToEthereum') : t('bridge.bridgeDirection.ethereumToAeternity')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">{t('bridge.amount')}</span>
                  <span className="text-white font-semibold">
                    {bridgeActionSummary?.amount}
                    {' '}
                    {bridgeActionSummary?.asset.symbol}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">{t('bridge.destinationStatusLabel')}</span>
                  <span className="text-white text-xs font-mono truncate max-w-[200px]">
                    {bridgeActionSummary?.destination}
                  </span>
                </div>
              </div>

              {bridgeActionSummary?.allowanceTxHash && (
                <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('bridge.allowanceTransaction')}</span>
                    <a
                      className="text-[#4ecdc4] hover:text-[#3ab3aa] text-sm font-semibold transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={getTxUrl(
                        bridgeActionSummary?.direction,
                        bridgeActionSummary?.allowanceTxHash,
                      )}
                    >
                      {t('bridge.viewOn', { explorer: isBridgeActionFromAeternity ? t('bridge.aescan') : t('bridge.etherscan') })}
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">{t('bridge.bridgeTransaction')}</span>
                  <a
                    className="text-[#4ecdc4] hover:text-[#3ab3aa] text-sm font-semibold transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={getTxUrl(
                      bridgeActionSummary?.direction,
                      bridgeActionSummary?.bridgeTxHash,
                    )}
                  >
                    {t('bridge.viewOn', { explorer: isBridgeActionFromAeternity ? t('bridge.aescan') : t('bridge.etherscan') })}
                  </a>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-white/80 text-center">
                <div className="font-semibold mb-1">{t('bridge.processingTime')}</div>
                {t('bridge.processingTimeDescription')}
              </div>

              {!isBridgeActionFromAeternity && (
                <div className="text-xs text-white/60 bg-white/[0.05] border border-white/10 rounded-xl p-3">
                  {t('bridge.tokensAutoAppear')}
                  {' '}
                  <a href="https://forum.aeternity.com/" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">
                    {t('bridge.forum')}
                  </a>
                  .
                </div>
              )}

              {isBridgeActionFromAeternity && bridgeActionSummary?.asset.symbol !== 'ETH' && (
                <div className="text-xs text-white/60 bg-white/[0.05] border border-white/10 rounded-xl p-3">
                  {t('bridge.addTokenToWalletIntro')}
                  {' '}
                  <button
                    type="button"
                    className="text-[#4ecdc4] hover:underline font-semibold"
                    onClick={() => addTokenToEthereumWallet(bridgeActionSummary.asset)}
                  >
                    {t('bridge.addTokenToWalletLink', { symbol: bridgeActionSummary?.asset.symbol ?? '' })}
                  </button>
                  .
                </div>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setBridgeActionSummary(null)}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white font-bold uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5"
              >
                {t('bridge.close')}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </AppKitProvider>
  );
};

export default AeEthBridge;
