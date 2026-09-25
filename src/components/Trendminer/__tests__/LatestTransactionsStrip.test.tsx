import {
  act, fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import LatestTransactionsStrip, { type ActivityTransaction } from '../LatestTransactionsStrip';

const first: ActivityTransaction = {
  id: 1,
  tx_type: 'buy',
  account: 'ak_2MCVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4oT4',
  token: { name: 'SUPERHERO' },
  volume: '24800',
};
const incoming: ActivityTransaction = { ...first, id: 2, token: { name: 'NEW' } };
const view = (transactions: ActivityTransaction[]) => (
  <MemoryRouter><LatestTransactionsStrip transactions={transactions} /></MemoryRouter>
);
const getTrack = () => document.getElementById(
  screen.getByRole('button', { name: /Older activity|نشاطات أقدم/ }).getAttribute('aria-controls')!,
)!;
const measureTrack = (position: number, width = 320, contentWidth = 1100) => {
  const track = getTrack();
  Object.defineProperties(track, {
    clientWidth: { configurable: true, value: width },
    scrollWidth: { configurable: true, value: contentWidth },
    scrollLeft: { configurable: true, writable: true, value: position },
  });
  fireEvent.scroll(track);
  return track;
};

beforeEach(async () => {
  await changeLanguage('en');
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
});

afterEach(() => vi.restoreAllMocks());

describe('latest activity strip', () => {
  it('preserves token destinations, actor identity, and transaction quantities', () => {
    render(view([
      first,
      {
        ...first, id: 2, tx_type: 'sell', token: { name: '牛来 / AE' }, volume: '8200',
      },
      {
        ...first, id: 3, tx_type: 'create_community', token: { name: 'MUSIC' }, volume: '2000000',
      },
    ]));
    const bought = screen.getByRole('link', { name: /SUPERHERO · Bought/ });
    expect(bought).toHaveAttribute('href', '/trends/tokens/SUPERHERO');
    expect(bought).toHaveTextContent('ak_2MCV…4oT4');
    expect(bought).toHaveTextContent('24.8K tokens');
    expect(screen.getByRole('link', { name: /牛来 \/ AE · Sold/ }))
      .toHaveAttribute('href', `/trends/tokens/${encodeURIComponent('牛来 / AE')}`);
    expect(screen.getByRole('link', { name: /MUSIC · Created/ })).toHaveTextContent('2.00M tokens');
  });

  it('does not label an AE amount or invalid volume as tokens, and keeps unknown events neutral', () => {
    const aeOnly = { ...first, volume: undefined, amount: { ae: 42 } };
    render(view([
      aeOnly,
      { ...first, id: 2, volume: '0' },
      { ...first, id: 3, volume: '-2' },
      { ...first, id: 4, volume: 'invalid' },
      { ...first, id: 5, volume: 'Infinity' },
      { id: 6, tx_type: 'other' },
    ]));
    expect(screen.queryByText('tokens')).not.toBeInTheDocument();
    expect(screen.getByText('Transaction')).toBeInTheDocument();
    expect(screen.getByText('Unknown token')).toBeInTheDocument();
    expect(screen.getByText('Unknown trader')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('holds incoming events while hovered or keyboard-focused, then resumes', () => {
    const { rerender } = render(view([first]));
    const region = screen.getByRole('region', { name: 'Latest activity' });
    fireEvent.pointerEnter(region, { pointerType: 'mouse' });
    rerender(view([incoming, first]));
    expect(screen.queryByRole('link', { name: /^NEW/ })).not.toBeInTheDocument();
    const link = screen.getByRole('link');
    act(() => link.focus());
    fireEvent.pointerLeave(region);
    expect(link).toHaveFocus();
    expect(screen.queryByRole('link', { name: /^NEW/ })).not.toBeInTheDocument();
    act(() => link.blur());
    expect(screen.getByRole('link', { name: /^NEW/ })).toBeInTheDocument();
  });

  it('keeps the event list stable while browsing older entries or swiping', () => {
    const { rerender } = render(view([first]));
    fireEvent.wheel(getTrack());
    measureTrack(288);
    rerender(view([incoming, first]));
    expect(screen.queryByRole('link', { name: /^NEW/ })).not.toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Latest activity' });
    fireEvent.touchStart(region);
    measureTrack(0);
    expect(screen.queryByRole('link', { name: /^NEW/ })).not.toBeInTheDocument();
    fireEvent.touchEnd(region);
    expect(screen.getByRole('link', { name: /^NEW/ })).toBeInTheDocument();
  });

  it('supports manual scrolling and disables arrows at the corresponding edge', () => {
    render(view([first, incoming]));
    const track = measureTrack(0);
    const scrollBy = vi.fn();
    track.scrollBy = scrollBy;
    expect(scrollBy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Newer activity' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Older activity' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 288, behavior: 'smooth' });
    measureTrack(780);
    expect(screen.getByRole('button', { name: 'Older activity' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Newer activity' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -288, behavior: 'smooth' });
    measureTrack(0, 1000, 560);
    expect(screen.getByRole('button', { name: 'Older activity' })).toBeDisabled();
  });

  it('advances automatically at a steady pace, pauses on interaction, and stops at the end', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    render(view([first, incoming]));
    const track = measureTrack(0);
    act(() => frames.at(-1)!(1000));
    act(() => frames.at(-1)!(1100));
    expect(track.scrollLeft).toBeCloseTo(3.2);
    const region = screen.getByRole('region', { name: 'Latest activity' });
    fireEvent.pointerEnter(region, { pointerType: 'mouse' });
    expect(cancel).toHaveBeenCalled();
    const count = frames.length;
    act(() => screen.getAllByRole('link')[0].focus());
    fireEvent.pointerLeave(region);
    expect(frames).toHaveLength(count);
    act(() => screen.getAllByRole('link')[0].blur());
    expect(frames.length).toBeGreaterThan(count);
    track.scrollLeft = 779;
    act(() => frames.at(-1)!(1200));
    const beforeLastFrame = frames.length;
    act(() => frames.at(-1)!(1300));
    expect(track.scrollLeft).toBe(780);
    expect(frames).toHaveLength(beforeLastFrame);
    expect(screen.getByRole('button', { name: 'Older activity' })).toBeDisabled();
  });

  it('reverses scroll direction in Arabic and respects reduced motion', async () => {
    await changeLanguage('ar');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList));
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame');
    render(view([first, incoming]));
    const track = measureTrack(0);
    expect(requestFrame).not.toHaveBeenCalled();
    const scrollBy = vi.fn();
    track.scrollBy = scrollBy;
    fireEvent.click(screen.getByRole('button', { name: 'نشاطات أقدم' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: -288, behavior: 'instant' });
    measureTrack(-780);
    expect(screen.getByRole('button', { name: 'نشاطات أقدم' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'نشاطات أحدث' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 288, behavior: 'instant' });
    expect(within(screen.getByRole('link', { name: /SUPERHERO/ })).getByText('اشترى'))
      .toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('replaces the quiet loading placeholders when initial events arrive', () => {
    const { rerender } = render(view([]));
    expect(screen.getByRole('status', { name: 'Loading activity' })).toBeInTheDocument();
    fireEvent.pointerEnter(screen.getByRole('region', { name: 'Latest activity' }));
    rerender(view([first]));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SUPERHERO/ })).toBeInTheDocument();
  });
});
