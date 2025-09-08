import { DexTokenDto } from '../../../api/generated';
import { DEX_ADDRESSES } from '../../../libs/dex';
import { RouteInfo } from '../types/dex';

interface SwapRouteInfoProps {
  routeInfo: RouteInfo;
  tokens: DexTokenDto[];
  tokenIn: DexTokenDto;
  tokenOut: DexTokenDto;
}

export default function SwapRouteInfo({ routeInfo, tokens, tokenIn, tokenOut }: SwapRouteInfoProps) {
  function routeLabel(addr: string): string {
    if (addr === DEX_ADDRESSES.wae) return 'WAE';
    if (tokenIn?.address === addr) return tokenIn.symbol;
    if (tokenOut?.address === addr) return tokenOut.symbol;
    const found = tokens.find((t) => t.address === addr);
    return found ? found.symbol : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  function tokenDecimals(addr?: string): number {
    if (!addr) return 18;
    if (addr === DEX_ADDRESSES.wae) return 18;
    const t = tokens.find((x) => x.address === addr);
    return t?.decimals ?? 18;
  }

  function formatAmountHuman(amountStr: string): string {
    if (!amountStr) return '0';
    const [i, f] = amountStr.split('.');
    return f ? `${i}.${f.slice(0, 6)}` : i;
  }

  if (!routeInfo.path.length) return null;

  function buildRouteDisplay(): string {
    const routeLabels = routeInfo.path.map(p => routeLabel(p));
    let routeDisplay = routeLabels.map((label, i) => (i > 0 ? ' → ' : '') + label).join('');

    // If route starts with WAE, prepend AE
    if (routeLabels.length > 0 && routeLabels[0] === 'WAE') {
      routeDisplay = 'AE → ' + routeDisplay;
    }

    // If route ends with WAE, append AE
    if (routeLabels.length > 0 && routeLabels[routeLabels.length - 1] === 'WAE') {
      routeDisplay = routeDisplay + ' → AE';
    }

    return routeDisplay;
  }

  return (
    <div style={{ fontSize: 12, opacity: 0.8 }}>
      Route: {buildRouteDisplay()}

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
