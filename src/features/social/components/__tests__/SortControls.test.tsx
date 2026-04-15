import React from 'react';
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import SortControls, { type PopularWeights } from '../SortControls';

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  SlidersHorizontal: (props: any) => <span data-testid="sliders-icon" {...props} />,
  RotateCcw: (props: any) => <span data-testid="rotate-ccw" {...props} />,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, ...props }: any) => <div data-testid="dropdown-menu" {...props}>{children}</div>,
  DropdownMenuContent: ({ children, ...props }: any) => <div data-testid="dropdown-content" {...props}>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <button type="button" data-testid="dropdown-item" onClick={onClick} {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => children,
}));

vi.mock('../../../../components/ui/ae-button', () => ({
  AeButton: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
}));

describe('SortControls', () => {
  let onSortChange: ReturnType<typeof vi.fn>;
  let onPopularWindowChange: ReturnType<typeof vi.fn>;
  let onPopularWeightsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSortChange = vi.fn();
    onPopularWindowChange = vi.fn();
    onPopularWeightsChange = vi.fn();
  });

  const renderControls = (overrides: Record<string, any> = {}) => render(
    <SortControls
      sortBy="hot"
      onSortChange={onSortChange}
      popularWindow="24h"
      onPopularWindowChange={onPopularWindowChange}
      onPopularWeightsChange={onPopularWeightsChange}
      {...overrides}
    />,
  );

  describe('when popular feed is disabled', () => {
    it('renders "Latest Feed" heading', () => {
      renderControls({ popularFeedEnabled: false });
      expect(screen.getByText('Latest Feed')).toBeInTheDocument();
    });

    it('does not render the customize button', () => {
      renderControls({ popularFeedEnabled: false });
      expect(screen.queryByTitle('Customize popular feed')).not.toBeInTheDocument();
    });
  });

  describe('sort tabs', () => {
    it('renders Popular and Latest buttons', () => {
      renderControls();
      expect(screen.getAllByText('Popular').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Latest').length).toBeGreaterThanOrEqual(1);
    });

    it('calls onSortChange when clicking a Latest button', () => {
      renderControls();
      const latestButtons = screen.getAllByText('Latest');
      fireEvent.click(latestButtons[latestButtons.length - 1]);
      expect(onSortChange).toHaveBeenCalledWith('latest');
    });

    it('calls onSortChange when clicking a Popular button', () => {
      renderControls({ sortBy: 'latest' });
      const popularButtons = screen.getAllByText('Popular');
      fireEvent.click(popularButtons[popularButtons.length - 1]);
      expect(onSortChange).toHaveBeenCalledWith('hot');
    });
  });

  describe('time window pills', () => {
    it('renders Today, This week, All time when sortBy is hot', () => {
      renderControls();
      expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('This week').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('All time').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render time pills when sortBy is latest', () => {
      renderControls({ sortBy: 'latest' });
      expect(screen.queryByTitle('Customize popular feed')).not.toBeInTheDocument();
    });
  });

  describe('customize button', () => {
    it('renders the customize button when sortBy is hot', () => {
      renderControls();
      expect(screen.getAllByTitle('Customize popular feed').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render the customize button when sortBy is latest', () => {
      renderControls({ sortBy: 'latest' });
      expect(screen.queryByTitle('Customize popular feed')).not.toBeInTheDocument();
    });
  });

  describe('weight panel', () => {
    it('renders all 8 weight labels', () => {
      renderControls();
      const expectedLabels = [
        'Comments', 'Tip Amount', 'Tip Count', 'Unique Tippers',
        'Trending Boost', 'Content Quality', 'Reads', 'Activity Rate',
      ];
      expectedLabels.forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders low/med/high toggles for each weight', () => {
      renderControls();
      expect(screen.getAllByText('low').length).toBe(16);
      expect(screen.getAllByText('med').length).toBe(16);
      expect(screen.getAllByText('high').length).toBe(16);
    });

    it('calls onPopularWeightsChange with new weight when clicking a value', () => {
      renderControls();
      const highButtons = screen.getAllByText('high');
      fireEvent.click(highButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({ comments: 'high' });
    });

    it('does not fire when clicking the already-effective value (med default)', () => {
      renderControls();
      const medButtons = screen.getAllByText('med');
      fireEvent.click(medButtons[0]);
      expect(onPopularWeightsChange).not.toHaveBeenCalled();
    });

    it('removes a key when selecting med (reverts to default)', () => {
      renderControls({ popularWeights: { comments: 'high' } });
      const medButtons = screen.getAllByText('med');
      fireEvent.click(medButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({});
    });

    it('renders the Reset button when custom weights exist', () => {
      renderControls({ popularWeights: { comments: 'high' } });
      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render the Reset button when no custom weights', () => {
      renderControls({ popularWeights: {} });
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('calls onPopularWeightsChange with empty object on Reset click', () => {
      renderControls({ popularWeights: { comments: 'high', reads: 'low' } });
      const resetButtons = screen.getAllByText('Reset');
      fireEvent.click(resetButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({});
    });
  });

  describe('weight change logic edge cases', () => {
    it('sets a non-default value correctly', () => {
      renderControls({ popularWeights: {} });
      const lowButtons = screen.getAllByText('low');
      fireEvent.click(lowButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({ comments: 'low' });
    });

    it('switches from one non-default to another non-default', () => {
      renderControls({ popularWeights: { comments: 'low' } });
      const highButtons = screen.getAllByText('high');
      fireEvent.click(highButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({ comments: 'high' });
    });

    it('preserves other weights when changing one', () => {
      const weights: PopularWeights = { comments: 'high', reads: 'low' };
      renderControls({ popularWeights: weights });
      const lowButtons = screen.getAllByText('low');
      fireEvent.click(lowButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({ comments: 'low', reads: 'low' });
    });
  });
});
