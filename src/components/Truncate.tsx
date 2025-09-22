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
  const [animationDuration, setAnimationDuration] = useState<number>(10);

  // Extract name component (remove .chain domain if present)
  const nameComponent = useMemo(() => {
    return str?.endsWith(AE_AENS_DOMAIN) ? str.replace(AE_AENS_DOMAIN, '') : str;
  }, [str]);

  // Calculate overflow amount and responsive animation duration
  useEffect(() => {
    const calculateOverflowAndDuration = () => {
      if (!containerRef.current || !textRef.current || fixed) return;

      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const overflow = Math.max(0, textWidth - containerWidth);

      setOverflowAmount(overflow);

      // Calculate responsive animation duration
      // Base duration: 10s, but scale based on overflow amount and screen size
      if (overflow > 0) {
        // Minimum 4s, maximum 16s duration
        // More overflow = longer duration for smoother animation
        // Mobile screens (< 768px) get slightly longer durations for better UX
        const isMobile = window.innerWidth < 768;
        const baseMultiplier = isMobile ? 0.08 : 0.06; // Slower on mobile
        const calculatedDuration = Math.min(16, Math.max(4, overflow * baseMultiplier));
        console.log(`Truncate animation: overflow=${overflow}px, isMobile=${isMobile}, duration=${calculatedDuration}s`);
        setAnimationDuration(calculatedDuration);
      }
    };

    calculateOverflowAndDuration();

    // Add resize listener for responsive behavior
    const handleResize = () => {
      calculateOverflowAndDuration();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
          "flex-1 overflow-hidden whitespace-nowrap",
          fixed && "text-ellipsis"
        )}
      >
        <div
          ref={textRef}
          className={cn(
            "inline-block",
            !fixed && overflowAmount > 0 && "animate-truncate-scroll"
          )}
          style={!fixed && overflowAmount > 0 ? {
            '--animation-translate': `-${overflowAmount}px`,
            '--animation-duration': `${animationDuration}s !important`,
            '--animation-delay': '1s !important',
          } as React.CSSProperties : undefined}
        >
          <div className='chain-name text-sm font-bold bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent'>{nameComponent}</div>
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
