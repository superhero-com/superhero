import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useDex } from '../../../hooks';

interface DexSettingsProps {
  children: React.ReactNode;
  title?: string;
}

export default function DexSettings({ children, title = 'DEX Settings' }: DexSettingsProps) {
  const { slippagePct, deadlineMins, setSlippage, setDeadline } = useDex();
  const [open, setOpen] = useState(false);
  const [tempSlippage, setTempSlippage] = useState(slippagePct.toString());
  const [tempDeadline, setTempDeadline] = useState(deadlineMins.toString());

  const handleSave = () => {
    const newSlippage = parseFloat(tempSlippage);
    const newDeadline = parseInt(tempDeadline);
    
    if (!isNaN(newSlippage) && newSlippage > 0 && newSlippage <= 50) {
      setSlippage(newSlippage);
    }
    
    if (!isNaN(newDeadline) && newDeadline > 0 && newDeadline <= 180) {
      setDeadline(newDeadline);
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
              {title}
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
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              marginBottom: 8
            }}>
              Slippage Tolerance
            </label>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8
            }}>
              {[0.1, 0.5, 1.0].map(preset => (
                <button
                  key={preset}
                  onClick={() => setTempSlippage(preset.toString())}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: tempSlippage === preset.toString() ? 
                      '1px solid var(--accent-color)' : 
                      '1px solid rgba(255, 255, 255, 0.1)',
                    background: tempSlippage === preset.toString() ? 
                      'rgba(255, 107, 107, 0.2)' : 
                      'rgba(255, 255, 255, 0.05)',
                    color: 'var(--standard-font-color)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {preset}%
                </button>
              ))}
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <input
                  type="number"
                  value={tempSlippage}
                  onChange={(e) => setTempSlippage(e.target.value)}
                  placeholder="Custom"
                  min="0.1"
                  max="50"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--standard-font-color)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'var(--light-font-color)',
                  pointerEvents: 'none'
                }}>
                  %
                </span>
              </div>
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              opacity: 0.8
            }}>
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </div>
          </div>

          {/* Transaction Deadline */}
          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              marginBottom: 8
            }}>
              Transaction Deadline
            </label>
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8
            }}>
              {[10, 20, 30].map(preset => (
                <button
                  key={preset}
                  onClick={() => setTempDeadline(preset.toString())}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: tempDeadline === preset.toString() ? 
                      '1px solid var(--accent-color)' : 
                      '1px solid rgba(255, 255, 255, 0.1)',
                    background: tempDeadline === preset.toString() ? 
                      'rgba(255, 107, 107, 0.2)' : 
                      'rgba(255, 255, 255, 0.05)',
                    color: 'var(--standard-font-color)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {preset}m
                </button>
              ))}
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <input
                  type="number"
                  value={tempDeadline}
                  onChange={(e) => setTempDeadline(e.target.value)}
                  placeholder="Custom"
                  min="1"
                  max="180"
                  step="1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--standard-font-color)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'var(--light-font-color)',
                  pointerEvents: 'none'
                }}>
                  min
                </span>
              </div>
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              opacity: 0.8
            }}>
              Your transaction will be cancelled if it's pending for more than this long.
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
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
                fontWeight: 700,
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
