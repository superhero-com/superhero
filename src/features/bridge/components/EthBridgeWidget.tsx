import React, { useState, useEffect } from 'react';
import { BridgeService, BridgeStatus, BridgeOptions } from '../index';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { CONFIG } from '../../../config';
import ConnectWalletButton from '../../../components/ConnectWalletButton';

import { useDex, useAeSdk, useRecentActivities } from '../../../hooks';

interface EthBridgeWidgetProps {
  embedded?: boolean; // renders without outer card/padding for sidebars
}

export default function BuyAeWidget({ embedded = false }: EthBridgeWidgetProps) {
  const { activeAccount, sdk } = useAeSdk();
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
  const { addActivity } = useRecentActivities();
  const toast = useToast();

  const [ethBridgeIn, setEthBridgeIn] = useState('');
  const [ethBridgeOutAe, setEthBridgeOutAe] = useState('');
  const [ethBridgeQuoting, setEthBridgeQuoting] = useState(false);
  const [ethBridgeProcessing, setEthBridgeProcessing] = useState(false);
  const [ethBridgeError, setEthBridgeError] = useState<string | null>(null);
  const [ethBridgeStep, setEthBridgeStep] = useState<BridgeStatus>('idle');

  const bridgeService = BridgeService.getInstance();

  // Automated ETH Bridge quoting
  useEffect(() => {
    if (!ethBridgeIn || Number(ethBridgeIn) <= 0) {
      setEthBridgeOutAe('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEthBridgeQuoting(true);
        setEthBridgeError(null);
        const quote = await bridgeService.getBridgeQuote(sdk as any, ethBridgeIn);
        setEthBridgeOutAe(quote);
      } catch (e: any) {
        setEthBridgeError(errorToUserMessage(e, { action: 'quote' }));
      } finally {
        setEthBridgeQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethBridgeIn, bridgeService]);

  const handleEthBridge = async () => {
    try {
      setEthBridgeProcessing(true);
      setEthBridgeError(null);
      if (!activeAccount) return;

      const bridgeOptions: BridgeOptions = {
        amountEth: ethBridgeIn,
        aeAccount: activeAccount,
        autoSwap: true,
        slippagePercent: slippagePct,
        deadlineMinutes: deadlineMins,
        depositTimeout: 300_000, // 5 minutes
        pollInterval: 6000, // 6 seconds
      };

      const result = await bridgeService.bridgeEthToAe(
        sdk as any,
        bridgeOptions,
        (status: BridgeStatus, message?: string) => {
          setEthBridgeStep(status);
          console.info(`[Bridge] Status: ${status}${message ? ` - ${message}` : ''}`);
        }
      );

      if (result.success) {
        // Show success notification
        try {
          const explorerUrl = CONFIG.EXPLORER_URL?.replace(/\/$/, '');
          const ethTxUrl = result.ethTxHash && explorerUrl
            ? `https://etherscan.io/tx/${result.ethTxHash}`
            : null;
          const aeTxUrl = result.aeTxHash && explorerUrl
            ? `${explorerUrl}/transactions/${result.aeTxHash}`
            : null;

          // Track the bridge activity
          if (activeAccount && result.aeTxHash) {
            addActivity({
              type: 'bridge',
              hash: result.aeTxHash,
              account: activeAccount,
              tokenIn: 'ETH',
              tokenOut: 'AE',
              amountIn: ethBridgeIn,
              amountOut: ethBridgeOutAe,
            });
          }

          toast.push(
            React.createElement('div', {},
              React.createElement('div', {}, 'ETH→AE bridge completed successfully!'),
              ethTxUrl && React.createElement('a', {
                href: ethTxUrl,
                target: '_blank',
                rel: 'noreferrer',
                style: { color: '#8bc9ff', textDecoration: 'underline', display: 'block' }
              }, 'View ETH transaction'),
              aeTxUrl && React.createElement('a', {
                href: aeTxUrl,
                target: '_blank',
                rel: 'noreferrer',
                style: { color: '#8bc9ff', textDecoration: 'underline', display: 'block' }
              }, 'View AE swap transaction')
            )
          );
        } catch (toastError) {
          console.warn('[Bridge] Toast notification failed:', toastError);
        }

        setEthBridgeStep('completed');
        setEthBridgeIn('');
        setEthBridgeOutAe('');
      } else {
        throw new Error(result.error || 'Bridge operation failed');
      }
    } catch (e: any) {
      setEthBridgeError(errorToUserMessage(e, { action: 'generic', slippagePct, deadlineMins }));
      setEthBridgeStep('idle');
    } finally {
      setEthBridgeProcessing(false);
    }
  };

  const handleMaxClick = () => {
    // For demo purposes, set a reasonable max amount
    // In production, you'd want to get the actual ETH balance
    setEthBridgeIn('0.1');
  };

  const isDisabled = ethBridgeProcessing || !activeAccount || !ethBridgeIn || Number(ethBridgeIn) <= 0;

  const sectionBase = 'border border-white/10 rounded-2xl p-3 sm:p-4';
  const sectionBg = embedded ? 'bg-transparent' : 'bg-white/[0.05] backdrop-blur-[10px]';
  const sectionSpacingSmall = 'mb-2';
  const sectionSpacingLarge = 'mb-4 sm:mb-5';
  const chipBg = embedded ? 'bg-transparent' : 'bg-white/[0.02] backdrop-blur-[10px]';
  const circleBg = embedded ? 'bg-transparent' : 'bg-white/[0.08] backdrop-blur-[10px]';

  return (
    <div 
    className={
      embedded
        ? "w-full max-w-full mx-auto bg-transparent border-none rounded-none p-0 shadow-none relative overflow-visible box-border"
        : "w-full max-w-[min(480px,100vw)] mx-auto bg-transparent border-0 p-0 relative overflow-visible box-border sm:bg-white/[0.02] sm:border sm:border-white/10 sm:backdrop-blur-[20px] sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    }
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

        <div className={`text-xs text-white/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 ${chipBg} transition-all duration-300 ease-out font-medium flex-shrink-0`}>
          Cross-chain
        </div>
      </div>

      {/* Description */}
      <p className="m-0 mb-4 sm:mb-5 text-sm text-white/60 leading-relaxed">
        Bridge native ETH from Ethereum to æternity as æETH, then automatically swap to AE tokens.
      </p>

      {/* From Input - ETH */}
      <div className={`${sectionBase} ${sectionBg} ${sectionSpacingSmall} sm:pt-0`}>
        <div className="flex justify-between items-center mb-2 min-w-0">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider flex-shrink-0">
            From
          </label>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-white/60">
              Ethereum
            </span>
            <button
              onClick={handleMaxClick}
              className="text-[10px] text-[#4ecdc4] bg-transparent border border-[#4ecdc4] rounded px-1.5 py-0.5 cursor-pointer uppercase tracking-wider hover:bg-[#4ecdc4]/10 transition-all duration-300 flex-shrink-0"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <input
            type="text"
            placeholder="0.0"
            value={ethBridgeIn}
            onChange={(e) => setEthBridgeIn(e.target.value)}
            className="flex-1 !bg-transparent !bg-none ![background:none] !border-none text-white text-xl sm:text-2xl font-semibold !outline-none focus:!outline-none active:!outline-none !shadow-none ![box-shadow:none] focus:!shadow-none active:!shadow-none !ring-0 focus:!ring-0 active:!ring-0 !backdrop-blur-0 ![backdrop-filter:none] !p-0 !min-h-0 !rounded-none min-w-0 overflow-hidden !appearance-none"
          />

          <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 ${embedded ? 'bg-transparent' : 'bg-white/10'} rounded-xl border border-white/10 flex-shrink-0`}>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#627eea] to-[#8a92b2] flex items-center justify-center text-white text-xs font-bold">
              Ξ
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">
              ETH
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Arrow (hidden when embedded) */}
      {!embedded && (
        <div className="flex justify-center my-3 sm:my-4 relative">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 ${circleBg} text-white flex items-center justify-center text-lg sm:text-xl font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] z-[2] relative`}>
            🌉
          </div>
        </div>
      )}

      {/* To Output - AE */}
      <div className={`${sectionBase} ${sectionBg} ${sectionSpacingLarge}`}>
        <div className="flex justify-between items-center mb-2 min-w-0">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider flex-shrink-0">
            To (Estimated)
          </label>
          <span className="text-xs text-white/60 flex-shrink-0">
            æternity
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`flex-1 text-xl sm:text-2xl font-semibold ${ethBridgeQuoting ? 'text-white/60' : 'text-white'} min-w-0 overflow-hidden`}>
            {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
          </div>

          <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 ${embedded ? 'bg-transparent' : 'bg-white/10'} rounded-xl border border-white/10 flex-shrink-0`}>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-red-400 to-red-300 flex items-center justify-center text-white text-xs font-bold">
              Æ
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">
              AE
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Process Info */}
      {ethBridgeStep !== 'idle' && (
        <div className={`${sectionBase} ${sectionBg} ${sectionSpacingLarge}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/60">
              Bridge Status
            </span>
            <span className={`text-sm font-semibold ${
              ethBridgeStep === 'completed' ? 'text-green-400' :
              ethBridgeStep === 'failed' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {ethBridgeStep === 'connecting' ? 'Connecting to wallets' :
                ethBridgeStep === 'bridging' ? 'Bridging ETH → æETH' :
                  ethBridgeStep === 'waiting' ? 'Waiting for æETH deposit' :
                    ethBridgeStep === 'swapping' ? 'Swapping æETH → AE' :
                      ethBridgeStep === 'completed' ? 'Completed successfully' :
                        ethBridgeStep === 'failed' ? 'Failed' : 'Processing'}
            </span>
          </div>

          {ethBridgeProcessing && (
            <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] rounded animate-pulse"></div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {ethBridgeError && (
        <div className="text-red-400 text-sm py-3 px-3 sm:px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-4 sm:mb-5 text-center">
          {ethBridgeError}
        </div>
      )}

      {/* Bridge Button */}
      {activeAccount ? (
        <button
          onClick={handleEthBridge}
          disabled={isDisabled}
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none text-white cursor-pointer text-sm sm:text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isDisabled
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:shadow-[0_12px_35px_rgba(255,107,107,0.5)] hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {ethBridgeProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {ethBridgeStep === 'connecting' ? 'Connecting…' :
                ethBridgeStep === 'bridging' ? 'Bridging…' :
                  ethBridgeStep === 'waiting' ? 'Waiting for æETH…' :
                    ethBridgeStep === 'swapping' ? 'Swapping…' : 'Processing…'}
            </div>
          ) : 'Buy AE with ETH'}
        </button>
      ) : (
        <ConnectWalletButton
          label={embedded ? "CONNECT WALLET" : "CONNECT WALLET TO BUY AE"}
          block
          className="text-sm"
          variant="dex"
        />
      )}

    </div>
  );
}
