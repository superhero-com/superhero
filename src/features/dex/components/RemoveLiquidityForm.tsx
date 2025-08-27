import React, { useState, useEffect } from 'react';
import { usePool } from '../context/PoolProvider';
import { useAccount, useDex } from '../../../hooks';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { Decimal } from '../../../libs/decimal';
import { toAe } from '@aeternity/aepp-sdk';

export default function RemoveLiquidityForm() {
  const { selectedPosition, clearSelection, onPositionUpdated } = usePool();
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  
  const [percentage, setPercentage] = useState<number>(25);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset form when position changes
  useEffect(() => {
    setPercentage(25);
    setShowConfirm(false);
  }, [selectedPosition]);

  if (!selectedPosition) {
    return (
      <div className="genz-card" style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 24,
        boxShadow: 'var(--glass-shadow)',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: 48, 
          marginBottom: 16,
          opacity: 0.3
        }}>
          ➖
        </div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--standard-font-color)',
          margin: '0 0 8px 0'
        }}>
          Remove Liquidity
        </h3>
        <p style={{
          fontSize: 14,
          color: 'var(--light-font-color)',
          margin: 0
        }}>
          Select a position to remove liquidity
        </p>
      </div>
    );
  }

  const handleRemove = async () => {
    if (!address || !selectedPosition) return;
    
    setLoading(true);
    try {
      // TODO: Implement remove liquidity logic
      console.log('Remove liquidity:', {
        position: selectedPosition,
        percentage,
        slippagePct,
        deadlineMins
      });
      
      // For now, just simulate success
      setTimeout(async () => {
        setLoading(false);
        setShowConfirm(false);
        clearSelection();
        
        // Refresh positions after successful transaction
        await onPositionUpdated();
      }, 2000);
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      setLoading(false);
    }
  };

  const lpAmount = selectedPosition.balance ? Decimal.from(toAe(selectedPosition.balance)) : Decimal.from('0');
  const removeAmount = lpAmount.mul(percentage).div(100);
  const estimatedValueUsd = selectedPosition.valueUsd 
    ? Decimal.from(selectedPosition.valueUsd).mul(percentage).div(100)
    : Decimal.from('0');

  return (
    <div className="genz-card" style={{
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
          Remove Liquidity
        </h2>

        <button
          onClick={clearSelection}
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            color: 'var(--standard-font-color)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            fontSize: 12,
            fontWeight: 500
          }}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Position Info */}
      <div style={{
        padding: 16,
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--glass-border)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <span style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: 'var(--standard-font-color)' 
          }}>
            {selectedPosition.token0} / {selectedPosition.token1}
          </span>
          {selectedPosition.valueUsd && (
            <span style={{ 
              fontSize: 14, 
              color: 'var(--success-color)',
              fontWeight: 600
            }}>
              ${Decimal.from(selectedPosition.valueUsd).prettify()}
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: 12, 
          color: 'var(--light-font-color)' 
        }}>
          LP Balance: {lpAmount.prettify()}
        </div>
      </div>

      {/* Percentage Selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <span style={{ 
            fontSize: 14, 
            fontWeight: 600, 
            color: 'var(--standard-font-color)' 
          }}>
            Amount to Remove
          </span>
          <span style={{ 
            fontSize: 14, 
            color: 'var(--light-font-color)' 
          }}>
            {percentage}%
          </span>
        </div>

        {/* Percentage Buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16
        }}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setPercentage(pct)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 12,
                border: `1px solid ${percentage === pct ? 'var(--accent-color)' : 'var(--glass-border)'}`,
                background: percentage === pct ? 'var(--accent-color)' : 'var(--glass-bg)',
                color: percentage === pct ? 'white' : 'var(--standard-font-color)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Custom Percentage Slider */}
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
            background: 'var(--glass-border)',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Preview */}
      <div style={{
        padding: 16,
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
            LP Tokens to Remove
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--standard-font-color)' }}>
            {removeAmount.prettify()}
          </span>
        </div>
        {estimatedValueUsd.gt(0) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
              Estimated Value
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success-color)' }}>
              ${estimatedValueUsd.prettify()}
            </span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || percentage <= 0}
          className="genz-btn"
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: loading || percentage <= 0 ?
              'rgba(255, 255, 255, 0.1)' :
              'linear-gradient(135deg, #ff6b6b, #ee5a52)',
            color: 'white',
            cursor: loading || percentage <= 0 ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: loading || percentage <= 0 ?
              'none' :
              '0 8px 24px rgba(255, 107, 107, 0.3)',
            opacity: loading || percentage <= 0 ? 0.6 : 1
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Removing...
            </div>
          ) : `Remove ${percentage}% Liquidity`}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect Wallet to Remove"
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

      {/* Confirmation Modal would go here */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 24,
            padding: 24,
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--standard-font-color)' }}>
              Confirm Remove Liquidity
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--light-font-color)' }}>
              Remove {percentage}% of your {selectedPosition.token0}/{selectedPosition.token1} liquidity?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--standard-font-color)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
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
