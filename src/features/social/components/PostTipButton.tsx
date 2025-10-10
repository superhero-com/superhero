import React, { useCallback } from 'react';
import { IconDiamond } from '../../../icons';
import { useModal } from '../../../hooks/useModal';
import { buildTipPostPayload } from '../utils/tips';
import { useAtom } from 'jotai';
import { tipStatusAtom, makeTipKey } from '../../../atoms/tipAtoms';
import { Check } from 'lucide-react';

export default function PostTipButton({ toAddress, postId }: { toAddress: string; postId: string }) {
  const { openModal } = useModal();
  const [tipStatus] = useAtom(tipStatusAtom);
  const key = makeTipKey(toAddress, postId);
  const state = tipStatus[key]?.status;

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
      type="button"
      onClick={handleTip}
      className="inline-flex items-center gap-1.5 text-[13px] px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors"
      aria-label="Tip post"
    >
      {state === 'pending' && (
        <svg className="animate-spin w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {state === 'success' && <Check className="w-[14px] h-[14px]" />}
      {!state && <IconDiamond className="w-[14px] h-[14px]" />}
      {state === 'pending' ? 'Sending' : state === 'success' ? 'Tipped' : 'Tip'}
    </button>
  );
}


