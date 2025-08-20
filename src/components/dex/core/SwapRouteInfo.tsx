import React from 'react';
import { RouteInfo } from '../types/dex';
import { DEX_ADDRESSES } from '../../../libs/dex';

interface SwapRouteInfoProps {
  routeInfo: RouteInfo;
  tokens: any[];
  tokenIn: any;
  tokenOut: any;
}

export default function SwapRouteInfo({ routeInfo, tokens, tokenIn, tokenOut }: SwapRouteInfoProps) {
  function routeLabel(addr: string): string {
    if (addr === DEX_ADDRESSES.wae) return 'WAE';
    if (tokenIn?.contractId === addr) return tokenIn.symbol;
    if (tokenOut?.contractId === addr) return tokenOut.symbol;
    const found = tokens.find((t) => t.contractId === addr);
    return found ? found.symbol : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  function tokenDecimals(addr?: string): number {
    if (!addr) return 18;
    if (addr === DEX_ADDRESSES.wae) return 18;
    const t = tokens.find((x) => x.contractId === addr);
    return t?.decimals ?? 18;
  }

  function formatAmountHuman(amountStr: string): string {
    if (!amountStr) return '0';
    const [i, f] = amountStr.split('.');
    return f ? `${i}.${f.slice(0, 6)}` : i;
  }

  if (!routeInfo.path.length) return null;

  return (
    <div style={{ fontSize: 12, opacity: 0.8 }}>
      Route: {routeInfo.path.map((p, i) => (i > 0 ? ' → ' : '') + routeLabel(p)).join('')}
      
      {routeInfo.reserves && routeInfo.reserves.length > 0 && (
        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          {routeInfo.reserves.map((pair: any, idx: number) => {
            const t0 = String(pair.token0);
            const t1 = String(pair.token1);
            const r0 = pair?.liquidityInfo?.reserve0 ?? pair?.reserve0;
            const r1 = pair?.liquidityInfo?.reserve1 ?? pair?.reserve1;
            const d0 = tokenDecimals(t0);
            const d1 = tokenDecimals(t1);
            const hr0 = r0 != null ? formatAmountHuman(r0) : null;
            const hr1 = r1 != null ? formatAmountHuman(r1) : null;
            
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>{routeLabel(t0)} / {routeLabel(t1)}</span>
                <span style={{ opacity: 0.8 }}>
                  Reserves: {hr0 && hr1 ? `${hr0} / ${hr1}` : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
