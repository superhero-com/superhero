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
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.85 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'grid', gap: 6 }}>
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
        
        <div style={{ 
          flex: 1, 
          padding: '8px 10px', 
          borderRadius: 8, 
          background: '#1a1a23', 
          color: 'white', 
          border: '1px solid #3a3a4a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
              color: 'white',
              outline: 'none',
              fontSize: '14px'
            }}
            aria-label={`amount-${label.toLowerCase()}`}
          />
          {token && (
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
              {token.symbol}
            </span>
          )}
        </div>
        
        {balance && (
          <div style={{ alignSelf: 'center', fontSize: 12, opacity: 0.8 }}>
            Balance: {balance}
          </div>
        )}
      </div>
    </div>
  );
}
