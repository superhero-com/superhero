import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Eip1193Provider, formatEther } from 'ethers';
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { ConnectWalletButton } from "../../../components/ConnectWalletButton";
import { useToast } from "../../../components/ToastProvider";
import { CONFIG } from "../../../config";
import { errorToUserMessage } from "../../../libs/errorMessages";
import { ensureEthProvider, getEthBalance } from "../ethereum";
import { BridgeOptions, BridgeService, BridgeStatus } from "../index";
import { AppKitProvider } from '../providers/AppKitProvider';
import { ConnectEthereumWallet } from "./ConnectEthereumWallet";

import { Decimal } from "@/libs/decimal";
import { useAeSdk, useDex, useRecentActivities } from "../../../hooks";
import { FromTo } from "@/features/shared/components";
import { useSwapQuote } from "../../../components/dex/hooks/useSwapQuote";
import { DexService } from "../../../api/generated";
import { DEX_ADDRESSES } from "../../../libs/dex";
import Spinner from "@/components/Spinner";

interface BuyAeWidgetProps {
  embedded?: boolean; // renders without outer card/padding for sidebars
}

//
function BuyAeWidgetContent({
  embedded = false,
}: BuyAeWidgetProps) {
  const { t } = useTranslation('common');
  const { activeAccount, sdk } = useAeSdk();
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
  const { addActivity } = useRecentActivities();
  const toast = useToast();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155');
  const { address: ethAddress, isConnected: ethConnected } = useAppKitAccount();

  const [ethBridgeIn, setEthBridgeIn] = useState("");
  const [ethBridgeOutAe, setEthBridgeOutAe] = useState("");
  const [ethBridgeQuoting, setEthBridgeQuoting] = useState(false);
  const [ethBridgeProcessing, setEthBridgeProcessing] = useState(false);
  const [ethBridgeError, setEthBridgeError] = useState<string | null>(null);
  const [ethBridgeStep, setEthBridgeStep] = useState<BridgeStatus>("idle");
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [aeEthToken, setAeEthToken] = useState<any>(null);
  const [aeToken, setAeToken] = useState<any>(null);
  const [liquidityExceeded, setLiquidityExceeded] = useState(false);
  const [maxAvailable, setMaxAvailable] = useState<string | undefined>(undefined);

  const bridgeService = BridgeService.getInstance();
  const { refreshQuote, routeInfo } = useSwapQuote();

  // Fetch ETH balance
  const fetchEthBalance = useCallback(async () => {
    if (!walletProvider || !ethAddress) {
      setEthBalance(null);
      return;
    }

    try {
      setFetchingBalance(true);
      const provider = await ensureEthProvider(walletProvider);
      const balanceWei = await getEthBalance(provider, ethAddress);
      const balanceEth = formatEther(balanceWei);
      setEthBalance(balanceEth);
    } catch (error) {
      setEthBridgeError("Failed to fetch ETH balance");
      console.error("Failed to fetch ETH balance:", error);
      setEthBalance(null);
    } finally {
      setFetchingBalance(false);
    }
  }, [walletProvider, ethAddress]);

  // Fetch ETH balance when wallet is connected
  useEffect(() => {
    if (ethConnected && walletProvider && ethAddress) {
      fetchEthBalance();
    } else {
      // Clear balance when wallet is disconnected
      setEthBalance(null);
    }
  }, [ethConnected, walletProvider, ethAddress, fetchEthBalance]);

  // Load tokens for quote
  useEffect(() => {
    const loadTokens = async () => {
      try {
        // Load aeETH token
        const aeEth = await DexService.getDexTokenByAddress({ address: DEX_ADDRESSES.aeeth });
        setAeEthToken(aeEth);
        
        // Load AE token (find by is_ae flag or use WAE address)
        const ae = await DexService.getDexTokenByAddress({ address: DEX_ADDRESSES.wae });
        // Create AE token object
        setAeToken({ ...ae, is_ae: true, address: 'AE', symbol: 'AE' });
      } catch (e) {
        console.warn('[BuyAeWidget] Failed to load tokens:', e);
      }
    };
    
    if (sdk) {
      loadTokens();
    }
  }, [sdk]);

  // Handle Ethereum wallet disconnection
  const handleEthDisconnected = useCallback(() => {
    setEthBalance(null);
    setEthBridgeIn("");
    setEthBridgeOutAe("");
    setEthBridgeError(null);
  }, []);

  // Automated ETH Bridge quoting using refreshQuote
  useEffect(() => {
    if (!ethBridgeIn || Number(ethBridgeIn) <= 0 || !aeEthToken || !aeToken) {
      setEthBridgeOutAe("");
      setLiquidityExceeded(false);
      setMaxAvailable(undefined);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEthBridgeQuoting(true);
        setEthBridgeError(null);
        
        const result = await refreshQuote({
          amountIn: ethBridgeIn,
          amountOut: '',
          tokenIn: aeEthToken,
          tokenOut: aeToken,
          isExactIn: true
        });
        
        setEthBridgeOutAe(result.amountOut || "");
      } catch (e: any) {
        setEthBridgeError(errorToUserMessage(e, { action: "quote" }));
      } finally {
        setEthBridgeQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethBridgeIn, aeEthToken, aeToken]);

  // Monitor liquidity status from routeInfo
  useEffect(() => {
    if (routeInfo.liquidityStatus) {
      setLiquidityExceeded(routeInfo.liquidityStatus.exceedsLiquidity || false);
      setMaxAvailable(routeInfo.liquidityStatus.maxAvailable);
    } else {
      setLiquidityExceeded(false);
      setMaxAvailable(undefined);
    }
  }, [routeInfo.liquidityStatus]);

  const handleEthBridge = async () => {
    try {
      if (!activeAccount) return;
      setEthBridgeProcessing(true);
      setEthBridgeError(null);


      const bridgeOptions: BridgeOptions = {
        amountEth: ethBridgeIn,
        aeAccount: activeAccount,
        autoSwap: true,
        slippagePercent: slippagePct,
        deadlineMinutes: deadlineMins,
        depositTimeout: 300_000, // 5 minutes
        pollInterval: 6000, // 6 seconds
        walletProvider: walletProvider || undefined,
      };

      const result = await bridgeService.bridgeEthToAe(
        sdk as any,
        bridgeOptions,
        (status: BridgeStatus, message?: string) => {
          setEthBridgeStep(status);
          console.info(
            `[Bridge] Status: ${status}${message ? ` - ${message}` : ""}`
          );
        }
      );
      console.log("==== result:", result);

      if (result.success) {
        // Show success notification
        try {
          const explorerUrl = CONFIG.EXPLORER_URL?.replace(/\/$/, "");
          const ethTxUrl =
            result.ethTxHash && explorerUrl
              ? `https://etherscan.io/tx/${result.ethTxHash}`
              : null;
          const aeTxUrl =
            result.aeTxHash && explorerUrl
              ? `${explorerUrl}/transactions/${result.aeTxHash}`
              : null;

          // Track the bridge activity
          if (activeAccount && result.aeTxHash) {
            addActivity({
              type: "bridge",
              hash: result.aeTxHash,
              account: activeAccount,
              tokenIn: "ETH",
              tokenOut: "AE",
              amountIn: ethBridgeIn,
              amountOut: ethBridgeOutAe,
            });
          }

          toast.push(
            React.createElement(
              "div",
              {},
              React.createElement(
                "div",
                {},
                "ETH→AE bridge completed successfully!"
              ),
              ethTxUrl &&
              React.createElement(
                "a",
                {
                  href: ethTxUrl,
                  target: "_blank",
                  rel: "noreferrer",
                  style: {
                    color: "#8bc9ff",
                    textDecoration: "underline",
                    display: "block",
                  },
                },
                "View ETH transaction"
              ),
              aeTxUrl &&
              React.createElement(
                "a",
                {
                  href: aeTxUrl,
                  target: "_blank",
                  rel: "noreferrer",
                  style: {
                    color: "#8bc9ff",
                    textDecoration: "underline",
                    display: "block",
                  },
                },
                "View AE swap transaction"
              )
            )
          );
        } catch (toastError) {
          console.warn("[Bridge] Toast notification failed:", toastError);
        }

        setEthBridgeStep("completed");
        setEthBridgeIn("");
        setEthBridgeOutAe("");
      } else {
        throw new Error(result.error || "Bridge operation failed");
      }
    } catch (e: any) {
      setEthBridgeError(
        errorToUserMessage(e, { action: "generic", slippagePct, deadlineMins })
      );
      setEthBridgeStep("idle");
    } finally {
      setEthBridgeProcessing(false);
    }
  };

  const handleMaxClick = async () => {
    if (!ethBalance && !fetchingBalance) {
      await fetchEthBalance();
    }

    if (ethBalance) {
      setEthBridgeIn(parseFloat(ethBalance).toFixed(6));
    }
  };

  const isDisabled =
    ethBridgeProcessing ||
    !activeAccount ||
    !ethConnected ||
    !ethBridgeIn ||
    Number(ethBridgeIn) <= 0 ||
    liquidityExceeded ||
    !ethBridgeOutAe ||
    Number(ethBridgeOutAe) <= 0;

  const sectionBase = "border border-white/10 rounded-2xl p-3 sm:p-4";
  const sectionBg = embedded
    ? "bg-transparent"
    : "bg-white/[0.05] backdrop-blur-[10px]";
  const sectionSpacingLarge = "mb-4 sm:mb-5";
  const chipBg = embedded
    ? "bg-transparent"
    : "bg-white/[0.02] backdrop-blur-[10px]";

  return (
    <div
      className="w-full max-w-full mx-auto bg-transparent border-0 p-0 pb-6 relative overflow-visible box-border"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2 sm:mb-4 min-w-0">
        {embedded ? (
          <h2 className="m-0 text-base font-bold min-w-0 flex-shrink flex items-center gap-2">
            <span className="text-base">💎</span>
            <span>Buy AE with ETH</span>
          </h2>
        ) : (
          <h2 className="text-lg sm:text-xl font-bold m-0 sh-dex-title min-w-0 flex-shrink">
            Buy AE with ETH
          </h2>
        )}

        <div
          className={`text-xs text-white/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 ${chipBg} transition-all duration-300 ease-out font-medium flex-shrink-0`}
        >
          Cross-chain
        </div>
      </div>

      {/* Description */}
      <p className="m-0 mb-4 sm:mb-5 text-sm text-white/60 leading-relaxed">
        Bridge native ETH from Ethereum to æternity as æETH, then automatically
        swap to AE tokens.
      </p>

      <FromTo
        embedded={embedded}
        fromLabel="From"
        toLabel="To (Estimated)"
        fromAmount={ethBridgeIn}
        onChangeFromAmount={setEthBridgeIn}
        fromBalanceText={
          ethBalance && !fetchingBalance
            ? `Balance: ${Decimal.from(ethBalance ?? '0').prettify()} ETH`
            : 'Ethereum'
        }
        onMaxClick={handleMaxClick}
        maxDisabled={fetchingBalance}
        fromTokenNode={(
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 ${embedded ? 'bg-transparent' : 'bg-white/10'} rounded-xl border border-white/10 flex-shrink-0`}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#627eea] to-[#8a92b2] flex items-center justify-center text-white text-xs font-bold">
              Ξ
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">ETH</span>
          </div>
        )}
        toValue={ethBridgeOutAe}
        toLoading={ethBridgeQuoting}
        toTokenNode={(
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 ${embedded ? 'bg-transparent' : 'bg-white/10'} rounded-xl border border-white/10 flex-shrink-0`}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-red-400 to-red-300 flex items-center justify-center text-white text-xs font-bold">
              Æ
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">AE</span>
          </div>
        )}
      />

      {/* Bridge Process Info */}
      {ethBridgeStep !== "idle" && (
        <div className={`${sectionBase} ${sectionBg} ${sectionSpacingLarge}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/60">Bridge Status</span>
            <span
              className={`text-sm font-semibold ${ethBridgeStep === "completed"
                ? "text-green-400"
                : ethBridgeStep === "failed"
                  ? "text-red-400"
                  : "text-yellow-400"
                }`}
            >
              {ethBridgeStep === "connecting"
                ? "Connecting to wallets"
                : ethBridgeStep === "bridging"
                  ? "Bridging ETH → æETH"
                  : ethBridgeStep === "waiting"
                    ? "Waiting for æETH deposit"
                    : ethBridgeStep === "swapping"
                      ? "Swapping æETH → AE"
                      : ethBridgeStep === "completed"
                        ? "Completed successfully"
                        : ethBridgeStep === "failed"
                          ? "Failed"
                          : "Processing"}
            </span>
          </div>

          {ethBridgeProcessing && (
            <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded animate-pulse"></div>
            </div>
          )}
        </div>
      )}

      {/* Liquidity Warning */}
      {liquidityExceeded && maxAvailable && (
        <div className="text-yellow-400 text-sm py-3 px-3 sm:px-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl mb-4 sm:mb-5">
          <div className="font-semibold mb-1">Insufficient Liquidity</div>
          <div className="text-white/80">
            The requested amount exceeds available liquidity. Maximum available: {Decimal.from(maxAvailable).prettify()} æETH.
            Please reduce the amount or add liquidity to the pool.
          </div>
        </div>
      )}

      {/* Error Display */}
      {ethBridgeError && (
        <div className="text-red-400 text-sm py-3 px-3 sm:px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-4 sm:mb-5 text-center">
          {ethBridgeError}
        </div>
      )}

      {/* Ethereum Wallet Connection */}
      {!activeAccount ? (
        <ConnectWalletButton
          label={embedded ? t('buttons.connectWalletDex', { ns: 'common' }) : t('buttons.connectWalletToBuyAe', { ns: 'common' })}
          block
          className="text-sm"
          variant="dex"
        />
      ) : (
        <>
          <ConnectEthereumWallet
            label="Connect Ethereum Wallet"
            showConnectedState={true}
            onDisconnected={handleEthDisconnected}
          />

          {/* Bridge Button - Only show when both wallets are connected */}
          {ethConnected && (
            <button
              onClick={handleEthBridge}
              disabled={isDisabled}
              className={`w-full mt-4 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDisabled
                ? "bg-white/10 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                }`}
            >
              {ethBridgeProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner className="w-4 h-4" />
                  {ethBridgeStep === "connecting"
                    ? "Connecting…"
                    : ethBridgeStep === "bridging"
                      ? "Bridging…"
                      : ethBridgeStep === "waiting"
                        ? "Waiting for æETH…"
                        : ethBridgeStep === "swapping"
                          ? "Swapping…"
                          : "Processing…"}
                </div>
              ) : (
                "Buy AE with ETH"
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Export wrapped with AppKitProvider
export function BuyAeWidget(props: BuyAeWidgetProps) {
  return (
    <AppKitProvider>
      <BuyAeWidgetContent {...props} />
    </AppKitProvider>
  );
}

export default BuyAeWidget;