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
            color: 'var(--light-font-color)'
          }}>
            Balance: <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>{balance}</span>
          </div>
        )}
      </div>

      {/* Main Input Row */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)',
        padding: '4px 0px 4px 12px',
        borderRadius: 12,
      }}>
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
        
        {/* Amount Input */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center'
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
              fontFamily: 'monospace',
              boxShadow: 'none',
              backdropFilter: 'none',
              textAlign: 'right'
            }}
            aria-label={`amount-${label.toLowerCase()}`}
          />
        </div>
      </div>
    </div>
  );
}
