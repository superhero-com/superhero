import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
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
  const onChartReadyRef = useRef(onChartReady);
  const latestChartOptionsRef = useRef(chartOptions);
  const isChartDisposedRef = useRef(false);
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [isDarkMode] = useState(true); // For now, assuming dark mode
  onChartReadyRef.current = onChartReady;
  latestChartOptionsRef.current = chartOptions;

  const resizeHandler = useCallback(() => {
    if (isChartDisposedRef.current || !chart.current || !chartContainer.current) return;
    const dimensions = chartContainer.current.getBoundingClientRect();
    try {
      chart.current.resize(dimensions.width, height);
    } catch {
      // Ignore resize callbacks that race with chart teardown.
    }
  }, [height]);

  const initChart = useCallback(() => {
    if (!chartContainer.current || chart.current) return;
    isChartDisposedRef.current = false;

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
      ...latestChartOptionsRef.current,
    };

    const chartInstance = createChart(chartContainer.current, defaultChartOptions);
    chart.current = chartInstance;
    setChartApi(chartInstance);

    onChartReadyRef.current?.(chartInstance);
  }, [height, isDarkMode]);

  useLayoutEffect(() => {
    initChart();
    window.addEventListener('resize', resizeHandler);

    return () => {
      isChartDisposedRef.current = true;
      window.removeEventListener('resize', resizeHandler);
      if (chart.current) {
        try {
          chart.current.remove();
        } catch {
          // Ignore duplicate disposal during teardown.
        }
        chart.current = null;
      }
      setChartApi(null);
    };
  }, [initChart, resizeHandler]);

  useEffect(() => {
    if (!chart.current) return;
    chart.current.applyOptions(chartOptions);
  }, [chartOptions]);

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
    chart: chartApi,
  };
}
