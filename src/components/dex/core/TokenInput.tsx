import React from 'react';
import TokenSelector from './TokenSelector';
import { DexTokenDto } from '../../../api/generated';
import { Decimal } from '../../../libs/decimal';

interface TokenInputProps {
  label: string;
  token: DexTokenDto | null;
  amount: string;
  balance?: string;
  onTokenChange: (token: DexTokenDto) => void;
  onAmountChange: (amount: string) => void;
  tokens: DexTokenDto[];
  excludeTokens?: DexTokenDto[];
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
                {Decimal.from(balance).prettify()}
              </span>
            </div>
            
            {/* Max, 50% buttons */}
            <div style={{ 
              display: 'flex', 
              gap: 6, 
              alignItems: 'center'
            }}>
              <button
                onClick={() => {
                  if (balance && !disabled && !readOnly) {
                    const halfBalance = Decimal.from(balance).div(2).toString();
                    onAmountChange(halfBalance);
                  }
                }}
                disabled={disabled || readOnly || !balance || Number(balance) === 0}
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--light-font-color)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: disabled || readOnly || !balance ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: disabled || readOnly || !balance ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!disabled && !readOnly && balance && Number(balance) > 0) {
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
                onClick={() => {
                  if (balance && !disabled && !readOnly) {
                    onAmountChange(balance);
                  }
                }}
                disabled={disabled || readOnly || !balance || Number(balance) === 0}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--light-font-color)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: disabled || readOnly || !balance ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: disabled || readOnly || !balance ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!disabled && !readOnly && balance && Number(balance) > 0) {
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
