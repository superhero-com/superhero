import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Token } from '../types/dex';
import { useAccount } from '../../../hooks/useAccount';
import { Decimal } from '../../../libs/decimal';
import { toAe } from '@aeternity/aepp-sdk';

interface TokenSelectorProps {
  label?: string;
  selected?: Token | null;
  onSelect: (token: Token) => void;
  exclude?: Token[];
  disabled?: boolean;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  tokens: Token[];
}

export default function TokenSelector({
  label,
  selected,
  onSelect,
  exclude = [],
  disabled = false,
  loading = false,
  searchValue = '',
  onSearchChange,
  tokens
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const { aex9Balances, balance } = useAccount();

  const selectedLabel = selected?.symbol ? `#${selected.symbol}` : 'Select token';

  const filteredTokens = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    const excludeIds = exclude.map(t => t.contractId);

    return tokens.filter((token) => {
      const matchesSearch = !term ||
        token.symbol.toLowerCase().includes(term) ||
        (token.contractId || '').toLowerCase().includes(term);
      const notExcluded = !excludeIds.includes(token.contractId);
      return matchesSearch && notExcluded;
    });
  }, [tokens, searchValue, exclude]);

  const handleSelect = (token: Token) => {
    onSelect(token);
    setOpen(false);
    setCustomAddress('');
    // Clear search when closing
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleAddCustomToken = () => {
    if (!customAddress.trim()) return;

    // Create a custom token object - you may need to adjust this based on your Token type
    const customToken: Token = {
      contractId: customAddress.trim(),
      symbol: 'CUSTOM', // You might want to fetch this from the blockchain
      decimals: 18, // Default decimals, might want to fetch this too
      isAe: false
    };

    onSelect(customToken);
    setOpen(false);
    setCustomAddress('');
  };

  const isValidAddress = (address: string) => {
    // Basic validation - you might want to make this more robust
    return address.trim().length > 10 && address.includes('_') || address.startsWith('ak_') || address.startsWith('ct_');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div>
        {label && (
          <div style={{
            fontSize: 12,
            color: 'var(--light-font-color)',
            fontWeight: 600,
            marginBottom: 6,
            textTransform: 'none',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Dialog.Trigger asChild>
            <button
              disabled={disabled || loading}
              onClick={() => {
                // Clear search when opening dialog
                if (onSearchChange) {
                  onSearchChange('');
                }
                setCustomAddress('');
              }}
              style={{
                minWidth: 120,
                padding: '10px 16px',
                borderRadius: 12,
                background: selected ? 'var(--button-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: 'var(--standard-font-color)',
                border: '1px solid var(--glass-border)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textTransform: 'none'
              }}
              onMouseOver={(e) => {
                if (!disabled && !loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <div style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid var(--standard-font-color)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}></div>
              ) : (
                <>
                  {selected ? `${selected.symbol}` : 'Select Token'}
                  <span style={{ opacity: 0.7 }}>▼</span>
                </>
              )}
            </button>
          </Dialog.Trigger>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(12px)',
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
            borderRadius: 24,
            padding: 24,
            width: 520,
            maxWidth: '90vw',
            maxHeight: '85vh',
            overflowY: 'auto',
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
            marginBottom: 20
          }}>
            <Dialog.Title style={{
              fontWeight: 700,
              fontSize: 20,
              margin: 0,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Select a token
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

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              placeholder="Search by token or paste address"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '14px 50px 14px 16px',
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--standard-font-color)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '15px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--light-font-color)',
              fontSize: 18
            }}>
              🔍
            </div>
          </div>

          {/* Popular Tokens */}
          {!searchValue && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--light-font-color)',
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Popular tokens
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: 12,
                marginBottom: 20
              }}>
                {tokens.slice(0, 4).map((token) => (
                  <button
                    key={token.contractId}
                    onClick={() => handleSelect(token)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--standard-font-color)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Token Input */}
          {searchValue && isValidAddress(searchValue) && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              background: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.3)',
              borderRadius: 16
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--accent-color)',
                marginBottom: 8
              }}>
                Add Custom Token
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                marginBottom: 12
              }}>
                Address: {searchValue}
              </div>
              <button
                onClick={() => {
                  const customToken: Token = {
                    contractId: searchValue.trim(),
                    symbol: 'CUSTOM',
                    decimals: 18,
                    isAe: false
                  };
                  handleSelect(customToken);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: 'var(--accent-color)',
                  border: 'none',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Add Token
              </button>
            </div>
          )}

          {/* Section Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-font-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Token
            </span>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-font-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Balance/Address
            </span>
          </div>

          {/* Token List */}
          <div style={{
            display: 'grid',
            gap: 6,
            maxHeight: '350px',
            overflowY: 'auto',
            paddingRight: 4
          }}>
            {filteredTokens.map((token) => (
              <button
                key={token.contractId}
                onClick={() => handleSelect(token)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--standard-font-color)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(78, 205, 196, 0.15)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 2,
                    color: 'var(--standard-font-color)',
                    textTransform: 'none',
                  }}>
                    {token.symbol}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    opacity: 0.8
                  }}>
                    {token.isAe ? 'Native Token' : 'Token'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2
                  }}>
                    {
                      token.isAe ?
                        Decimal.from(toAe(balance)).prettify() :
                        Decimal.from(aex9Balances.find(b => b.contract_id === token.contractId)?.amount || 0).div(10 ** token.decimals).prettify()
                    }
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'var(--light-font-color)',
                    fontFamily: 'monospace',
                    opacity: 0.6,
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {token.contractId.length > 15
                      ? `${token.contractId.slice(0, 6)}...${token.contractId.slice(-6)}`
                      : token.contractId
                    }
                  </div>
                </div>
              </button>
            ))}

            {filteredTokens.length === 0 && !searchValue && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--light-font-color)',
                fontSize: 14
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🪙</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No tokens available</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Try adding a custom token by address</div>
              </div>
            )}

            {filteredTokens.length === 0 && searchValue && !isValidAddress(searchValue) && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--light-font-color)',
                fontSize: 14
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No tokens found</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Can't find the token you're looking for? Try entering the mint address or check token list settings below.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <button
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--standard-font-color)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View Token List
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Add keyframes for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
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
