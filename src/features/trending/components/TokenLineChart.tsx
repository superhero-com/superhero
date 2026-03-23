import { CONFIG } from '@/config';
import { PRICE_MOVEMENT_TIMEFRAME_TEXT } from '@/utils/constants';

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  width?: number;
  interval?: string;
  showIntervalText?: boolean;
}


export const TokenLineChart = ({
  saleAddress, height = 32, width = 120, interval = 'all-time',
  showIntervalText = false,
}: TokenLineChartProps) => (
  <div className="relative py-4 px-2 pb-2 bg-white/[0.02] rounded-xl">
    <img
      src={`${CONFIG.SUPERHERO_API_URL}/api/tokens/preview/${saleAddress}/sparkline.svg?interval=${interval}&height=${height}&width=${width}`}
      alt="Token Line Chart"
    />
    {
      showIntervalText && (
        <div className="text-[8px] text-white/70 top-1 right-2 absolute">{PRICE_MOVEMENT_TIMEFRAME_TEXT[interval]}</div>
      )
    }
  </div>
);

export default TokenLineChart;
