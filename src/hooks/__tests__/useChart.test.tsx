import { render } from '@testing-library/react';
import { ChartOptions, ColorType, DeepPartial } from 'lightweight-charts';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { useChart } from '../useChart';

const { createChartCalls, applyOptionsCalls } = vi.hoisted(() => ({
  createChartCalls: [] as DeepPartial<ChartOptions>[],
  applyOptionsCalls: [] as DeepPartial<ChartOptions>[],
}));

vi.mock('lightweight-charts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lightweight-charts')>();
  return {
    ...actual,
    createChart: (_container: HTMLElement, options: DeepPartial<ChartOptions>) => {
      createChartCalls.push(options);
      return {
        remove: () => {},
        applyOptions: (updated: DeepPartial<ChartOptions>) => {
          applyOptionsCalls.push(updated);
        },
        resize: () => {},
      };
    },
  };
});

const Harness = ({ chartOptions }: { chartOptions?: DeepPartial<ChartOptions> }) => {
  const { chartContainer } = useChart({ chartOptions });
  return <div ref={chartContainer} />;
};

/** The options `useChart` handed to `createChart` for the one chart a test mounted. */
function mountedOptions(chartOptions?: DeepPartial<ChartOptions>): DeepPartial<ChartOptions> {
  render(<Harness chartOptions={chartOptions} />);
  expect(createChartCalls).toHaveLength(1);
  return createChartCalls[0];
}

describe('useChart layout options', () => {
  beforeEach(() => {
    createChartCalls.length = 0;
    applyOptionsCalls.length = 0;
  });

  /**
   * lightweight-charts writes its attribution logo with innerHTML, which the Trusted Types
   * `default` policy blanks under the enforcing CSP — silently, with no violation event. The
   * licence's link is carried by <TradingViewAttribution> instead, so the logo must stay off
   * for every caller. See src/utils/trustedTypes.ts and e2e/csp.spec.ts.
   */
  it('disables the attribution logo', () => {
    expect(mountedOptions().layout?.attributionLogo).toBe(false);
  });

  it('keeps the attribution logo off when a caller passes its own layout', () => {
    const options = mountedOptions({
      layout: {
        textColor: 'white',
        background: {
          topColor: 'rgba(0, 0, 0, 0.00)',
          bottomColor: 'rgba(0, 0, 0, 0.13)',
          type: ColorType.VerticalGradient,
        },
      },
    });

    expect(options.layout?.attributionLogo).toBe(false);
  });

  it('cannot be talked into re-enabling the attribution logo at creation', () => {
    const options = mountedOptions({ layout: { attributionLogo: true } });

    expect(options.layout?.attributionLogo).toBe(false);
  });

  /**
   * `useChart` re-applies the caller's options after mount, which is a second way back in: the
   * logo has to stay off on that path too, or the innerHTML write returns once the chart updates.
   */
  it('cannot be talked into re-enabling the attribution logo after mount', () => {
    mountedOptions({ layout: { attributionLogo: true } });

    expect(applyOptionsCalls.length).toBeGreaterThan(0);
    expect(applyOptionsCalls.map((o) => o.layout?.attributionLogo)).not.toContain(true);
    expect(applyOptionsCalls.some((o) => o.layout?.attributionLogo === false)).toBe(true);
  });

  it('lets the caller override individual layout keys', () => {
    const background = {
      topColor: 'rgba(0, 0, 0, 0.00)',
      bottomColor: 'rgba(0, 0, 0, 0.13)',
      type: ColorType.VerticalGradient,
    };
    const options = mountedOptions({ layout: { textColor: '#abcdef', background } });

    expect(options.layout?.textColor).toBe('#abcdef');
    expect(options.layout?.background).toEqual(background);
  });

  it('falls back to its own layout defaults for keys the caller omits', () => {
    const options = mountedOptions({ layout: { textColor: '#abcdef' } });

    expect(options.layout?.background).toEqual({
      color: 'transparent',
      type: ColorType.Solid,
    });
  });

  it('still passes the caller options that sit outside `layout`', () => {
    const timeFormatter = () => 'formatted';
    const options = mountedOptions({ localization: { timeFormatter } });

    expect(options.localization?.timeFormatter).toBe(timeFormatter);
    expect(options.crosshair?.vertLine?.color).toBe('#F4C10C');
  });
});
