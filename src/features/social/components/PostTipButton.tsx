import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { IconDiamond } from '../../../icons';
import { useModal } from '../../../hooks/useModal';
import { buildTipPostPayload } from '../utils/tips';
import { useAtom } from 'jotai';
import { tipStatusAtom, makeTipKey } from '../../../atoms/tipAtoms';
import { Check } from 'lucide-react';
import { usePostTipSummary } from '../hooks/usePostTipSummary';
import Spinner from '../../../components/Spinner';
import { cn } from '@/lib/utils';

export default function PostTipButton({ toAddress, postId, compact = false }: { toAddress: string; postId: string; compact?: boolean }) {
  const { openModal } = useModal();
  const [tipStatus] = useAtom(tipStatusAtom);
  const key = makeTipKey(toAddress, postId);
  const state = tipStatus[key]?.status;
  const isPending = state === 'pending';
  const isSuccess = state === 'success';

  // Lazy-load tip summary: only fetch when button is visible or hovered
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Use IntersectionObserver to detect when button is visible
  useEffect(() => {
    if (!buttonRef.current || !('IntersectionObserver' in window)) {
      setIsVisible(true); // Fallback: fetch if IntersectionObserver not available
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Only need to detect once
          }
        });
      },
      { rootMargin: '100px' } // Start loading when button is 100px away from viewport
    );
    
    observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, []);

  const shouldFetch = isVisible || isHovered;
  const { data: summary } = usePostTipSummary(postId, shouldFetch);
  const totalAe = useMemo(() => {
    if (!summary || summary.totalTips == null) return 0;
    const n = Number(summary.totalTips);
    return Number.isFinite(n) ? n : 0;
  }, [summary]);

  const formatted = useMemo(() => {
    if (totalAe <= 0) return '';
    const v = totalAe;
    // Compact formatting up to 2 decimals, trim trailing zeros
    const s = v >= 1000 ? Math.round(v).toString() : v.toFixed(v < 1 ? 3 : 2);
    return s.replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/, '$1');
  }, [totalAe]);

  const handleTip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = buildTipPostPayload(postId);
    openModal({
      name: 'tip',
      props: { toAddress, payload },
    });
  }, [openModal, toAddress, postId]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleTip}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors",
        compact
          ? "text-[11px] px-0 py-0 md:px-1.5 md:py-0.5 md:h-[22px] md:min-h-[22px]"
          : "text-[13px] px-0 py-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px]"
      )}
      aria-label="Tip post"
    >
      {isPending && (
        <Spinner className={compact ? "w-[11px] h-[11px]" : "w-[14px] h-[14px]"} />
      )}
      {isSuccess && <Check className={compact ? "w-[11px] h-[11px]" : "w-[14px] h-[14px]"} />}
      {!isPending && !isSuccess && <IconDiamond className={compact ? "w-[11px] h-[11px]" : "w-[14px] h-[14px]"} />}
      {isPending ? 'Sending' : isSuccess ? 'Tipped' : (formatted ? `${formatted} AE` : 'Tip')}
    </button>
  );
}


