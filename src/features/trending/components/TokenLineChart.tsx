import { CONFIG } from '@/config';
import { useTranslation } from 'react-i18next';
import { PRICE_MOVEMENT_TIMEFRAME_TEXT } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  width?: number;
  interval?: string;
  showIntervalText?: boolean;
  backgroundEnabled?: boolean;
}

export const TokenLineChart = ({
  saleAddress, height = 32, width = 120, interval = 'all-time',
  showIntervalText = false,
  backgroundEnabled = false,
}: TokenLineChartProps) => {
  const { t } = useTranslation();
  return (
    <div className={cn('relative py-4 px-2 pb-2 rounded-xl', backgroundEnabled ? 'bg-white/[0.02]' : '')}>
      <img
        src={`${CONFIG.SUPERHERO_API_URL}/api/tokens/preview/${saleAddress}/sparkline.svg?interval=${interval}&height=${height}&width=${width}`}
        alt={t('trending.tokenLineChart.alt')}
      />
      {
        showIntervalText && (
          <div className="text-[8px] text-white/70 top-1 right-2 absolute">{PRICE_MOVEMENT_TIMEFRAME_TEXT[interval]}</div>
        )
      }
    </div>
  );
};

export default TokenLineChart;
