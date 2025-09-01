import React, { useState, useEffect } from 'react';
import { BridgeService, BridgeStatus, BridgeOptions } from '../index';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { CONFIG } from '../../../config';
import ConnectWalletButton from '../../../components/ConnectWalletButton';

import { useDex, useAeSdk } from '../../../hooks';

export default function EthBridgeWidget() {
  const { activeAccount, sdk } = useAeSdk();
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
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
        const quote = await bridgeService.getBridgeQuote(sdk, ethBridgeIn);
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
        sdk,
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
    <div className="genz-card" style={{
      maxWidth: 480,
      margin: '0 auto',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      padding: 24,
      boxShadow: 'var(--glass-shadow)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--standard-font-color)',
          margin: 0,
          background: 'var(--primary-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Bridge ETH → AE
        </h2>

        <div style={{
          fontSize: 12,
          color: 'var(--light-font-color)',
          padding: '4px 8px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 8,
          border: '1px solid var(--glass-border)'
        }}>
          Cross-chain
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 20px',
        fontSize: 14,
        color: 'var(--light-font-color)',
        lineHeight: 1.5
      }}>
        Bridge native ETH from Ethereum to æternity as æETH, then automatically swap to AE tokens.
      </p>

      {/* From Input - ETH */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <label style={{
            fontSize: 12,
            color: 'var(--light-font-color)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            From
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{
              fontSize: 12,
              color: 'var(--light-font-color)'
            }}>
              Ethereum
            </span>
            <button
              onClick={handleMaxClick}
              style={{
                fontSize: 10,
                color: 'var(--accent-color)',
                background: 'transparent',
                border: '1px solid var(--accent-color)',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              MAX
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <input
            type="text"
            placeholder="0.0"
            value={ethBridgeIn}
            onChange={(e) => setEthBridgeIn(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--standard-font-color)',
              fontSize: 24,
              fontWeight: 600,
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #627eea, #8a92b2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 700
            }}>
              Ξ
            </div>
            <span style={{
              color: 'var(--standard-font-color)',
              fontSize: 16,
              fontWeight: 600
            }}>
              ETH
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Arrow */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0',
        position: 'relative'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--button-gradient)',
          border: '2px solid var(--glass-border)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
          zIndex: 2,
          position: 'relative'
        }}>
          🌉
        </div>
      </div>

      {/* To Output - AE */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <label style={{
            fontSize: 12,
            color: 'var(--light-font-color)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            To (Estimated)
          </label>
          <span style={{
            fontSize: 12,
            color: 'var(--light-font-color)'
          }}>
            æternity
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            flex: 1,
            fontSize: 24,
            fontWeight: 600,
            color: ethBridgeQuoting ? 'var(--light-font-color)' : 'var(--standard-font-color)',
            fontFamily: 'inherit'
          }}>
            {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 700
            }}>
              Æ
            </div>
            <span style={{
              color: 'var(--standard-font-color)',
              fontSize: 16,
              fontWeight: 600
            }}>
              AE
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Process Info */}
      {ethBridgeStep !== 'idle' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <span style={{ fontSize: 14, color: 'var(--light-font-color)' }}>
              Bridge Status
            </span>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: ethBridgeStep === 'completed' ? 'var(--success-color)' :
                ethBridgeStep === 'failed' ? 'var(--error-color)' :
                  'var(--warning-color)'
            }}>
              {ethBridgeStep === 'idle' ? 'Ready' :
                ethBridgeStep === 'connecting' ? 'Connecting to wallets' :
                  ethBridgeStep === 'bridging' ? 'Bridging ETH → æETH' :
                    ethBridgeStep === 'waiting' ? 'Waiting for æETH deposit' :
                      ethBridgeStep === 'swapping' ? 'Swapping æETH → AE' :
                        ethBridgeStep === 'completed' ? 'Completed successfully' :
                          ethBridgeStep === 'failed' ? 'Failed' : 'Processing'}
            </span>
          </div>

          {ethBridgeProcessing && (
            <div style={{
              width: '100%',
              height: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'var(--primary-gradient)',
                borderRadius: 2,
                animation: 'progress 2s ease-in-out infinite'
              }}></div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {ethBridgeError && (
        <div style={{
          color: 'var(--error-color)',
          fontSize: 14,
          padding: '12px 16px',
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.2)',
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'center'
        }}>
          {ethBridgeError}
        </div>
      )}

      {/* Bridge Button */}
      {activeAccount ? (
        <button
          onClick={handleEthBridge}
          disabled={isDisabled}
          className="genz-btn"
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: isDisabled ?
              'rgba(255, 255, 255, 0.1)' :
              'var(--button-gradient)',
            color: 'white',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isDisabled ?
              'none' :
              'var(--button-shadow)',
            opacity: isDisabled ? 0.6 : 1
          }}
        >
          {ethBridgeProcessing ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
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
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: 'var(--button-gradient)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: 'var(--button-shadow)',
            cursor: 'pointer'
          }}
        />
      )}

      {/* Add keyframes for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
