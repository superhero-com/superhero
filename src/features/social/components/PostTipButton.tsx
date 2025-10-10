import React, { useCallback } from 'react';
import { IconDiamond } from '../../../icons';
import { useModal } from '../../../hooks/useModal';
import { buildTipPostPayload } from '../utils/tips';

export default function PostTipButton({ toAddress, postId }: { toAddress: string; postId: string }) {
  const { openModal } = useModal();

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
      className="inline-flex items-center gap-1.5 text-[13px] px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/10 md:hover:border-white/20 md:!border md:!border-white/15 md:hover:!border-white/30 transition-colors"
      aria-label="Tip post"
    >
      <IconDiamond className="w-[14px] h-[14px]" />
      Tip
    </button>
  );
}


