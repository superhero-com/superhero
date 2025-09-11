import { formatTokenAmount } from '../utils/number';
import { cn } from '@/lib/utils';

interface Props {
  amount?: string | number;
  round?: number;
  token?: string | null;
  noSymbol?: boolean;
  className?: string;
}
//
export default function AeAmount({ amount = 0, round = 2, token = null, noSymbol, className }: Props) {
  const info = token ?? null;
  const decimals = info?.decimals ?? 18;
  const symbol = info?.symbol ?? 'AE';
  const formatted = formatTokenAmount(amount, decimals, round);
  
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono font-semibold text-foreground", className)}>
      <span>{formatted}</span>
      {!noSymbol && (
        <span className="text-xs text-accent font-bold tracking-wider uppercase">
          {symbol}
        </span>
      )}
    </span>
  );
}


