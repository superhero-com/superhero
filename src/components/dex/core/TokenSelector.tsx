import React, { useState, useMemo } from 'react';
import { Token } from '../types/dex';

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
  };

  return (
    <div>
      {label && <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{label}</div>}
      
      <div style={{ display: 'flex', gap: 6 }}>
        {onSearchChange && (
          <input
            aria-label="search-token"
            placeholder="Search token"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ 
              width: 160, 
              padding: '6px 8px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              fontSize: '12px'
            }}
          />
        )}
        
        <select
          value={selected?.contractId || ''}
          onChange={(e) => {
            const next = tokens.find((t) => t.contractId === (e.target.value || '')) || null;
            if (next) onSelect(next);
          }}
          disabled={disabled || loading}
          style={{ 
            flex: '0 0 160px', 
            padding: '8px 10px', 
            borderRadius: 8, 
            background: '#1a1a23', 
            color: 'white', 
            border: '1px solid #3a3a4a',
            fontSize: '14px'
          }}
        >
          {filteredTokens.map((token) => (
            <option key={token.contractId} value={token.contractId}>
              #{token.symbol}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div 
          role="dialog" 
          aria-label="token-selector" 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.6)', 
            display: 'grid', 
            placeItems: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ 
            background: '#14141c', 
            color: 'white', 
            border: '1px solid #3a3a4a', 
            borderRadius: 10, 
            padding: 12, 
            width: 420, 
            maxHeight: '80vh', 
            overflowY: 'auto' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Select token</div>
              <button 
                onClick={() => setOpen(false)} 
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: 6,
                  background: '#2a2a39',
                  border: '1px solid #3a3a4a',
                  color: 'white'
                }}
              >
                Close
              </button>
            </div>
            
            <input 
              placeholder="Search symbol or address" 
              value={searchValue} 
              onChange={(e) => onSearchChange?.(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: 8, 
                background: '#1a1a23', 
                color: 'white', 
                border: '1px solid #3a3a4a', 
                marginBottom: 8,
                fontSize: '14px'
              }} 
            />
            
            <div style={{ display: 'grid', gap: 6 }}>
              {filteredTokens.map((token) => (
                <button 
                  key={token.contractId} 
                  onClick={() => handleSelect(token)} 
                  style={{ 
                    textAlign: 'left', 
                    padding: '8px 10px', 
                    borderRadius: 8, 
                    border: '1px solid #3a3a4a', 
                    background: '#2a2a39', 
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#3a3a4a'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#2a2a39'}
                >
                  <div style={{ fontWeight: 600 }}>#{token.symbol}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{token.contractId}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
