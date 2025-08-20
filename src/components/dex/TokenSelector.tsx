import React, { useEffect, useMemo, useState } from 'react';
import { DEX_ADDRESSES } from '../../libs/dex';
import AeButton from '../AeButton';

type TokenItem = { address: string; symbol: string; decimals: number; isAe?: boolean };

type Props = {
  label?: string;
  selected?: string; // address or 'AE'
  onSelect: (addr: string, info: TokenItem) => void;
  exclude?: string[]; // addresses to exclude
};

export default function TokenSelector({ label, selected, onSelect, exclude = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<TokenItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { getListedTokens } = await import('../../libs/dexBackend');
        const tokens = await getListedTokens();
        const base: TokenItem[] = [
          { address: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { address: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
          ...((tokens || []).map((t: any) => ({ address: t.address, symbol: t.symbol || t.name || 'TKN', decimals: Number(t.decimals || 18) }))),
        ];
        const unique = new Map<string, TokenItem>();
        for (const t of base) { if (!unique.has(t.address)) unique.set(t.address, t); }
        const filtered = Array.from(unique.values()).filter((t) => !exclude.includes(t.address));
        setList(filtered);
      } catch {
        setList([
          { address: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { address: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
        ]);
      }
    })();
  }, [exclude.join('|')]);

  const selectedLabel = useMemo(() => {
    const found = list.find((t) => t.address === selected) || (selected === 'AE' ? { symbol: 'AE' } as any : null);
    return found?.symbol ? `#${found.symbol}` : 'Select token';
  }, [list, selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((t) => !term || t.symbol.toLowerCase().includes(term) || t.address.toLowerCase().includes(term));
  }, [search, list]);

  return (
    <div>
      {label && <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>}
      <AeButton onClick={() => setOpen(true)} variant="secondary-dark" size="medium">{selectedLabel}</AeButton>
      {open && (
        <div role="dialog" aria-label="token-selector" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: '#14141c', color: 'white', border: '1px solid #3a3a4a', borderRadius: 10, padding: 12, width: 420, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Select token</div>
              <AeButton onClick={() => setOpen(false)} variant="utility" size="small">Close</AeButton>
            </div>
            <input placeholder="Search symbol or address" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a', marginBottom: 8 }} />
            <div style={{ display: 'grid', gap: 6 }}>
              {filtered.map((t) => (
                <AeButton key={t.address} onClick={() => { onSelect(t.address, t); setOpen(false); }} variant="secondary-dark" size="medium" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
                  <div style={{ fontWeight: 600 }}>#{t.symbol}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{t.address}</div>
                </AeButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


