import { toAe } from '@aeternity/aepp-sdk';
import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { DexTokenDto } from '../../../api/generated';
import { useAccount } from '../../../hooks/useAccount';
import { Decimal } from '../../../libs/decimal';
import { DEX_ADDRESSES } from '../../../libs/dex';

interface TokenSelectorProps {
  label?: string;
  selected?: DexTokenDto | null;
  skipToken?: DexTokenDto | null;
  onSelect: (token: DexTokenDto) => void;
  exclude?: DexTokenDto[];
  disabled?: boolean;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  tokens: DexTokenDto[];
}

export default function TokenSelector({
  label,
  selected,
  skipToken,
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


  const filteredTokens = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    const excludeIds = exclude.map(t => t.address);

    return tokens.filter((token) => {
      const matchesSearch = !term ||
        token.symbol.toLowerCase().includes(term) ||
        (token.address || '').toLowerCase().includes(term);
      const notExcluded = !excludeIds.includes(token.address);
      // if the token is WAE, skip it
      if (skipToken?.address === DEX_ADDRESSES.wae && token.address === 'AE') {
        return false;
      }
      if (skipToken?.address === 'AE' && token.address === DEX_ADDRESSES.wae) {
        return false;
      }
      const notSkipped = !skipToken || token.address !== skipToken.address;
      return matchesSearch && notExcluded && notSkipped;
    });
  }, [tokens, searchValue, exclude]);

  const handleSelect = (token: DexTokenDto) => {
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
    const customToken: DexTokenDto = {
      address: customAddress.trim(),
      symbol: 'CUSTOM', // You might want to fetch this from the blockchain
      decimals: 18, // Default decimals, might want to fetch this too
      is_ae: false,
      pairs_count: 0,
      name: 'CUSTOM',
      created_at: new Date().toISOString(),
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
          <div className="text-xs text-white/60 font-semibold mb-1.5 normal-case tracking-wide">
            {label}
          </div>
        )}

        <div className="flex gap-2">
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
              className={`min-w-[120px] py-2.5 px-4 rounded-xl border border-white/10 text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 ease-out flex items-center justify-center gap-2 normal-case ${
                disabled || loading
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:-translate-y-0.5'
              } ${
                selected
                  ? 'bg-[#1161FE] text-white'
                  : 'bg-white/[0.05] text-white'
              }`}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {selected ? `${selected.symbol}` : 'Select Token'}
                  <span className="opacity-70">▼</span>
                </>
              )}
            </button>
          </Dialog.Trigger>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] animate-in fade-in duration-150" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(20,20,28,0.98)] text-white border border-white/10 rounded-3xl p-4 sm:p-6 w-[95vw] max-w-md sm:max-w-[520px] max-h-[85vh] overflow-y-auto backdrop-blur-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6),_0_8px_32px_rgba(255,107,107,0.2)] z-[1001] animate-in slide-in-from-top-4 duration-200 outline-none">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <Dialog.Title className="font-bold text-lg sm:text-xl m-0 sh-dex-title">
              Select a token
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-base flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 hover:bg-red-400 hover:scale-110">
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Search Input */}
          <div className="relative mb-4 sm:mb-5">
            <input
              placeholder="Search by token or paste address"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
              className="w-full py-3.5 pr-12 pl-4 rounded-2xl bg-white/[0.08] text-white border border-white/15 text-base backdrop-blur-[10px] transition-all duration-300 ease-out box-border focus:border-[#00ff9d] focus:shadow-[0_0_0_2px_rgba(0,255,157,0.2)] focus:outline-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-lg">
              🔍
            </div>
          </div>

          {/* Custom Token Input */}
          {searchValue && isValidAddress(searchValue) && (
            <div style={{
              marginBottom: 20,
              padding: 16,
              background: 'rgba(0, 255, 157, 0.1)',
              border: '1px solid rgba(0, 255, 157, 0.3)',
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
                  const customToken: DexTokenDto = {
                    address: searchValue.trim(),
                    symbol: 'CUSTOM',
                    name: 'CUSTOM',
                    pairs_count: 0,
                    decimals: 18,
                    is_ae: false,
                    created_at: new Date().toISOString(),
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
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 157, 0.4)';
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
                key={token.address}
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
                  e.currentTarget.style.background = 'rgba(0, 255, 157, 0.15)';
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
                    {token.is_ae ? 'Native Token' : 'Token'}
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
                      token.is_ae ?
                        Decimal.from(toAe(balance)).prettify() :
                        Decimal.from(aex9Balances.find(b => b?.contract_id === token.address)?.amount || 0).div(10 ** token.decimals).prettify()
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
                    {token.address.length > 15
                      ? `${token.address.slice(0, 6)}...${token.address.slice(-6)}`
                      : token.address
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
        </Dialog.Content>
      </Dialog.Portal>

    </Dialog.Root>
  );
}
