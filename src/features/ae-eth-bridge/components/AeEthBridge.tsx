import { useAppKitProvider } from '@reown/appkit/react';
import BigNumber from 'bignumber.js';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

import ConnectWalletButton from '@/components/ConnectWalletButton';
import BridgeTokenSelector from './BridgeTokenSelector';
import ConnectEthereumWallet from './ConnectEthereumWallet';
import { BRIDGE_USAGE_INTERVAL_IN_HOURS, BridgeConstants } from '../constants';
import { useBridge } from '../hooks/useBridge';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { AppKitProvider } from '../providers/AppKitProvider';
import * as Aeternity from '../services/aeternity';
import * as Ethereum from '../services/ethereum';
import { Asset, BRIDGE_AETERNITY_ACTION_TYPE, BRIDGE_ETH_ACTION_TYPE, BRIDGE_TOKEN_ACTION_TYPE, BridgeAction, Direction } from '../types';
import { addTokenToEthereumWallet } from '../utils/addTokenToEthereumWallet';
import { getTxUrl } from '../utils/getTxUrl';
import { Logger } from '../utils/logger';
import { FromTo } from '@/features/shared/components';
import { Decimal } from '@/libs/decimal';

const checkEvmNetworkHasEnoughBalance = async (asset: any, normalizedAmount: BigNumber, walletProvider: Eip1193Provider) => {
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
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Balance check timeout')), 10000)
        );

        const balance = await Promise.race([balancePromise, timeoutPromise]);
        const tokenBalanceOfBridge = new BigNumber(balance.toString());

        return tokenBalanceOfBridge.isGreaterThanOrEqualTo(normalizedAmount);
    } catch (error) {
        Logger.warn('Failed to check bridge balance, assuming sufficient:', error);
        return true; // Assume sufficient balance if check fails
    }
};

// Check if user has enough balance using useTokenBalances data
const checkUserHasEnoughBalance = (asset: Asset, normalizedAmount: BigNumber, direction: Direction, aeBalances: Record<string, string>, ethBalances: Record<string, string>) => {
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
    console.log('Balance check:', {
        userBalance,
        userBalanceRaw: userBalanceBN.toString(),
        normalizedAmount: normalizedAmount.toString(),
        hasEnough: userBalanceBN.isGreaterThanOrEqualTo(normalizedAmount)
    });

    return userBalanceBN.isGreaterThanOrEqualTo(normalizedAmount);
};

const checkAeAccountHasEligibleBridgeUse = async (account: string) => {
    const bridge = BridgeConstants.aeternity.bridge_address;
    const aeAPI = BridgeConstants.aeAPI;

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

const getTokenDisplayName = (asset: any, direction: Direction) => {
    let symbol = asset.symbol;
    if (direction === Direction.AeternityToEthereum) {
        symbol = `æ${symbol}`;
        if (symbol === 'æWAE') {
            symbol = 'AE';
        }
    }
    return symbol;
};

export function AeEthBridge() {
    const { push: showToast } = useToast();
    const { asset, assets, direction, updateAsset, updateDirection, isMainnet } = useBridge();
    const { sdk, activeAccount } = useAeSdk();
    const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155');
    const { addActivity } = useRecentActivities();

    const [buttonBusy, setButtonBusy] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [confirmingMsg, setConfirmingMsg] = useState('');
    const [bridgeActionSummary, setBridgeActionSummary] = useState<BridgeAction | null>(null);
    const [destination, setDestination] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [ethereumAccounts, setEthereumAccounts] = useState<string[]>([]);
    const [selectedEthAccount, setSelectedEthAccount] = useState<string>('');

    // TODO: Implement these checks properly
    const isBridgeContractEnabled = true;
    const hasOperatorEnoughBalance = true;
    const aeternityAddress = activeAccount;

    // Use the new useTokenBalances hook
    const { aeBalances, ethBalances, loading: loadingBalance, refetch: refetchBalances } = useTokenBalances({
        assets,
        direction,
        aeAccount: aeternityAddress,
        ethAccount: selectedEthAccount,
        sdk
    });

    // Get the current token balance based on direction
    const tokenBalance = useMemo(() => {
        if (!asset) return '';

        if (direction === Direction.EthereumToAeternity) {
            return ethBalances[asset.symbol] || '0';
        } else {
            return aeBalances[asset.symbol] || '0';
        }
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
                    refetchBalances()
                }, 500)
            }
        } catch (error) {
            Logger.error('Error fetching Ethereum accounts:', error);
            setEthereumAccounts([]);
        }
    }, [walletProvider, selectedEthAccount]);


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

    const isValidDestination = useMemo(() => {
        if (!destination) {
            return false;
        }
        if (direction === Direction.AeternityToEthereum) {
            return Ethereum.isAddressValid(destination);
        }
        return Aeternity.isAddressValid(destination);
    }, [destination, direction]);

    const showTransactionSubmittedMessage = (message: string, hash: string) => {
        const url = getTxUrl(direction, hash);
        showToast(
            <div>
                <div>{message}</div>
                <Button
                    variant="link"
                    className="p-0 h-auto text-blue-400"
                    onClick={() => window.open(url, '_blank')?.focus()}
                >
                    View Transaction
                </Button>
            </div>
        );
    };

    const showSnackMessage = (message: string) => {
        showToast(message.substring(0, 100));
    };


    // Fetch Ethereum accounts when direction changes to Ethereum or wallet provider changes
    useEffect(() => {
        if (direction === Direction.EthereumToAeternity && walletProvider) {
            fetchEthereumAccounts();
        }
    }, [direction, walletProvider, fetchEthereumAccounts]);


    const bridgeToAeternity = useCallback(async () => {
        try {
            if (!walletProvider) {
                return showSnackMessage('Please connect your Ethereum wallet first');
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
                return showSnackMessage(
                    `Please switch to ${BridgeConstants.isMainnet ? 'Ethereum Mainnet' : 'Sepolia Testnet'}`
                );
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
                return showSnackMessage('Invalid destination!');
            }
            if (!normalizedAmount || normalizedAmount.isLessThanOrEqualTo(0)) {
                return showSnackMessage('Invalid amount!');
            }

            Logger.log('Bridge params:', {
                assetAddress: asset.ethAddress,
                destination,
                amount: normalizedAmount.toString(),
                signerAddress,
            });

            setButtonBusy(true);

            // Check if user has enough balance first
            const hasUserBalance = checkUserHasEnoughBalance(asset, normalizedAmount, direction, aeBalances, ethBalances);
            if (!hasUserBalance) {
                setButtonBusy(false);
                return showSnackMessage(`Insufficient ${asset.symbol} balance to complete this transaction.`);
            }

            let action_type = BRIDGE_TOKEN_ACTION_TYPE;
            let eth_amount = BigInt(0);
            let allowanceTxHash = '';

            if (asset.ethAddress === BridgeConstants.ethereum.default_eth) {
                action_type = BRIDGE_ETH_ACTION_TYPE;
                eth_amount = BigInt(normalizedAmount.toString());
            } else if (asset.ethAddress === BridgeConstants.ethereum.wae) {
                action_type = BRIDGE_AETERNITY_ACTION_TYPE;
            } else {
                try {
                    setConfirming(true);
                    setConfirmingMsg('Checking token allowance...');
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
                                    const testTimeout = new Promise((_, reject) =>
                                        setTimeout(() => reject(new Error('Contract test timeout')), 3000)
                                    );
                                    await Promise.race([testPromise, testTimeout]);
                                    Logger.log('Contract is reachable');
                                } catch (testError) {
                                    Logger.warn('Contract connectivity test failed:', testError.message);
                                }
                            }

                            const allowancePromise = assetContract.allowance(signerAddress, BridgeConstants.ethereum.bridge_address);
                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error(`Allowance check timeout after ${timeoutMs / 1000} seconds`)), timeoutMs)
                            );

                            allowance = await Promise.race([allowancePromise, timeoutPromise]);
                            Logger.log('Current allowance:', allowance.toString());
                            break; // Success, exit retry loop

                        } catch (retryError: any) {
                            retryCount++;
                            Logger.warn(`Allowance check attempt ${retryCount} failed:`, retryError.message);

                            if (retryCount >= maxRetries) {
                                throw retryError; // Re-throw the last error
                            }

                            // Wait before retry (exponential backoff)
                            const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                            Logger.log(`Waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    }

                    const allowanceBigInt = BigInt(allowance.toString());
                    const requiredAmount = BigInt(normalizedAmount.toString());

                    if (allowanceBigInt < requiredAmount) {
                        setConfirmingMsg('Please confirm the token approval in your wallet...');
                        Logger.log('Approving allowance:', normalizedAmount.toString());

                        const approveResult = await assetContract.approve(
                            BridgeConstants.ethereum.bridge_address,
                            normalizedAmount.toString(),
                        );

                        allowanceTxHash = approveResult.hash;
                        showTransactionSubmittedMessage('Allowance transaction submitted.', approveResult.hash);

                        setConfirmingMsg('Waiting for approval confirmation...');
                        Logger.log('Waiting for approval confirmation...');
                        await approveResult.wait(1);
                        setConfirmingMsg('Approval confirmed!');
                        Logger.log('Approval confirmed');
                    }
                } catch (e: any) {
                    Logger.error('Allowance/Approval error:', e);
                    let errorMsg = e.message || 'Failed to check or approve token allowance';

                    // Check if it's a timeout or network error - offer fallback
                    if (e.message?.includes('timeout') || e.message?.includes('network') || e.code === 'NETWORK_ERROR') {
                        Logger.warn('Allowance check failed, proceeding with approval as fallback');
                        setConfirmingMsg('Allowance check failed, proceeding with approval...');

                        try {
                            // Skip allowance check and go directly to approval
                            const approveResult = await assetContract.approve(
                                BridgeConstants.ethereum.bridge_address,
                                normalizedAmount.toString(),
                            );

                            allowanceTxHash = approveResult.hash;
                            showTransactionSubmittedMessage('Approval transaction submitted.', approveResult.hash);

                            setConfirmingMsg('Waiting for approval confirmation...');
                            Logger.log('Waiting for approval confirmation...');
                            await approveResult.wait(1);
                            setConfirmingMsg('Approval confirmed!');
                            Logger.log('Approval confirmed');

                        } catch (approvalError: any) {
                            Logger.error('Approval also failed:', approvalError);
                            errorMsg = 'Failed to approve token. Please check your network connection and try again.';
                            showSnackMessage(errorMsg);
                            setButtonBusy(false);
                            setConfirming(false);
                            setConfirmingMsg('');
                            return;
                        }
                    } else {
                        // Other errors - show specific message
                        if (e.message?.includes('insufficient funds')) {
                            errorMsg = 'Insufficient ETH for gas fees';
                        } else if (e.code === 'UNPREDICTABLE_GAS_LIMIT' || e.code === 'CALL_EXCEPTION') {
                            errorMsg = 'Failed to connect to token contract. Please check the network and try again.';
                        } else if (e.message?.includes('user rejected') || e.code === 'ACTION_REJECTED') {
                            errorMsg = 'Transaction was rejected by user';
                        } else if (e.message?.includes('execution reverted')) {
                            errorMsg = 'Transaction failed. The token contract may have restrictions.';
                        }

                        showSnackMessage(errorMsg);
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

            try {
                setConfirming(true);
                setConfirmingMsg('Please confirm the bridge transaction in your wallet...');

                Logger.log('Calling bridge_out with:', {
                    assetAddress: asset.ethAddress,
                    destination,
                    amount: normalizedAmount.toString(),
                    actionType: action_type,
                    value: eth_amount.toString(),
                });

                const bridgeOutResult = await bridge.bridge_out(
                    asset.ethAddress,
                    destination,
                    normalizedAmount.toString(),
                    action_type,
                    {
                        value: eth_amount,
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

                setConfirmingMsg('Waiting for bridge confirmation...');
                Logger.log('Waiting for bridge confirmation...');
                await bridgeOutResult.wait(1);
                setConfirmingMsg('Bridge transaction confirmed!');
                Logger.log('Bridge transaction confirmed');
                console.log('==== bridgeOutResult==', bridgeOutResult);

                // Add bridge activity to recent activities
                addActivity({
                    type: 'bridge',
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
                Logger.error('Bridge transaction error:', e);
                let errorMsg = e.message || 'Bridge transaction failed';

                if (e.message?.includes('insufficient funds')) {
                    errorMsg = 'Insufficient funds for transaction';
                } else if (e.message?.includes('user rejected')) {
                    errorMsg = 'Transaction rejected by user';
                } else if (e.code === 'UNPREDICTABLE_GAS_LIMIT' || e.code === 'CALL_EXCEPTION') {
                    errorMsg = 'Transaction would fail. Check token balance and network.';
                }

                showSnackMessage(errorMsg);
            } finally {
                setConfirming(false);
                setConfirmingMsg('');
            }
            refetchBalances();
            setButtonBusy(false);
        } catch (e: any) {
            Logger.error(e);
            showSnackMessage(e.message);
            setButtonBusy(false);
        }
    }, [asset, destination, normalizedAmount, isValidDestination, direction, walletProvider, selectedEthAccount]);

    const bridgeToEvm = useCallback(async () => {
        if (!isValidDestination || !destination?.startsWith('0x')) {
            return showSnackMessage('Invalid destination!');
        }
        if (!normalizedAmount || normalizedAmount.isLessThanOrEqualTo(0)) {
            return showSnackMessage('Invalid amount!');
        }
        if (!aeternityAddress) {
            return showSnackMessage('Aeternity wallet not connected!');
        }

        setButtonBusy(true);

        // Check if user has enough balance
        const hasUserBalance = checkUserHasEnoughBalance(asset, normalizedAmount, direction, aeBalances, ethBalances);
        if (!hasUserBalance) {
            setButtonBusy(false);
            return showSnackMessage(`Insufficient ${asset.symbol} balance to complete this transaction.`);
        }

        // Also check if bridge contract has enough balance (for liquidity)
        const hasBridgeBalance = await checkEvmNetworkHasEnoughBalance(asset, normalizedAmount, walletProvider);
        if (!hasBridgeBalance) {
            setButtonBusy(false);
            return showSnackMessage('Ethereum bridge contract has insufficient balance to complete this transaction.');
        }

        const hasEligibleBridgeUse = await checkAeAccountHasEligibleBridgeUse(aeternityAddress);
        if (!hasEligibleBridgeUse) {
            setButtonBusy(false);
            return showSnackMessage(
                `Only 1 transaction allowed in every ${BRIDGE_USAGE_INTERVAL_IN_HOURS} hours. Please try again later.`,
            );
        }

        try {
            let action_type = BRIDGE_TOKEN_ACTION_TYPE;
            let ae_amount = BigInt(0);
            let allowanceTxHash = '';

            if (asset.aeAddress === BridgeConstants.aeternity.default_ae) {
                action_type = BRIDGE_AETERNITY_ACTION_TYPE;
                ae_amount = BigInt(normalizedAmount.toString());
            } else {
                action_type =
                    asset.aeAddress === BridgeConstants.aeternity.aeeth ? BRIDGE_ETH_ACTION_TYPE : BRIDGE_TOKEN_ACTION_TYPE;
                // Initialize contract using asset.aeAddress (we're bridging FROM Aeternity)
                const asset_contract = await Aeternity.initializeContract(sdk, {
                    aci: BridgeConstants.aeternity.asset_aci,
                    address: asset.aeAddress as `ct_${string}`,
                    omitUnknown: true,
                });

                // Check and handle allowance
                setConfirming(true);
                setConfirmingMsg('Checking token allowance...');
                let allowance;
                try {
                    const result = await asset_contract.allowance({
                        from_account: aeternityAddress,
                        for_account: BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
                    });
                    allowance = result.decodedResult;
                } catch (error: any) {
                    // If allowance check fails, treat as undefined (no allowance set)
                    Logger.log('Allowance check failed, will create new allowance');
                    allowance = undefined;
                }

                if (allowance === undefined) {
                    setConfirmingMsg('Please confirm the token allowance in your wallet...');
                    const allowanceCall = await asset_contract.create_allowance(
                        BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
                        normalizedAmount.toString(),
                    );
                    allowanceTxHash = allowanceCall.hash;
                    showTransactionSubmittedMessage('Allowance transaction submitted.', allowanceCall.hash);
                } else if (normalizedAmount.isGreaterThan(allowance)) {
                    setConfirmingMsg('Please confirm the token allowance update in your wallet...');
                    const allowanceCall = await asset_contract.change_allowance(
                        BridgeConstants.aeternity.bridge_address.replace('ct_', 'ak_'),
                        normalizedAmount.toString(),
                    );
                    allowanceTxHash = allowanceCall.hash;
                    showTransactionSubmittedMessage('Allowance transaction submitted.', allowanceCall.hash);
                }
                setConfirming(false);
                setConfirmingMsg('');
            }

            const bridge_contract = await Aeternity.initializeContract(sdk, {
                aci: BridgeConstants.aeternity.bridge_aci,
                address: BridgeConstants.aeternity.bridge_address,
                omitUnknown: true,
            });

            setConfirmingMsg('Please confirm the bridge transaction in your wallet...');
            setConfirming(true);
            const bridge_out_call = await bridge_contract.bridge_out(
                [asset.ethAddress, destination, normalizedAmount.toString(), action_type],
                { amount: ae_amount },
            );
            setConfirmingMsg('Bridge transaction confirmed!');
            setBridgeActionSummary({
                direction,
                asset,
                destination,
                amount: normalizedAmount.shiftedBy(-asset.decimals).toString(),
                allowanceTxHash,
                bridgeTxHash: bridge_out_call.hash,
            });

            // Add bridge activity to recent activities
            addActivity({
                type: 'bridge',
                hash: bridge_out_call.hash,
                account: aeternityAddress ?? destination,
                tokenIn: `æ${asset.symbol}`,
                tokenOut: asset.symbol,
                amountIn: normalizedAmount.shiftedBy(-asset.decimals).toString(),
                amountOut: normalizedAmount.shiftedBy(-asset.decimals).toString(),
                status: {
                    confirmed: true,
                    blockNumber: bridge_out_call?.txData?.blockHeight,
                },
            });
        } catch (e: any) {
            Logger.error(e);
            showSnackMessage(e.message);
        } finally {
            setConfirming(false);
            setConfirmingMsg('');
        }

        setButtonBusy(false);
    }, [asset, destination, normalizedAmount, isValidDestination, aeternityAddress, direction, sdk]);

    const isBridgeActionFromAeternity = bridgeActionSummary?.direction === Direction.AeternityToEthereum;
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
                showSnackMessage('Token address copied');
            }
        } catch (err) {
            showSnackMessage('Failed to copy');
        }
    }, [destinationTokenAddress]);

    return (
        <AppKitProvider>
            <>
                <div className="flex justify-center">
                    <div className="w-full mx-auto bg-transparent border-0 p-0 relative overflow-hidden box-border sm:bg-white/[0.02] sm:border sm:border-white/10 sm:backdrop-blur-[20px] sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2 sm:mb-3 min-w-0">
                            <h2 className="text-lg sm:text-xl font-bold m-0 sh-dex-title min-w-0 flex-shrink">
                                Bridge ETH ⇆ AE

                            </h2>

                            <div className="text-xs text-white/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-[10px] transition-all duration-300 ease-out font-medium flex-shrink-0">
                                {direction === Direction.AeternityToEthereum ? 'AE → ETH' : 'ETH → AE'}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-4 sm:mb-5">
                            <p className="m-0 text-sm text-white/60 leading-relaxed">
                                The Bridge enables secure transfers of tokens and native assets between Ethereum
                                and æternity. It supports popular ERC‑20/AEX‑9 tokens as well as native ETH and AE.
                                Choose a direction below, connect your wallets, and bridge in minutes.
                            </p>
                        </div>

                        {/* Mainnet Warning */}
                        {!isMainnet && (
                            <div className="mb-4 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
                                ⚠️ Configured for Ethereum Mainnet. Make sure your wallet is on Mainnet.
                            </div>
                        )}

                        {/* Network & Token Selection */}
                        <div className='mb-4'>
                            <label className="text-xs text-white/60 font-medium uppercase tracking-wider block mb-2">
                                From Network
                            </label>
                            <Select value={direction} onValueChange={handleDirectionChange}>
                                <SelectTrigger className="bg-white/[0.05] border-white/10 rounded-xl h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Direction.AeternityToEthereum}>
                                        æternity {!isMainnet && 'Testnet'}
                                    </SelectItem>
                                    <SelectItem value={Direction.EthereumToAeternity}>
                                        Ethereum {!isMainnet && 'Sepolia Testnet'}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ethereum Account Selector - Only show when bridging from Ethereum */}
                        {direction === Direction.EthereumToAeternity && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-white/60 font-medium uppercase tracking-wider">
                                        Ethereum Account
                                    </label>
                                    {ethereumAccounts.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={fetchEthereumAccounts}
                                                className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa] transition-colors"
                                            >
                                                Refresh
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
                                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                            <span className="font-mono text-sm">
                                                                {account.slice(0, 6)}...{account.slice(-4)}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="bg-white/[0.05] border border-white/10 rounded-xl h-10 flex items-center px-4 text-white/60 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span className="font-mono">
                                                    {ethereumAccounts[0].slice(0, 6)}...{ethereumAccounts[0].slice(-4)}
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
                            fromLabel="From"
                            toLabel="To"
                            inputType="number"
                            inputStep="0.000001"
                            fromAmount={amount}
                            onChangeFromAmount={setAmount}
                            fromBalanceText={
                                loadingBalance
                                    ? 'Loading balance...'
                                    : selectedEthAccount
                                        ? `Balance: ${Decimal.from(tokenBalance).prettify()}`
                                        : null
                            }
                            onMaxClick={tokenBalance ? () => setAmount(tokenBalance) : undefined}
                            maxDisabled={false}
                            fromTokenNode={(
                                <BridgeTokenSelector
                                    selected={asset}
                                    onSelect={handleAssetChange}
                                    assets={assets}
                                    direction={direction}
                                    aeBalances={aeBalances}
                                    ethBalances={ethBalances}
                                    loadingBalances={loadingBalance}
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
                                                Copy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        />

                        {/* Destination Address */}
                        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-white/60 font-medium uppercase tracking-wider block mb-2">
                                    Destination {direction === Direction.EthereumToAeternity ? 'æternity' : 'Ethereum'} Address
                                </label>
                                {(activeAccount && direction === Direction.EthereumToAeternity) && (
                                    <button
                                        onClick={() => {
                                            if (direction === Direction.EthereumToAeternity) {
                                                // Bridging from Ethereum to Aeternity, use Aeternity account
                                                setDestination(activeAccount);
                                            } else {
                                                // Bridging from Aeternity to Ethereum, use Ethereum account
                                                if (selectedEthAccount) {
                                                    setDestination(selectedEthAccount);
                                                }
                                            }
                                        }}
                                        className="text-xs text-[#4ecdc4] hover:text-[#3ab3aa] bg-[#4ecdc4]/10 hover:bg-[#4ecdc4]/20 border border-[#4ecdc4]/30 hover:border-[#4ecdc4]/50 rounded-lg px-2 py-1 transition-all duration-200 font-medium"
                                    >
                                        use connected account
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder={direction === Direction.EthereumToAeternity ? 'ak_...' : '0x...'}
                                className={`w-full bg-transparent border-none text-white text-sm font-mono outline-none shadow-none ${!isValidDestination && destination ? 'text-red-400' : ''
                                    }`}
                            />
                            {!isValidDestination && destination && (
                                <div className="text-red-400 text-xs mt-1">Invalid address format</div>
                            )}
                        </div>

                        {/* Bridge Process Status */}
                        {(confirming || buttonBusy) && (
                            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-white/60">
                                        Transaction Status
                                    </span>
                                    <span className="text-sm font-semibold text-yellow-400">
                                        {confirming
                                            ? (confirmingMsg === 'Approving allowance' || confirmingMsg === 'Creating allowance' || confirmingMsg === 'Updating allowance'
                                                ? '1️⃣ Approving Token'
                                                : '2️⃣ Executing Bridge')
                                            : 'Processing...'}
                                    </span>
                                </div>

                                <div className="w-full h-1 bg-white/10 rounded overflow-hidden mb-2">
                                    <div className="h-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded animate-pulse"></div>
                                </div>

                                <div className="text-xs text-white/60 text-center">
                                    {confirming ? confirmingMsg : 'Preparing transaction...'}
                                </div>
                            </div>
                        )}

                        {/* Warnings */}
                        {(!isBridgeContractEnabled || !hasOperatorEnoughBalance) && (
                            <div className="text-yellow-400 text-sm py-3 px-3 sm:px-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl mb-4 sm:mb-5">
                                {!isBridgeContractEnabled && '⚠️ Smart contract has been disabled for this network.'}
                                {!hasOperatorEnoughBalance && '⚠️ Bridge operator has insufficient funds. Please try again later.'}
                            </div>
                        )}

                        <div className='grid gap-2'>
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
                                        onClick={direction === Direction.AeternityToEthereum ? bridgeToEvm : bridgeToAeternity}
                                        disabled={buttonBusy || !isBridgeContractEnabled || !hasOperatorEnoughBalance || !isValidDestination || !amount || parseFloat(amount) <= 0 || (direction === Direction.EthereumToAeternity && ethereumAccounts.length === 0)}
                                        className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${buttonBusy || !isBridgeContractEnabled || !hasOperatorEnoughBalance || !isValidDestination || !amount || parseFloat(amount) <= 0 || (direction === Direction.EthereumToAeternity && ethereumAccounts.length === 0)
                                            ? 'bg-white/10 cursor-not-allowed opacity-60'
                                            : 'bg-black hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0'
                                            }`}
                                    >
                                        {buttonBusy ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                {confirming
                                                    ? (confirmingMsg === 'Approving allowance' || confirmingMsg === 'Creating allowance' || confirmingMsg === 'Updating allowance'
                                                        ? 'Approving...'
                                                        : 'Bridging...')
                                                    : 'Processing...'}
                                            </div>
                                        ) : `Bridge to ${direction === Direction.AeternityToEthereum ? 'Ethereum' : 'æternity'}`}
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
                                Bridge Transaction Submitted
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 py-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold mb-2">
                                    <span className="text-2xl">✓</span>
                                    <span>Successfully Submitted</span>
                                </div>
                                <div className="text-xs text-white/60 text-center">
                                    Your bridge transaction has been submitted to the blockchain
                                </div>
                            </div>

                            <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Direction:</span>
                                    <span className="text-white font-semibold">
                                        {isBridgeActionFromAeternity ? 'æternity → Ethereum' : 'Ethereum → æternity'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Amount:</span>
                                    <span className="text-white font-semibold">
                                        {bridgeActionSummary?.amount} {bridgeActionSummary?.asset.symbol}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Destination:</span>
                                    <span className="text-white text-xs font-mono truncate max-w-[200px]">
                                        {bridgeActionSummary?.destination}
                                    </span>
                                </div>
                            </div>

                            {bridgeActionSummary?.allowanceTxHash && (
                                <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Allowance Transaction:</span>
                                        <a
                                            className="text-[#4ecdc4] hover:text-[#3ab3aa] text-sm font-semibold transition-colors"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            href={getTxUrl(bridgeActionSummary?.direction!, bridgeActionSummary?.allowanceTxHash!)}
                                        >
                                            View on {isBridgeActionFromAeternity ? 'ÆScan' : 'Etherscan'} →
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/[0.05] border border-white/10 rounded-xl p-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Bridge Transaction:</span>
                                    <a
                                        className="text-[#4ecdc4] hover:text-[#3ab3aa] text-sm font-semibold transition-colors"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        href={getTxUrl(bridgeActionSummary?.direction!, bridgeActionSummary?.bridgeTxHash!)}
                                    >
                                        View on {isBridgeActionFromAeternity ? 'ÆScan' : 'Etherscan'} →
                                    </a>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-white/80 text-center">
                                <div className="font-semibold mb-1">⏳ Processing Time</div>
                                Your tokens will be available in the destination network after the transaction is confirmed and processed (typically 5-15 minutes).
                            </div>

                            {!isBridgeActionFromAeternity && (
                                <div className="text-xs text-white/60 bg-white/[0.05] border border-white/10 rounded-xl p-3">
                                    💡 The received tokens should automatically appear in your Superhero Wallet. If they haven't shown up after 15 minutes, try refreshing or reach out on the{' '}
                                    <a href="https://forum.aeternity.com/" target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] hover:underline">
                                        forum
                                    </a>
                                    .
                                </div>
                            )}

                            {isBridgeActionFromAeternity && bridgeActionSummary?.asset.symbol !== 'ETH' && (
                                <div className="text-xs text-white/60 bg-white/[0.05] border border-white/10 rounded-xl p-3">
                                    💡 If you don't see the tokens, you can{' '}
                                    <button
                                        className="text-[#4ecdc4] hover:underline font-semibold"
                                        onClick={() => addTokenToEthereumWallet(bridgeActionSummary.asset)}
                                    >
                                        add {bridgeActionSummary?.asset.symbol} to your wallet
                                    </button>
                                    .
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <button
                                onClick={() => setBridgeActionSummary(null)}
                                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white font-bold uppercase tracking-wider transition-all duration-300 hover:shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5"
                            >
                                Close
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        </AppKitProvider>
    );
}

export default AeEthBridge;