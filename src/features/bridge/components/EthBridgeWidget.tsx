import React, { useState, useEffect } from 'react';
import { BridgeService, BridgeStatus, BridgeOptions } from '../index';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { CONFIG } from '../../../config';
import ConnectWalletButton from '../../../components/ConnectWalletButton';

import { useDex, useAeSdk, useRecentActivities } from '../../../hooks';

export default function EthBridgeWidget() {
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

  return (
    <div className="w-full max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
          Bridge ETH → AE
        </h2>

        <div className="text-xs text-white/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-[10px] transition-all duration-300 ease-out font-medium">
          Cross-chain
        </div>
      </div>

      {/* Description */}
      <p className="m-0 mb-4 sm:mb-5 text-sm text-white/60 leading-relaxed">
        Bridge native ETH from Ethereum to æternity as æETH, then automatically swap to AE tokens.
      </p>

      {/* From Input - ETH */}
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-2 backdrop-blur-[10px]">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider">
            From
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">
              Ethereum
            </span>
            <button
              onClick={handleMaxClick}
              className="text-[10px] text-[#4ecdc4] bg-transparent border border-[#4ecdc4] rounded px-1.5 py-0.5 cursor-pointer uppercase tracking-wider hover:bg-[#4ecdc4]/10 transition-all duration-300"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="text"
            placeholder="0.0"
            value={ethBridgeIn}
            onChange={(e) => setEthBridgeIn(e.target.value)}
            className="flex-1 bg-transparent border-none text-white text-xl sm:text-2xl font-semibold outline-none min-w-0"
          />

          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl border border-white/10">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#627eea] to-[#8a92b2] flex items-center justify-center text-white text-xs font-bold">
              Ξ
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">
              ETH
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Arrow */}
      <div className="flex justify-center my-3 sm:my-4 relative">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] border-2 border-white/10 text-white flex items-center justify-center text-lg sm:text-xl font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(255,107,107,0.3)] z-[2] relative hover:shadow-[0_8px_24px_rgba(255,107,107,0.4)] hover:-translate-y-0.5">
          🌉
        </div>
      </div>

      {/* To Output - AE */}
      <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider">
            To (Estimated)
          </label>
          <span className="text-xs text-white/60">
            æternity
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`flex-1 text-xl sm:text-2xl font-semibold ${ethBridgeQuoting ? 'text-white/60' : 'text-white'} min-w-0`}>
            {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 rounded-xl border border-white/10">
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
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 backdrop-blur-[10px]">
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
          ) : 'Bridge & Swap'}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect Wallet to Bridge"
          block
          className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-2xl border-none bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white text-sm sm:text-base font-bold tracking-wider uppercase shadow-[0_8px_25px_rgba(255,107,107,0.4)] cursor-pointer hover:shadow-[0_12px_35px_rgba(255,107,107,0.5)] hover:-translate-y-0.5 active:translate-y-0"
        />
      )}

    </div>
  );
}
