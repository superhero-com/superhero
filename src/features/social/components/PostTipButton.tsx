import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import { Check } from 'lucide-react';
import { IconDiamond } from '../../../icons';
import { useModal } from '../../../hooks/useModal';
import { buildTipPostPayload } from '../utils/tips';
import { tipStatusAtom, makeTipKey } from '../../../atoms/tipAtoms';
import { usePostTipSummary } from '../hooks/usePostTipSummary';
import Spinner from '../../../components/Spinner';

const PostTipButton = ({ toAddress, postId }: { toAddress: string; postId: string }) => {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const [tipStatus] = useAtom(tipStatusAtom);
  const key = makeTipKey(toAddress, postId);
  const state = tipStatus[key]?.status;
  const isPending = state === 'pending';
  const isSuccess = state === 'success';

  const { data: summary } = usePostTipSummary(postId);
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
    return s.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }, [totalAe]);

  const buttonLabel = useMemo(() => {
    if (isPending) return 'Sending';
    if (isSuccess) return 'Tipped';
    return formatted ? `${formatted} AE` : 'Tip';
  }, [formatted, isPending, isSuccess]);

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
      aria-label={t('aria.tipPost')}
    >
      {isPending && (
        <Spinner className="w-[14px] h-[14px]" />
      )}
      {isSuccess && <Check className="w-[14px] h-[14px]" />}
      {!isPending && !isSuccess && <IconDiamond className="w-[14px] h-[14px]" />}
      {buttonLabel}
    </button>
  );
};

export default PostTipButton;
