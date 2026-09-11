import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import SwapConfirmation from '../SwapConfirmation';

vi.mock('../SwapRouteInfo', () => ({ default: () => null }));

describe('SwapConfirmation exchange rates', () => {
  it('normalizes both rates correctly for fractional token amounts', () => {
    render(
      <SwapConfirmation
        show
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        tokenIn={{ address: 'token-in', symbol: 'IN', decimals: 18 } as any}
        tokenOut={{ address: 'token-out', symbol: 'OUT', decimals: 18 } as any}
        amountIn="0.5"
        amountOut="0.25"
        isExactIn
        slippagePct={1}
        deadlineMins={20}
        priceImpactPct={0}
        routeInfo={{ path: ['token-in', 'token-out'] }}
        tokens={[]}
      />,
    );

    expect(screen.getByText('1 IN = 0.5 OUT')).toBeInTheDocument();
    expect(screen.getByText('1 OUT = 2 IN')).toBeInTheDocument();
  });
});
