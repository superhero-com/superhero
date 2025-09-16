import React, { useMemo, useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';

// AENS domain constant - could be imported from utils/address.ts if needed
const AE_AENS_DOMAIN = '.chain';

interface TruncateProps {
  str: string;
  fixed?: boolean;
  right?: boolean;
  className?: string;
}

export function Truncate({ str, fixed = false, right = false, className }: TruncateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflowAmount, setOverflowAmount] = useState<number>(0);

  // Extract name component (remove .chain domain if present)
  const nameComponent = useMemo(() => {
    return str?.endsWith(AE_AENS_DOMAIN) ? str.replace(AE_AENS_DOMAIN, '') : str;
  }, [str]);

  // Calculate overflow amount
  useEffect(() => {
    if (!containerRef.current || !textRef.current || fixed) return;

    const containerWidth = containerRef.current.clientWidth;
    const textWidth = textRef.current.scrollWidth;
    const overflow = Math.max(0, textWidth - containerWidth);
    
    setOverflowAmount(overflow);
  }, [nameComponent, fixed]);

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        right && "justify-end",
        className
      )}
    >
      <div 
        ref={containerRef}
        className={cn(
          "overflow-hidden whitespace-nowrap",
          fixed && "text-ellipsis"
        )}
      >
        <div 
          ref={textRef}
          className="inline-block"
          style={!fixed && overflowAmount > 0 ? {
            '--animation-translate': `-${overflowAmount}px`,
            animationName: 'truncate-scroll',
            animationDuration: '4s',
            animationDelay: '0.5s',
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          } as React.CSSProperties : undefined}
        >
          {nameComponent}
        </div>
      </div>
      {nameComponent !== str && (
        <span className="break-keep">
          {AE_AENS_DOMAIN}
        </span>
      )}
    </div>
  );
}

export default Truncate;
