import React, { useEffect, useRef, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import WebSocketClient from '../../libs/WebSocketClient';
import MobileCard from '../MobileCard';
import './LatestTransactionsCarousel.scss';

export default function LatestTransactionsCarousel() {
  const [items, setItems] = useState<any[]>([]);
  const nameCacheRef = useRef<Map<string, string>>(new Map());

  async function resolveTokenName(address: string): Promise<string | undefined> {
    if (!address) return undefined;
    const cache = nameCacheRef.current;
    if (cache.has(address)) return cache.get(address);
    try {
      const tok = await TrendminerApi.getToken(address);
      const name = tok?.name || tok?.symbol;
      if (name) cache.set(address, name);
      return name;
    } catch {
      return undefined;
    }
  }

  async function enrichNames(list: any[]): Promise<any[]> {
    const unknowns = Array.from(new Set(
      list
        .map((it) => ({ addr: it.sale_address || it.token_address, has: !!(it.token_name || it.name || it.symbol) }))
        .filter((x) => x.addr && !x.has)
        .map((x) => x.addr as string),
    ));
    await Promise.all(unknowns.slice(0, 12).map((addr) => resolveTokenName(addr)));
    return list.map((it) => {
      if (it.token_name || it.name || it.symbol) return it;
      const addr = it.sale_address || it.token_address;
      const cached = addr ? nameCacheRef.current.get(addr) : undefined;
      return cached ? { ...it, token_name: cached } : it;
    });
  }
  
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [txResp, createdResp] = await Promise.all([
          TrendminerApi.fetchJson('/api/transactions?limit=10'),
          TrendminerApi.fetchJson('/api/tokens?order_by=created_at&order_direction=DESC&limit=6'),
        ]);
        const txItems = txResp?.items ?? txResp ?? [];
        const createdItems = (createdResp?.items ?? createdResp ?? []).map((t: any) => ({
          sale_address: t.sale_address || t.address,
          token_name: t.name,
          type: 'CREATED',
          created_at: t.created_at,
        }));
        let list = [...createdItems, ...txItems].slice(0, 16);
        list = await enrichNames(list);
        if (!cancel) setItems(list);
      } catch {}
    }
    load();
    const t = window.setInterval(load, 30000);
    const unsub1 = WebSocketClient.subscribe('TokenTransaction', (tx) => {
      const sale = tx?.sale_address || tx?.token_address;
      if (sale && !tx?.token_name) {
        resolveTokenName(sale).then((nm) => {
          if (nm) setItems((prev) => [{ ...tx, token_name: nm }, ...prev].slice(0, 16));
          else setItems((prev) => [tx, ...prev].slice(0, 16));
        });
      } else {
        setItems((prev) => [tx, ...prev].slice(0, 16));
      }
    });
    const unsub2 = WebSocketClient.subscribe('TokenCreated', (payload) => {
      const item = {
        sale_address: payload?.sale_address || payload?.address,
        token_name: payload?.name,
        type: 'CREATED',
        created_at: payload?.created_at || Date.now(),
      };
      setItems((prev) => [item, ...prev].slice(0, 16));
    });
    return () => { cancel = true; window.clearInterval(t); unsub1(); unsub2(); };
  }, []);
  
  if (!items.length) {
    // Show loading state instead of null to prevent empty placeholders
    return (
      <div className="latest-transactions-carousel">
        <div className="carousel-container">
          <div className="carousel-track">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="transaction-item loading">
                <div className="transaction-content">
                  <div className="transaction-header">
                    <div className="transaction-type loading-skeleton">CREATED</div>
                    <div className="transaction-time loading-skeleton">--:--:--</div>
                  </div>
                  <div className="transaction-token">
                    <span className="token-name loading-skeleton">Loading...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const loop = [...items, ...items];
  // Faster rotation - reduced from 15s minimum to 10s minimum
  const durationSec = Math.max(10, items.length * 2);

  function normalizeType(tx: any): { label: 'BUY'|'SELL'|'CREATED'|'TX'; color: string; bg: string; border: string } {
    const raw = String(
      tx?.type || tx?.tx_type || tx?.txType || tx?.action || tx?.function || tx?.fn || tx?.tx?.function || ''
    ).toLowerCase();
    if (raw.includes('buy')) return { label: 'BUY', color: '#1e7d2d', bg: 'rgba(113,217,69,0.15)', border: 'rgba(113,217,69,0.35)' };
    if (raw.includes('sell')) return { label: 'SELL', color: '#b91c1c', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)' };
    if (raw.includes('create')) return { label: 'CREATED', color: '#0b63c7', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)' };
    return { label: 'TX', color: '#3b3b3b', bg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.12)' };
  }
  
  return (
    <div className="latest-transactions-carousel">
      <div className="carousel-container">
        <div className="carousel-track" style={{ animationDuration: `${durationSec}s` }}>
          {loop.map((item, index) => {
            const type = normalizeType(item);
            const tokenName = item.token_name || item.name || item.symbol || 'Unknown';
            const time = item.created_at ? new Date(item.created_at).toLocaleTimeString() : '';
            
            return (
              <div
                key={`${item.sale_address || item.token_address || index}-${index}`}
                className="transaction-item"
              >
                <div className="transaction-content">
                  <div className="transaction-header">
                    <div className="transaction-type" style={{ 
                      color: type.color, 
                      backgroundColor: type.bg, 
                      borderColor: type.border 
                    }}>
                      {type.label}
                    </div>
                    <div className="transaction-time">{time}</div>
                  </div>
                  
                  <div className="transaction-token">
                    <span className="token-name">#{tokenName}</span>
                    {item.amount && (
                      <span className="transaction-amount">
                        {Number(item.amount).toLocaleString()} AE
                      </span>
                    )}
                  </div>
                  
                  {item.sale_address && (
                    <a 
                      href={`/trendminer/tokens/${encodeURIComponent(tokenName)}`}
                      className="transaction-link"
                    >
                      View Token →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


