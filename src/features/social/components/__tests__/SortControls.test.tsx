import React from 'react';
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
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
  Rocket: (props: any) => <span data-testid="rocket-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, ...props }: any) => <div data-testid="dropdown-menu" {...props}>{children}</div>,
  DropdownMenuContent: ({ children, ...props }: any) => <div data-testid="dropdown-content" {...props}>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <button type="button" data-testid="dropdown-item" onClick={onClick} {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div data-testid="dialog-content" {...props}>{children}</div>,
  DialogDescription: ({ children, ...props }: any) => <div data-testid="dialog-description" {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <div data-testid="dialog-title" {...props}>{children}</div>,
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
    <MemoryRouter>
      <SortControls
        sortBy="hot"
        onSortChange={onSortChange}
        popularWindow="24h"
        onPopularWindowChange={onPopularWindowChange}
        onPopularWeightsChange={onPopularWeightsChange}
        {...overrides}
      />
    </MemoryRouter>,
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

  describe('tokenize trend button', () => {
    it('renders Tokenize Trend link', () => {
      renderControls();
      const links = screen.getAllByText('Tokenize Trend');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });

    it('links to /trends/create', () => {
      renderControls();
      const links = screen.getAllByText('Tokenize Trend');
      const linkEl = links[0].closest('a');
      expect(linkEl).toHaveAttribute('href', '/trends/create');
    });

    it('renders Tokenize Trend even when sortBy is latest', () => {
      renderControls({ sortBy: 'latest' });
      const links = screen.getAllByText('Tokenize Trend');
      expect(links.length).toBeGreaterThanOrEqual(1);
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

  describe('customize dropdown content', () => {
    it('contains time window buttons (Today, This week, All time)', () => {
      renderControls();
      expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('This week').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('All time').length).toBeGreaterThanOrEqual(1);
    });

    it('calls onPopularWindowChange when clicking a time window', () => {
      renderControls();
      const weekButtons = screen.getAllByText('This week');
      fireEvent.click(weekButtons[0]);
      expect(onPopularWindowChange).toHaveBeenCalledWith('7d');
    });

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
      expect(screen.getAllByText('low').length).toBeGreaterThanOrEqual(8);
      expect(screen.getAllByText('med').length).toBeGreaterThanOrEqual(8);
      expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(8);
    });

    it('calls onPopularWeightsChange when clicking a weight value', () => {
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
  });

  describe('reset button', () => {
    it('renders Reset when custom weights exist', () => {
      renderControls({ popularWeights: { comments: 'high' } });
      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Reset when non-default window is set', () => {
      renderControls({ popularWindow: '7d' });
      const resetButtons = screen.getAllByText('Reset');
      expect(resetButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render Reset when defaults are active', () => {
      renderControls({ popularWeights: {}, popularWindow: '24h' });
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('resets both weights and window on click', () => {
      renderControls({ popularWeights: { comments: 'high' }, popularWindow: '7d' });
      const resetButtons = screen.getAllByText('Reset');
      fireEvent.click(resetButtons[0]);
      expect(onPopularWeightsChange).toHaveBeenCalledWith({});
      expect(onPopularWindowChange).toHaveBeenCalledWith('24h');
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
