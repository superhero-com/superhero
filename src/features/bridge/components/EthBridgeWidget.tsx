import React, { useState, useEffect } from 'react';
import { BridgeService, BridgeStatus, BridgeOptions } from '../index';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { CONFIG } from '../../../config';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { AeCard } from '../../../components/ui/ae-card';
import AeButton from '../../../components/AeButton';

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
    <AeCard className="max-w-lg mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold m-0 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Bridge ETH → AE
        </h2>

        <div className="text-xs text-muted-foreground px-2 py-1 bg-white/5 rounded-lg border border-border">
          Cross-chain
        </div>
      </div>

      {/* Description */}
      <p className="m-0 mb-5 text-sm text-muted-foreground leading-relaxed">
        Bridge native ETH from Ethereum to æternity as æETH, then automatically swap to AE tokens.
      </p>

      {/* From Input - ETH */}
      <div className="bg-white/5 border border-border rounded-2xl p-4 mb-2">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            From
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Ethereum
            </span>
            <button
              onClick={handleMaxClick}
              className="text-[10px] text-primary bg-transparent border border-primary rounded px-1.5 py-0.5 cursor-pointer uppercase tracking-wider hover:bg-primary/10"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="0.0"
            value={ethBridgeIn}
            onChange={(e) => setEthBridgeIn(e.target.value)}
            className="flex-1 bg-transparent border-none text-foreground text-2xl font-semibold outline-none"
          />

          <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#627eea] to-[#8a92b2] flex items-center justify-center text-white text-xs font-bold">
              Ξ
            </div>
            <span className="text-foreground text-base font-semibold">
              ETH
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Arrow */}
      <div className="flex justify-center my-4 relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 border-2 border-border text-white flex items-center justify-center text-xl font-semibold shadow-lg shadow-primary/30 z-10 relative">
          🌉
        </div>
      </div>

      {/* To Output - AE */}
      <div className="bg-white/5 border border-border rounded-2xl p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            To (Estimated)
          </label>
          <span className="text-xs text-muted-foreground">
            æternity
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex-1 text-2xl font-semibold ${ethBridgeQuoting ? 'text-muted-foreground' : 'text-foreground'}`}>
            {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-red-300 flex items-center justify-center text-white text-xs font-bold">
              Æ
            </div>
            <span className="text-foreground text-base font-semibold">
              AE
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Process Info */}
      {ethBridgeStep !== 'idle' && (
        <div className="bg-white/5 border border-border rounded-2xl p-4 mb-5 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Bridge Status
            </span>
            <span className={`text-sm font-semibold ${
              ethBridgeStep === 'completed' ? 'text-green-500' :
              ethBridgeStep === 'failed' ? 'text-red-500' :
              'text-yellow-500'
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
              <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded animate-pulse"></div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {ethBridgeError && (
        <div className="text-red-500 text-sm py-3 px-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-5 text-center">
          {ethBridgeError}
        </div>
      )}

      {/* Bridge Button */}
      {activeAccount ? (
        <AeButton
          onClick={handleEthBridge}
          disabled={isDisabled}
          variant={isDisabled ? 'secondary' : 'primary'}
          size="large"
          className="w-full"
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
        </AeButton>
      ) : (
        <ConnectWalletButton
          label="Connect Wallet to Bridge"
          block
          className="w-full"
        />
      )}

    </AeCard>
  );
}
