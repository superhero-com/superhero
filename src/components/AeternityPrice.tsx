import React from 'react';
import AeSymbol from '../svg/aeternitySymbol.svg?react';

type Props = {
  usd?: number | null;
  eur?: number | null;
};

export default function AeternityPrice({ usd, eur }: Props) {
  const fmt = (v?: number | null) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }) : '–');
  return (
    <div
      className="ae-price-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 10,
        border: '1px solid var(--search-nav-border-color)',
        background: 'var(--thumbnail-background-color)',
      }}
    >
      <div style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(17,97,254,0.08)' }}>
        <AeSymbol style={{ width: 18, height: 18 }} />
      </div>
      <div style={{ display: 'grid', gap: 2, fontSize: 12, color: 'var(--light-font-color)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--standard-font-color)' }}>Aeternity</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span>USD: <span style={{ color: 'var(--standard-font-color)' }}>{fmt(usd)}</span></span>
          <span>EUR: <span style={{ color: 'var(--standard-font-color)' }}>{fmt(eur)}</span></span>
        </div>
      </div>
    </div>
  );
}


