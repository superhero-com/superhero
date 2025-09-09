import React, { useEffect, useMemo, useState } from 'react';
import { DEX_ADDRESSES } from '../../libs/dex';
import MobileDexCard from './MobileDexCard';
import './MobileTokenSelector.scss';

type TokenItem = { 
  address: string; 
  symbol: string; 
  decimals: number; 
  is_ae?: boolean;
  logo?: string;
};

type Props = {
  label?: string;
  selected?: string; // address or 'AE'
  onSelect: (addr: string, info: TokenItem) => void;
  exclude?: string[]; // addresses to exclude
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
};

export default function MobileTokenSelector({ 
  label, 
  selected, 
  onSelect, 
  exclude = [], 
  disabled = false,
  loading = false,
  placeholder = 'Select token'
}: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<TokenItem[]>([]);
  const [search, setSearch] = useState('');
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setTokensLoading(true);
        const { getListedTokens } = await import('../../libs/dexBackend');
        const tokens = await getListedTokens();
        const base: TokenItem[] = [
          { address: 'AE', symbol: 'AE', decimals: 18, is_ae: true },
          { address: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
          ...((tokens || []).map((t: any) => ({ 
            address: t.address, 
            symbol: t.symbol || t.name || 'TKN', 
            decimals: Number(t.decimals || 18),
            logo: t.logo
          }))),
        ];
        const unique = new Map<string, TokenItem>();
        for (const t of base) { 
          if (!unique.has(t.address)) unique.set(t.address, t); 
        }
        const filtered = Array.from(unique.values()).filter((t) => !exclude.includes(t.address));
        setList(filtered);
      } catch (error) {
        console.warn('Failed to load tokens, using defaults', error);
        setList([
          { address: 'AE', symbol: 'AE', decimals: 18, is_ae: true },
          { address: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
        ]);
      } finally {
        setTokensLoading(false);
      }
    })();
  }, [exclude.join('|')]);

  const selectedToken = useMemo(() => {
    return list.find((t) => t.address === selected) || 
           (selected === 'AE' ? { symbol: 'AE', address: 'AE' } as TokenItem : null);
  }, [list, selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    
    return list.filter((t) => 
      t.symbol.toLowerCase().includes(term) || 
      t.address.toLowerCase().includes(term)
    );
  }, [search, list]);

  const handleSelect = (token: TokenItem) => {
    onSelect(token.address, token);
    setOpen(false);
    setSearch('');
  };

  const handleOpen = () => {
    if (!disabled && !loading) {
      setOpen(true);
    }
  };

  return (
    <div className="mobile-token-selector">
      {label && <label className="mobile-token-selector__label">{label}</label>}
      
      <button 
        className={`mobile-token-selector__button ${disabled ? 'mobile-token-selector__button--disabled' : ''} ${loading ? 'mobile-token-selector__button--loading' : ''}`}
        onClick={handleOpen}
        disabled={disabled || loading}
        type="button"
      >
        {loading ? (
          <div className="mobile-token-selector__loading">
            <div className="skeleton-line skeleton-line--short"></div>
          </div>
        ) : selectedToken ? (
          <div className="mobile-token-selector__selected">
            {selectedToken.logo && (
              <img 
                src={selectedToken.logo} 
                alt={selectedToken.symbol}
                className="mobile-token-selector__logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="mobile-token-selector__symbol">{selectedToken.symbol}</span>
          </div>
        ) : (
          <span className="mobile-token-selector__placeholder">{placeholder}</span>
        )}
        <svg className="mobile-token-selector__arrow" viewBox="0 0 24 24" fill="none">
          <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mobile-token-selector__modal">
          <div className="mobile-token-selector__overlay" onClick={() => setOpen(false)} />
          <div className="mobile-token-selector__content">
            <div className="mobile-token-selector__header">
              <h3 className="mobile-token-selector__title">Select Token</h3>
              <button 
                className="mobile-token-selector__close"
                onClick={() => setOpen(false)}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="mobile-token-selector__search">
              <input
                type="text"
                placeholder="Search by name or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mobile-token-selector__search-input"
                autoFocus
              />
            </div>

            <div className="mobile-token-selector__list">
              {tokensLoading ? (
                <div className="mobile-token-selector__loading-list">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mobile-token-selector__skeleton-item">
                      <div className="skeleton-line skeleton-line--short"></div>
                      <div className="skeleton-line skeleton-line--medium"></div>
                    </div>
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((token) => (
                  <button
                    key={token.address}
                    className={`mobile-token-selector__item ${selected === token.address ? 'mobile-token-selector__item--selected' : ''}`}
                    onClick={() => handleSelect(token)}
                    type="button"
                  >
                    <div className="mobile-token-selector__item-content">
                      {token.logo && (
                        <img 
                          src={token.logo} 
                          alt={token.symbol}
                          className="mobile-token-selector__item-logo"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="mobile-token-selector__item-info">
                        <div className="mobile-token-selector__item-symbol">{token.symbol}</div>
                        <div className="mobile-token-selector__item-address">{token.address}</div>
                      </div>
                    </div>
                    {selected === token.address && (
                      <svg className="mobile-token-selector__check" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="mobile-token-selector__empty">
                  <p>No tokens found</p>
                  <p className="mobile-token-selector__empty-subtitle">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
