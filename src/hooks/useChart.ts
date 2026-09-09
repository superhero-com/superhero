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

/**
 * lightweight-charts writes its attribution logo with innerHTML, so the Trusted Types `default`
 * policy blanks it under the enforcing CSP. The licence's link is carried by
 * src/components/charts/TradingViewAttribution.tsx instead, so the logo stays off whatever a
 * caller passes — at creation and on every later `applyOptions`, which would otherwise carry an
 * `attributionLogo: true` straight back in.
 */
function withoutAttributionLogo(options: DeepPartial<ChartOptions>): DeepPartial<ChartOptions> {
  return { ...options, layout: { ...options.layout, attributionLogo: false } };
}

interface UseChartProps {
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

    const callerOptions = latestChartOptionsRef.current;
    const defaultChartOptions: DeepPartial<ChartOptions> = withoutAttributionLogo({
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
      ...callerOptions,
      // Merged after the caller's options, not before: every caller passes its own `layout`,
      // which would otherwise replace the object wholesale and drop these defaults with it.
      layout: {
        textColor: isDarkMode ? 'white' : 'black',
        background: { color: 'transparent', type: ColorType.Solid },
        ...callerOptions.layout,
      },
    });

    const chartInstance = createChart(chartContainer.current, defaultChartOptions);
    chart.current = chartInstance;
    setChartApi(chartInstance);

    onChartReadyRef.current?.(chartInstance);
  }, [height, isDarkMode]);

  useLayoutEffect(() => {
    initChart();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resizeHandler);
    }

    return () => {
      isChartDisposedRef.current = true;
      if (typeof ResizeObserver === 'undefined') {
        window.removeEventListener('resize', resizeHandler);
      }
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
    if (!chartContainer.current || typeof ResizeObserver === 'undefined') return undefined;

    const resizeObserver = new ResizeObserver(() => {
      resizeHandler();
    });

    resizeObserver.observe(chartContainer.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeHandler]);

  useEffect(() => {
    if (!chart.current) return;
    chart.current.applyOptions(withoutAttributionLogo(chartOptions));
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
