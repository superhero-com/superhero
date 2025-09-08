import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ChartOptions,
  DeepPartial,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';

export interface UseChartProps {
  onChartReady?: (chart: IChartApi) => void;
  height?: number;
  chartOptions?: DeepPartial<ChartOptions>;
}

export function useChart({
  onChartReady,
  height = 400,
  chartOptions = {},
}: UseChartProps = {}) {
  const chartContainer = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const [isDarkMode] = useState(true); // For now, assuming dark mode

  const resizeHandler = () => {
    if (!chart.current || !chartContainer.current) return;
    const dimensions = chartContainer.current.getBoundingClientRect();
    chart.current.resize(dimensions.width, height);
  };

  const initChart = () => {
    if (!chartContainer.current || chart.current) return;

    const defaultChartOptions: DeepPartial<ChartOptions> = {
      layout: {
        textColor: isDarkMode ? 'white' : 'black',
        background: { color: 'transparent', type: ColorType.Solid },
      },
      grid: {
        vertLines: {
          color: 'rgba(255,255,255, 0.08)',
        },
        horzLines: {
          color: 'rgba(255,255,255, 0.08)',
        },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: '#F4C10C',
          labelBackgroundColor: '#F4C10C',
        },
        horzLine: {
          color: '#F4C10C',
          labelBackgroundColor: '#F4C10C',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      height,
      width: chartContainer.current.offsetWidth,
      ...chartOptions,
    };

    const chartInstance = createChart(chartContainer.current, defaultChartOptions);
    chart.current = chartInstance;

    onChartReady?.(chartInstance);
  };

  useEffect(() => {
    initChart();
    window.addEventListener('resize', resizeHandler);

    return () => {
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
      window.removeEventListener('resize', resizeHandler);
    };
  }, [height]);

  // Update chart colors when dark mode changes
  useEffect(() => {
    if (!chart.current) return;
    chart.current.applyOptions({
      layout: {
        textColor: isDarkMode ? 'white' : 'black',
      },
    });
  }, [isDarkMode]);

  return {
    chartContainer,
    chart: chart.current,
  };
}
