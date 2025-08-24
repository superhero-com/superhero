import React from 'react';
import TokenSelector from './TokenSelector';
import { Token } from '../types/dex';

interface TokenInputProps {
  label: string;
  token: Token | null;
  amount: string;
  balance?: string;
  onTokenChange: (token: Token) => void;
  onAmountChange: (amount: string) => void;
  tokens: Token[];
  excludeTokens?: Token[];
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export default function TokenInput({
  label,
  token,
  amount,
  balance,
  onTokenChange,
  onAmountChange,
  tokens,
  excludeTokens = [],
  disabled = false,
  loading = false,
  readOnly = false,
  placeholder = "0.0",
  searchValue = "",
  onSearchChange
}: TokenInputProps) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '.');
    const decs = token?.decimals ?? 18;
    const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
    if (!m) return; // block invalid chars
    const frac = m[1] || '';
    const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
    if (trimmed.startsWith('.')) return; // disallow leading dot
    onAmountChange(trimmed);
  };

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: 16,
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease'
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
          {label}
        </label>
        {balance && (
          <div style={{ 
            fontSize: 12, 
            color: 'var(--light-font-color)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 8px',
            borderRadius: 8,
            border: '1px solid var(--glass-border)'
          }}>
            Balance: <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>{balance}</span>
          </div>
        )}
      </div>

      {/* Main Input Row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Amount Input */}
        <div style={{ 
          flex: 1,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--glass-border)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.3s ease'
        }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={amount}
            onChange={handleAmountChange}
            readOnly={readOnly}
            disabled={disabled}
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--standard-font-color)',
              outline: 'none',
              fontSize: '18px',
              fontWeight: 600,
              fontFamily: 'monospace'
            }}
            aria-label={`amount-${label.toLowerCase()}`}
            onFocus={(e) => {
              e.currentTarget.parentElement.style.borderColor = 'var(--accent-color)';
              e.currentTarget.parentElement.style.boxShadow = '0 0 0 2px rgba(78, 205, 196, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.parentElement.style.borderColor = 'var(--glass-border)';
              e.currentTarget.parentElement.style.boxShadow = 'none';
            }}
          />
          {token && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              marginLeft: 8
            }}>
              <span style={{ 
                color: 'var(--standard-font-color)', 
                fontSize: '14px', 
                fontWeight: 700
              }}>
                {token.symbol}
              </span>
            </div>
          )}
        </div>

        {/* Token Selector */}
        <div style={{ flexShrink: 0 }}>
          <TokenSelector
            selected={token}
            onSelect={onTokenChange}
            exclude={excludeTokens}
            disabled={disabled}
            loading={loading}
            tokens={tokens}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
          />
        </div>
      </div>
    </div>
  );
}
