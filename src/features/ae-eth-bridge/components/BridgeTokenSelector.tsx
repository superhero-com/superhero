import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { Asset, Direction } from '../types';

interface BridgeTokenSelectorProps {
  label?: string;
  selected?: Asset | null;
  onSelect: (asset: Asset) => void;
  assets: Asset[];
  disabled?: boolean;
  loading?: boolean;
  direction?: Direction;
  aeBalances?: Record<string, string>; // Map of token symbol to AE balance
  ethBalances?: Record<string, string>; // Map of token symbol to ETH balance
  loadingBalances?: boolean;
}

const getTokenDisplayName = (asset: Asset, direction?: Direction) => {
  let symbol = asset.symbol;
  if (direction === Direction.AeternityToEthereum) {
    symbol = `æ${symbol}`;
    if (symbol === 'æWAE') {
      symbol = 'AE';
    }
  }
  return symbol;
};

export default function BridgeTokenSelector({
  label,
  selected,
  onSelect,
  assets,
  disabled = false,
  loading = false,
  direction,
  aeBalances = {},
  ethBalances = {},
  loadingBalances = false,
}: BridgeTokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredAssets = useMemo(() => {
    const term = searchValue.trim().toLowerCase();

    return assets.filter((asset) => {
      if (!term) return true;

      const matchesSymbol = asset.symbol.toLowerCase().includes(term);
      const matchesName = asset.name.toLowerCase().includes(term);
      const matchesAeAddress = asset.aeAddress.toLowerCase().includes(term);
      const matchesEthAddress = asset.ethAddress.toLowerCase().includes(term);

      return matchesSymbol || matchesName || matchesAeAddress || matchesEthAddress;
    });
  }, [assets, searchValue]);

  const handleSelect = (asset: Asset) => {
    onSelect(asset);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div>
        {label && (
          <label className="text-xs text-white/60 font-medium uppercase tracking-wider block mb-2">
            {label}
          </label>
        )}

        <div className="flex gap-2">
          <Dialog.Trigger asChild>
            <button
              disabled={disabled || loading}
              onClick={() => {
                setSearchValue('');
              }}
              className={`flex-1 max-w-[max(120px,100%)] py-2.5 px-4 rounded-xl border border-white/10 text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 ease-out flex items-center justify-center gap-2 normal-case ${disabled || loading
                ? 'cursor-not-allowed opacity-50 bg-white/[0.05]'
                : 'cursor-pointer hover:-translate-y-0.5'
                } ${selected
                  ? 'bg-white/10 text-white border-[#4ecdc4]/30'
                  : 'bg-white/[0.05] text-white hover:bg-white/10'
                }`}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {selected ? (
                    <>
                      <img src={selected.icon} className="w-4 h-4" alt={selected.symbol} />
                      {getTokenDisplayName(selected, direction)}
                    </>
                  ) : (
                    'Select Token'
                  )}
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
              placeholder="Search by name, symbol, or address"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              autoFocus
              className="w-full py-3.5 pr-12 pl-4 rounded-2xl bg-white/[0.08] text-white border border-white/15 text-base backdrop-blur-[10px] transition-all duration-300 ease-out box-border focus:border-[#00ff9d] focus:shadow-[0_0_0_2px_rgba(0,255,157,0.2)] focus:outline-none"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-lg">
              🔍
            </div>
          </div>

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
              Balance
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
            {filteredAssets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => handleSelect(asset)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={asset.icon}
                    alt={asset.symbol}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 2,
                      color: 'var(--standard-font-color)',
                      textTransform: 'none',
                    }}>
                      {getTokenDisplayName(asset, direction)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--light-font-color)',
                      opacity: 0.8
                    }}>
                      {asset.name}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {/* Aeternity Balance */}

                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: aeBalances[asset.symbol] ? 'var(--standard-font-color)' : 'var(--light-font-color)',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 6
                  }}>
                    {
                      direction === Direction.AeternityToEthereum ? (
                        <span>{aeBalances[asset.symbol] || '—'}</span>
                      ) : (
                        <span>{ethBalances[asset.symbol] || '—'}</span>
                      )
                    }
                  </div>

                  <div className='text-white/60 font-medium tracking-wider' style={{ fontSize: 10 }}>
                    on {direction === Direction.AeternityToEthereum ? 'Aeternity' : 'Ethereum'} Blockchain
                  </div>

                </div>
              </button>
            ))}

            {filteredAssets.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--light-font-color)',
                fontSize: 14
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No tokens found</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Try adjusting your search term
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: 12,
              color: 'var(--light-font-color)',
              opacity: 0.7
            }}>
              Bridge tokens between Aeternity and Ethereum networks
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

