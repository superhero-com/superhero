import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDex } from '../../../hooks';

interface LiquiditySettingsProps {
  children: React.ReactNode;
}

export default function LiquiditySettings({ children }: LiquiditySettingsProps) {
  const { slippagePct, deadlineMins, setSlippagePct, setDeadlineMins } = useDex();
  const [open, setOpen] = useState(false);
  const [tempSlippage, setTempSlippage] = useState(slippagePct.toString());
  const [tempDeadline, setTempDeadline] = useState(deadlineMins.toString());

  const handleSave = () => {
    const newSlippage = parseFloat(tempSlippage);
    const newDeadline = parseInt(tempDeadline);
    
    if (!isNaN(newSlippage) && newSlippage > 0 && newSlippage <= 50) {
      setSlippagePct(newSlippage);
    }
    
    if (!isNaN(newDeadline) && newDeadline > 0 && newDeadline <= 180) {
      setDeadlineMins(newDeadline);
    }
    
    setOpen(false);
  };

  const handleCancel = () => {
    setTempSlippage(slippagePct.toString());
    setTempDeadline(deadlineMins.toString());
    setOpen(false);
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
            zIndex: 1000
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
            border: '1px solid var(--glass-border)',
            borderRadius: 20,
            padding: 24,
            width: 400,
            maxWidth: '90vw',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
            zIndex: 1001,
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
              color: 'var(--standard-font-color)'
            }}>
              Liquidity Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <button 
                style={{ 
                  padding: '6px 10px', 
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--standard-font-color)',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Slippage Setting */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-font-color)',
              marginBottom: 8
            }}>
              Slippage Tolerance
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[0.1, 0.5, 1.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTempSlippage(preset.toString())}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: tempSlippage === preset.toString() ? 
                      'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--standard-font-color)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {preset}%
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={tempSlippage}
                onChange={(e) => setTempSlippage(e.target.value)}
                placeholder="0.50"
                step="0.01"
                min="0.01"
                max="50"
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--standard-font-color)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--light-font-color)',
                fontSize: 14
              }}>
                %
              </span>
            </div>
          </div>

          {/* Deadline Setting */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-font-color)',
              marginBottom: 8
            }}>
              Transaction Deadline
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={tempDeadline}
                onChange={(e) => setTempDeadline(e.target.value)}
                placeholder="20"
                min="1"
                max="180"
                style={{
                  width: '100%',
                  padding: '12px 60px 12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--standard-font-color)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--light-font-color)',
                fontSize: 14
              }}>
                minutes
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--standard-font-color)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--button-gradient)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
