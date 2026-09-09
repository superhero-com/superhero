import { cn } from '@/lib/utils';

/**
 * lightweight-charts' NOTICE requires a link to tradingview.com on a page our users can reach.
 * Its own attribution logo would satisfy that, but the library writes the logo with innerHTML,
 * and the Trusted Types `default` policy drops it under the enforcing CSP
 * (src/utils/trustedTypes.ts) — so the logo is disabled in the chart options and the link lives
 * here, in first-party markup that no sink has to launder.
 */
export const TradingViewAttribution = ({ className }: { className?: string }) => (
  <div className={cn('text-[11px] text-muted-foreground', className)}>
    {'Charts by '}
    <a
      href="https://www.tradingview.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      TradingView
    </a>
  </div>
);
