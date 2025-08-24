import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDex } from '../../../hooks';

interface SwapSettingsProps {
  children: React.ReactNode;
}

export default function SwapSettings({ children }: SwapSettingsProps) {
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
  const [open, setOpen] = useState(false);

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 50) {
      // Note: This would need to be added to the dex slice
      // setSlippage(value);
    }
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 60) {
      // Note: This would need to be added to the dex slice
      // setDeadline(value);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            animation: 'fadeIn 150ms ease-out'
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(20, 20, 28, 0.98)',
            color: 'var(--standard-font-color)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            padding: 24,
            width: 400,
            maxWidth: '90vw',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 8px 32px rgba(255, 107, 107, 0.2)',
            zIndex: 1001,
            animation: 'slideInFromTop 200ms ease-out',
            outline: 'none'
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 24
          }}>
            <Dialog.Title style={{ 
              fontWeight: 700, 
              fontSize: 18,
              margin: 0,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Swap Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <button 
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--standard-font-color)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--error-color)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Settings Content */}
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Slippage Tolerance */}
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ 
                fontSize: 14, 
                fontWeight: 600,
                color: 'var(--standard-font-color)'
              }}>
                Slippage Tolerance
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    value={slippagePct}
                    onChange={handleSlippageChange}
                    style={{ 
                      flex: 1,
                      background: 'transparent', 
                      border: 'none',
                      color: 'var(--standard-font-color)',
                      outline: 'none',
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  />
                  <span style={{ 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600
                  }}>
                    %
                  </span>
                </div>
              </div>
              <div style={{ 
                fontSize: 12, 
                color: 'var(--light-font-color)',
                opacity: 0.8
              }}>
                Your transaction will revert if the price changes unfavorably by more than this percentage.
              </div>
            </div>
            
            {/* Transaction Deadline */}
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ 
                fontSize: 14, 
                fontWeight: 600,
                color: 'var(--standard-font-color)'
              }}>
                Transaction Deadline
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    value={deadlineMins}
                    onChange={handleDeadlineChange}
                    style={{ 
                      flex: 1,
                      background: 'transparent', 
                      border: 'none',
                      color: 'var(--standard-font-color)',
                      outline: 'none',
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  />
                  <span style={{ 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600
                  }}>
                    minutes
                  </span>
                </div>
              </div>
              <div style={{ 
                fontSize: 12, 
                color: 'var(--light-font-color)',
                opacity: 0.8
              }}>
                Your transaction will revert if it is pending for more than this long.
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Add keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInFromTop {
          from { 
            opacity: 0;
            transform: translate(-50%, -60%) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </Dialog.Root>
  );
}
