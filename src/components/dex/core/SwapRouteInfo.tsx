/* eslint-disable */
import { cn } from '@/lib/utils';
import { DexTokenDto } from '../../../api/generated';
import { DEX_ADDRESSES } from '../../../libs/dex';
import { RouteInfo } from '../types/dex';
import { AeCard, AeCardContent } from '../../ui/ae-card';
import { Badge } from '../../ui/badge';

interface SwapRouteInfoProps {
  routeInfo: RouteInfo;
  tokens: DexTokenDto[];
  tokenIn: DexTokenDto;
  tokenOut: DexTokenDto;
  className?: string;
}

export default function SwapRouteInfo({
  routeInfo, tokens, tokenIn, tokenOut, className,
}: SwapRouteInfoProps) {
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

  function buildRouteDisplay(): string {
    const routeLabels = routeInfo.path.map((p) => routeLabel(p));
    let routeDisplay = routeLabels.map((label, i) => (i > 0 ? ' → ' : '') + label).join('');

    // If route starts with WAE, prepend AE
    if (routeLabels.length > 0 && routeLabels[0] === 'WAE') {
      routeDisplay = `AE → ${routeDisplay}`;
    }

    // If route ends with WAE, append AE
    if (routeLabels.length > 0 && routeLabels[routeLabels.length - 1] === 'WAE') {
      routeDisplay += ' → AE';
    }

    return routeDisplay;
  }

  if (!routeInfo.path.length) {
    return null;
  }

  return (
    <AeCard variant="glass" className={cn('mt-3', className)}>
      <AeCardContent className="p-3">
        <div className="text-xs text-muted-foreground space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Route:</span>
            <Badge variant="secondary" className="font-mono text-xs bg-muted/30 px-2 py-1">
              {buildRouteDisplay()}
            </Badge>
          </div>

          {routeInfo.reserves && routeInfo.reserves.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Pool Reserves:</div>
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
                  <div key={idx} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded-lg">
                    <Badge variant="outline" className="text-xs font-mono">
                      {routeLabel(t0)}
                      {' '}
                      /
                      {routeLabel(t1)}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {hr0 && hr1 ? `${hr0} / ${hr1}` : 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AeCardContent>
    </AeCard>
  );
}
