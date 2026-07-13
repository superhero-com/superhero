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
  DropdownMenuContent: ({
    children, collisionPadding, ...props
  }: any) => (
    <div
      data-testid="dropdown-content"
      data-collision-padding-left={
        collisionPadding && typeof collisionPadding === 'object'
          ? String(collisionPadding.left)
          : ''
      }
      {...props}
    >
      {children}
    </div>
  ),
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
  let onPopularWeightsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSortChange = vi.fn();
    onPopularWeightsChange = vi.fn();
  });

  const renderControls = (overrides: Record<string, any> = {}) => render(
    <MemoryRouter>
      <SortControls
        sortBy="hot"
        onSortChange={onSortChange}
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
    it('opens the desktop customize dropdown away from the left rail', () => {
      renderControls();
      const dropdownContent = screen.getByTestId('dropdown-content');
      expect(dropdownContent).toHaveAttribute('align', 'start');
    });

    it('uses wide left collision padding only when the lg sidebar is present', () => {
      const createMql = (matches: boolean): Partial<MediaQueryList> => ({
        matches,
        media: '(min-width: 1024px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
        () => createMql(false) as MediaQueryList,
      );

      const { unmount } = renderControls();
      expect(screen.getByTestId('dropdown-content')).toHaveAttribute('data-collision-padding-left', '16');

      unmount();
      matchMediaSpy.mockImplementation(() => createMql(true) as MediaQueryList);
      renderControls();
      expect(screen.getByTestId('dropdown-content')).toHaveAttribute('data-collision-padding-left', '272');

      matchMediaSpy.mockRestore();
    });

    it('renders all 10 weight labels', () => {
      renderControls();
      const expectedLabels = [
        'Comments', 'Tip Amount', 'Tip Count', 'Unique Tippers',
        'Trending Boost', 'Content Quality', 'Reads', 'Activity Rate',
        'Freshness', 'Daily Shuffle',
      ];
      expectedLabels.forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders low/med/high toggles for each weight', () => {
      renderControls();
      expect(screen.getAllByText('low').length).toBeGreaterThanOrEqual(10);
      expect(screen.getAllByText('med').length).toBeGreaterThanOrEqual(10);
      expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(10);
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

    it('does not render Reset when defaults are active', () => {
      renderControls({ popularWeights: {} });
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('resets custom weights on click', () => {
      renderControls({ popularWeights: { comments: 'high' } });
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
