import React, { useState, useEffect } from 'react';
import { useTokenBalances } from '../../components/dex/hooks/useTokenBalances';
import { DEX_ADDRESSES, fromAettos } from '../../libs/dex';
import { errorToUserMessage } from '../../libs/errorMessages';
import { useAccount, useAeSdk } from '../../hooks';
import { Decimal } from '../../libs/decimal';
import ConnectWalletButton from '../../components/ConnectWalletButton';
import waeACI from 'dex-contracts-v2/build/WAE.aci.json';

interface WrapUnwrapWidgetProps {
  className?: string;
  style?: React.CSSProperties;
}

export function WrapUnwrapWidget({ className, style }: WrapUnwrapWidgetProps) {
  const { sdk } = useAeSdk();
  const { activeAccount } = useAccount();
  const { wrapBalances, refreshWrapBalances } = useTokenBalances(null, null);
  
  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [unwrapAmount, setUnwrapAmount] = useState<string>('');
  const [wrapping, setWrapping] = useState(false);
  const [unwrapping, setUnwrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');

  const isLoading = wrapping || unwrapping;
  const currentAmount = mode === 'wrap' ? wrapAmount : unwrapAmount;
  const setCurrentAmount = mode === 'wrap' ? setWrapAmount : setUnwrapAmount;
  const currentBalance = mode === 'wrap' ? wrapBalances.ae : wrapBalances.wae;

  // Reset error when switching modes or changing amounts
  useEffect(() => {
    setError(null);
  }, [mode, currentAmount]);

  const handleAmountChange = (value: string) => {
    const raw = value.replace(/,/g, '.');
    const match = raw.match(/^\d*(?:\.(\d*)?)?$/);
    if (!match) return; // block invalid chars
    const frac = match[1] || '';
    const trimmed = frac.length > 18 ? `${raw.split('.')[0]}.${frac.slice(0, 18)}` : raw;
    if (trimmed.startsWith('.')) return; // disallow leading dot
    setCurrentAmount(trimmed);
  };

  const handleMaxClick = () => {
    if (currentBalance && !isLoading) {
      setCurrentAmount(currentBalance);
    }
  };

  const handleHalfClick = () => {
    if (currentBalance && !isLoading) {
      const halfBalance = Decimal.from(currentBalance).div(2).toString();
      setCurrentAmount(halfBalance);
    }
  };

  async function wrapAeToWae(amountAe: string) {
    try {
      setWrapping(true);
      setError(null);
      const wae = await sdk.initializeContract({
        aci: waeACI,
        address: DEX_ADDRESSES.wae as `ct_${string}`
      });
      const aettos = Decimal.from(amountAe).bigNumber;
      await wae.deposit({ amount: aettos });
      setWrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'wrap' }));
    } finally {
      setWrapping(false);
    }
  }

  async function unwrapWaeToAe(amountWae: string) {
    try {
      setUnwrapping(true);
      setError(null);
      const wae = await sdk.initializeContract({ 
        aci: waeACI, 
        address: DEX_ADDRESSES.wae as `ct_${string}`
      });
      const aettos = Decimal.from(amountWae).bigNumber;
      await wae.withdraw(aettos, null);
      setUnwrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'unwrap' }));
    } finally {
      setUnwrapping(false);
    }
  }

  const handleExecute = async () => {
    if (!currentAmount || Number(currentAmount) <= 0) return;
    
    if (mode === 'wrap') {
      await wrapAeToWae(currentAmount);
    } else {
      await unwrapWaeToAe(currentAmount);
    }
  };

  const isExecuteDisabled = isLoading || !currentAmount || Number(currentAmount) <= 0;

  return (
    <div 
      className={`genz-card ${className || ''}`} 
      style={{
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 24,
        boxShadow: 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
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
          Wrap / Unwrap AE
        </h2>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--glass-border)',
          borderRadius: 12,
          padding: 4,
          backdropFilter: 'blur(10px)'
        }}>
          <button
            onClick={() => setMode('wrap')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'wrap' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'wrap' ? 'white' : 'var(--light-font-color)',
              fontSize: 12,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Wrap
          </button>
          <button
            onClick={() => setMode('unwrap')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: mode === 'unwrap' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'unwrap' ? 'white' : 'var(--light-font-color)',
              fontSize: 12,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Unwrap
          </button>
        </div>
      </div>

      {/* Balance Display */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
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
          gap: 16
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: 12,
              color: 'var(--light-font-color)',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              AE Balance
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              fontFamily: 'monospace'
            }}>
              {wrapBalances.ae ? Decimal.from(wrapBalances.ae).prettify() : '…'}
            </div>
          </div>
          
          <div style={{
            width: 2,
            height: 40,
            background: 'var(--glass-border)',
            borderRadius: 1
          }} />
          
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: 12,
              color: 'var(--light-font-color)',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              WAE Balance
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              fontFamily: 'monospace'
            }}>
              {wrapBalances.wae ? Decimal.from(wrapBalances.wae).prettify() : '…'}
            </div>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: 16,
        backdropFilter: 'blur(10px)',
        marginBottom: 20
      }}>
        {/* Label and Balance Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <label style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--light-font-color)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Amount to {mode}
          </label>
          
          {currentBalance && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--light-font-color)'
            }}>
              <div>
                Balance:
                <span style={{
                  fontWeight: 600,
                  color: 'var(--standard-font-color)',
                  fontSize: 12,
                  marginLeft: 8
                }}>
                  {Decimal.from(currentBalance).prettify()}
                </span>
              </div>
              
              {/* Balance buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleHalfClick}
                  disabled={isLoading || !currentBalance || Number(currentBalance) === 0}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--light-font-color)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: isLoading || !currentBalance ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isLoading || !currentBalance ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading && currentBalance && Number(currentBalance) > 0) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--light-font-color)';
                  }}
                >
                  50%
                </button>
                
                <button
                  onClick={handleMaxClick}
                  disabled={isLoading || !currentBalance || Number(currentBalance) === 0}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--light-font-color)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: isLoading || !currentBalance ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isLoading || !currentBalance ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading && currentBalance && Number(currentBalance) > 0) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--light-font-color)';
                  }}
                >
                  MAX
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--standard-font-color)',
            minWidth: 60
          }}>
            {mode === 'wrap' ? 'AE →' : 'WAE →'}
          </div>
          
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={currentAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--standard-font-color)',
              outline: 'none',
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'monospace',
              textAlign: 'right'
            }}
            aria-label={`${mode}-amount`}
          />
          
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--standard-font-color)',
            minWidth: 60,
            textAlign: 'right'
          }}>
            {mode === 'wrap' ? 'WAE' : 'AE'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
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
          {error}
        </div>
      )}

      {/* Execute Button */}
      {activeAccount ? (
        <button
          onClick={handleExecute}
          disabled={isExecuteDisabled}
          className="genz-btn"
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: isExecuteDisabled ?
              'rgba(255, 255, 255, 0.1)' :
              'var(--button-gradient)',
            color: 'white',
            cursor: isExecuteDisabled ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isExecuteDisabled ?
              'none' :
              'var(--button-shadow)',
            opacity: isExecuteDisabled ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              {mode === 'wrap' ? 'Wrapping…' : 'Unwrapping…'}
            </div>
          ) : (
            `${mode === 'wrap' ? 'Wrap AE → WAE' : 'Unwrap WAE → AE'}`
          )}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect Wallet to Wrap/Unwrap"
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

      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
