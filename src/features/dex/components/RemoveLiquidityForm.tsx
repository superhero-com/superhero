import { toAe } from '@aeternity/aepp-sdk';
import { useEffect, useState } from 'react';
import AddressChip from '../../../components/AddressChip';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { useTokenList } from '../../../components/dex/hooks/useTokenList';
import { useAccount, useDex } from '../../../hooks';
import { Decimal } from '../../../libs/decimal';
import { usePool } from '../context/PoolProvider';
import { useAddLiquidity } from '../hooks/useAddLiquidity';

export default function RemoveLiquidityForm() {
  const { selectedPosition, clearSelection, onPositionUpdated } = usePool();
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const { tokens } = useTokenList();
  const { executeRemoveLiquidity } = useAddLiquidity();
  
  const [percentage, setPercentage] = useState<number>(25);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  // Reset form when position changes
  useEffect(() => {
    setPercentage(25);
    setShowConfirm(false);
    setCustomAmount('');
    setUseCustomAmount(false);
  }, [selectedPosition]);

  // Find token info for display
  const findToken = (identifier: string) => {
    if (!identifier || !tokens.length) return null;
    return tokens.find(t => 
      t.symbol.toLowerCase() === identifier.toLowerCase() ||
      t.address === identifier ||
      (identifier.toLowerCase() === 'ae' && t.is_ae)
    );
  };

  const tokenA = findToken(selectedPosition?.token0 || '');
  const tokenB = findToken(selectedPosition?.token1 || '');

  if (!selectedPosition) {
    return (
      <div className="genz-card" style={{
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 32,
        boxShadow: 'var(--glass-shadow)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          fontSize: 24
        }}>
          💧
        </div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--standard-font-color)',
          margin: '0 0 8px 0'
        }}>
          Select a Position
        </h3>
        <p style={{
          fontSize: 14,
          color: 'var(--light-font-color)',
          margin: 0
        }}>
          Choose a liquidity position from the list to remove liquidity
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="genz-card" style={{
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 32,
        boxShadow: 'var(--glass-shadow)',
        textAlign: 'center'
      }}>
        <ConnectWalletButton />
      </div>
    );
  }

  const handleRemove = async () => {
    if (!address || !selectedPosition) return;
    
    setLoading(true);
    try {
      const liquidityToRemove = useCustomAmount ? customAmount : removeAmount.toString();
      
      // Determine if this is an AE pair
      const isAePair = selectedPosition.token0 === 'AE' || selectedPosition.token1 === 'AE';
      
      // Execute remove liquidity
      const txHash = await executeRemoveLiquidity({
        tokenA: selectedPosition.token0,
        tokenB: selectedPosition.token1,
        liquidity: liquidityToRemove,
        slippagePct,
        deadlineMins,
        isAePair
      });
      
      if (txHash) {
        setLoading(false);
        setShowConfirm(false);
        clearSelection();
        
        // Refresh positions after successful transaction
        await onPositionUpdated();
      }
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      setLoading(false);
    }
  };

  const lpAmount = selectedPosition.balance ? Decimal.from(toAe(selectedPosition.balance)) : Decimal.from('0');
  const removeAmount = useCustomAmount 
    ? Decimal.from(customAmount || '0')
    : percentage === 100 
      ? lpAmount  // Use exact balance for 100% to avoid precision loss
      : lpAmount.mul(percentage).div(100);
  
  const estimatedValueUsd = selectedPosition.valueUsd 
    ? Decimal.from(selectedPosition.valueUsd).mul(useCustomAmount 
        ? (Number(customAmount) / Number(lpAmount.toString())) * 100 
        : percentage).div(100)
    : null;

  const percentageButtons = [25, 50, 75, 100];

  if (showConfirm) {
    return (
      <div className="genz-card" style={{
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 24,
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>
              💧
            </div>
            <div>
              <h2 style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                margin: 0,
                background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Confirm Removal
              </h2>
              <p style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                margin: '2px 0 0 0'
              }}>
                Review your transaction
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--light-font-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--accent-color)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--light-font-color)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Transaction Details */}
        <div style={{
          padding: 20,
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 16,
          border: '1px solid var(--glass-border)',
          marginBottom: 24
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <span style={{ fontSize: 14, color: 'var(--light-font-color)' }}>
                Removing from Pool
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AddressChip address={selectedPosition.token0} hideAvatar />
              <span style={{ color: 'var(--light-font-color)', fontSize: 12 }}>+</span>
              <AddressChip address={selectedPosition.token1} hideAvatar />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            padding: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
                LP Tokens to Remove
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--standard-font-color)' }}>
                {removeAmount.prettify()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
                Percentage
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-color)' }}>
                {useCustomAmount 
                  ? `${((Number(customAmount) / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                  : `${percentage}%`
                }
              </div>
            </div>
          </div>

          {estimatedValueUsd && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))',
              borderRadius: 8,
              border: '1px solid rgba(76, 175, 80, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 2 }}>
                Estimated Value
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-color)' }}>
                ${estimatedValueUsd.prettify()}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowConfirm(false)}
            style={{
              flex: 1,
              padding: '16px 24px',
              borderRadius: 16,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--standard-font-color)',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            style={{
              flex: 2,
              padding: '16px 24px',
              borderRadius: 16,
              border: 'none',
              background: loading 
                ? 'var(--glass-bg)' 
                : 'linear-gradient(135deg, #ff6b6b, #feca57)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: loading ? 'none' : '0 8px 32px rgba(255, 107, 107, 0.3)',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 107, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.3)';
              }
            }}
          >
            {loading ? '⏳ Removing...' : '🔥 Remove Liquidity'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="genz-card" style={{
      maxWidth: 480,
      margin: '0 auto',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      padding: 24,
      boxShadow: 'var(--glass-shadow)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}>
            💧
          </div>
          <div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              margin: 0,
              background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Remove Liquidity
            </h2>
            <p style={{
              fontSize: 12,
              color: 'var(--light-font-color)',
              margin: '2px 0 0 0'
            }}>
              Remove tokens from pool
            </p>
          </div>
        </div>
        <button
          onClick={clearSelection}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--light-font-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--accent-color)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--glass-bg)';
            e.currentTarget.style.color = 'var(--light-font-color)';
          }}
        >
          ✕
        </button>
      </div>

      {/* Selected Position Info */}
      <div style={{
        padding: 16,
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        border: '1px solid var(--glass-border)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <span style={{ fontSize: 14, color: 'var(--light-font-color)' }}>
            Position
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AddressChip address={selectedPosition.token0} hideAvatar />
            <span style={{ color: 'var(--light-font-color)', fontSize: 12 }}>+</span>
            <AddressChip address={selectedPosition.token1} hideAvatar />
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          fontSize: 12
        }}>
          <div>
            <div style={{ color: 'var(--light-font-color)', marginBottom: 2 }}>
              LP Balance
            </div>
            <div style={{ color: 'var(--standard-font-color)', fontWeight: 600 }}>
              {lpAmount.prettify()}
            </div>
          </div>
          {selectedPosition.valueUsd && (
            <div>
              <div style={{ color: 'var(--light-font-color)', marginBottom: 2 }}>
                Total Value
              </div>
              <div style={{ color: 'var(--success-color)', fontWeight: 600 }}>
                ${Decimal.from(selectedPosition.valueUsd).prettify()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amount Selection */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <label style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--standard-font-color)'
          }}>
            Amount to Remove
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setUseCustomAmount(false)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: useCustomAmount ? '1px solid var(--glass-border)' : '1px solid var(--accent-color)',
                background: useCustomAmount ? 'var(--glass-bg)' : 'var(--accent-color)',
                color: useCustomAmount ? 'var(--light-font-color)' : 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              %
            </button>
            <button
              onClick={() => setUseCustomAmount(true)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: !useCustomAmount ? '1px solid var(--glass-border)' : '1px solid var(--accent-color)',
                background: !useCustomAmount ? 'var(--glass-bg)' : 'var(--accent-color)',
                color: !useCustomAmount ? 'var(--light-font-color)' : 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              LP
            </button>
          </div>
        </div>

        {!useCustomAmount ? (
          <>
            {/* Percentage Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16
            }}>
              {percentageButtons.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPercentage(pct)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 12,
                    border: percentage === pct ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)',
                    background: percentage === pct ? 'var(--accent-color)' : 'var(--glass-bg)',
                    color: percentage === pct ? 'white' : 'var(--standard-font-color)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseOver={(e) => {
                    if (percentage !== pct) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (percentage !== pct) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                    }
                  }}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Percentage Slider */}
            <div style={{
              padding: 16,
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 12,
              border: '1px solid var(--glass-border)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
                  Slide to adjust
                </span>
                <span style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--accent-color)'
                }}>
                  {percentage}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 3,
                  background: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--glass-border) ${percentage}%, var(--glass-border) 100%)`,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          </>
        ) : (
          /* Custom Amount Input */
          <div style={{
            padding: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
                LP Tokens to Remove
              </span>
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.0"
              max={lpAmount.toString()}
              style={{
                width: '100%',
                padding: '12px 0',
                border: 'none',
                background: 'transparent',
                color: 'var(--standard-font-color)',
                fontSize: 18,
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8
            }}>
              <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
                Max: {lpAmount.prettify()}
              </span>
              <button
                onClick={() => setCustomAmount(lpAmount.toString())}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--accent-color)',
                  background: 'transparent',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                MAX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Summary */}
      <div style={{
        padding: 16,
        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(254, 202, 87, 0.05))',
        borderRadius: 16,
        border: '1px solid rgba(255, 107, 107, 0.2)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: estimatedValueUsd ? 12 : 0
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
              LP Tokens to Remove
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--standard-font-color)' }}>
              {removeAmount.prettify()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
              Percentage
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-color)' }}>
              {useCustomAmount 
                ? `${((Number(customAmount || '0') / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                : `${percentage}%`
              }
            </div>
          </div>
        </div>

        {estimatedValueUsd && (
          <div style={{
            textAlign: 'center',
            padding: 12,
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 2 }}>
              Estimated Value
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success-color)' }}>
              ${estimatedValueUsd.prettify()}
            </div>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 16,
          border: 'none',
          background: removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'var(--glass-bg)' 
            : 'linear-gradient(135deg, #ff6b6b, #feca57)',
          color: removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'var(--light-font-color)'
            : 'white',
          cursor: removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'not-allowed' 
            : 'pointer',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          boxShadow: removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'none'
            : '0 8px 32px rgba(255, 107, 107, 0.3)',
          transition: 'all 0.3s ease',
          opacity: removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0)) ? 0.5 : 1
        }}
        onMouseOver={(e) => {
          if (removeAmount.gt(0) && (!useCustomAmount || (customAmount && Number(customAmount) > 0))) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 107, 0.4)';
          }
        }}
        onMouseOut={(e) => {
          if (removeAmount.gt(0) && (!useCustomAmount || (customAmount && Number(customAmount) > 0))) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.3)';
          }
        }}
      >
        💧 Remove {useCustomAmount 
          ? `${((Number(customAmount || '0') / Number(lpAmount.toString())) * 100).toFixed(1)}%`
          : `${percentage}%`
        } Liquidity
      </button>
    </div>
  );
}