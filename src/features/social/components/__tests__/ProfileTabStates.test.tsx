import { render, screen, fireEvent } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { TabErrorState, TabOfflineBanner } from '../ProfileTabStates';

describe('TabOfflineBanner', () => {
  it('names the offline state and keeps its status role', () => {
    render(<TabOfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('Offline — showing last loaded');
  });
});

describe('TabErrorState', () => {
  it('says the header stays and only the tab failed', () => {
    render(<TabErrorState onRetry={() => {}} />);
    expect(screen.getByText("Couldn't load this tab")).toBeInTheDocument();
    expect(
      screen.getByText('The header above is real — only this tab failed.'),
    ).toBeInTheDocument();
  });

  it('offers a way out via Try again', () => {
    const onRetry = vi.fn();
    render(<TabErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
