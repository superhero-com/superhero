import { CONFIG } from '@/config';

interface TokenLineChartProps {
  saleAddress: string;
  height?: number;
  width?: number;
  interval?: string;
}

export const TokenLineChart = ({
  saleAddress, height = 32, width = 120, interval = 'all-time',
}: TokenLineChartProps) => (
  <img
    src={`${CONFIG.SUPERHERO_API_URL}/api/tokens/preview/${saleAddress}/sparkline.svg?interval=${interval}&height=${height}&width=${width}`}
    alt="Token Line Chart"
  />
);

export default TokenLineChart;
