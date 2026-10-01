import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import PostContent from '../PostContent';

vi.mock('@/components/social/PostTokenTag', () => ({
  default: ({ symbol, options, compact }: {
    symbol: string; options: Record<string, boolean>; compact?: boolean;
  }) => (
    <span data-testid="market-card" data-compact={compact} data-price={options.price}>
      {symbol}
    </span>
  ),
}));

const view = (content: string) => render(
  <MemoryRouter><PostContent content={content} /></MemoryRouter>,
);

beforeEach(() => changeLanguage('en'));

describe('post reading layout', () => {
  it('preserves prose and punctuation while placing advanced market cards below the text', () => {
    const { container } = view('An idea: #LONG-TREND{mode=advanced} (#SI{mode=advanced}) stays readable.');
    const text = container.querySelector('.post-content__text')!;
    expect(text).toHaveTextContent('An idea: #LONG-TREND (#SI) stays readable.');
    expect(within(text as HTMLElement).queryByTestId('market-card')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#LONG-TREND' }))
      .toHaveAttribute('href', '/trends/tokens/LONG-TREND?showTrade=0');
    const cards = screen.getByRole('region', { name: 'Mentioned trends' });
    expect(within(cards).getAllByTestId('market-card')).toHaveLength(2);
    expect(within(cards).getAllByTestId('market-card')[0]).toHaveAttribute('data-compact', 'true');
  });

  it('deduplicates repeated cards but retains every inline mention and distinct display choices', () => {
    view('#AE{mode=advanced} and #AE{mode=advanced} then #AE{mode=advanced;price=0}.');
    expect(screen.getAllByRole('link', { name: '#AE' })).toHaveLength(3);
    const cards = screen.getAllByTestId('market-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('data-price', 'true');
    expect(cards[1]).toHaveAttribute('data-price', 'false');
  });

  it('keeps compact author-selected tags inline and does not interpret markup as HTML', () => {
    const { container } = view('Text <img src=x onerror=alert(1)> #AE{mode=compact}\nNext line');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByTestId('market-card')).not.toHaveAttribute('data-compact');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.post-content__text'))
      .toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(container.querySelector('br')).not.toBeNull();
  });
});
