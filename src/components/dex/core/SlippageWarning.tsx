import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { slippageLevel } from '../utils/slippage';

const SlippageWarning = ({ slippagePct }: { slippagePct: number | string }) => {
  const { t } = useTranslation('dex');
  const level = slippageLevel(slippagePct);
  if (!level) return null;
  return (
    <div className="swap-inline-state is-warning" role="status">
      <TriangleAlert aria-hidden="true" />
      <p>{t(level === 'high' ? 'slippageWarning.high' : 'slippageWarning.low', { slippagePct: Number(slippagePct) })}</p>
    </div>
  );
};

export default SlippageWarning;
