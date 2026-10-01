import React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '../../../i18n';
import HeroBannerCarousel from '../HeroBannerCarousel';

const mocks = vi.hoisted(() => {
  const engine = () => {
    let index = 0;
    const listeners = new Set<() => void>();
    const autoplay = { play: vi.fn(), stop: vi.fn() };
    const scrollTo = vi.fn((next: number) => {
      index = (next + 6) % 6;
      listeners.forEach((listener) => listener());
    });
    return {
      selectedScrollSnap: () => index,
      on: vi.fn((_event: string, listener: () => void) => listeners.add(listener)),
      off: vi.fn((_event: string, listener: () => void) => listeners.delete(listener)),
      plugins: () => ({ autoplay }),
      reInit: vi.fn(),
      scrollTo,
      scrollPrev: () => scrollTo(index - 1),
      scrollNext: () => scrollTo(index + 1),
      reset: () => { index = 0; listeners.clear(); },
    };
  };
  return {
    expanded: engine(), collapsed: engine(), calls: 0, options: [] as { direction: string }[],
  };
});

vi.mock('embla-carousel-react', () => ({
  default: (options: { direction: string }) => {
    mocks.options.push(options);
    const api = mocks.calls % 2 === 0 ? mocks.expanded : mocks.collapsed;
    mocks.calls += 1;
    return [vi.fn(), api];
  },
}));
vi.mock('embla-carousel-autoplay', () => ({ default: vi.fn(() => ({})) }));

const showCarousel = (onStartPosting = vi.fn()) => {
  render(<MemoryRouter><HeroBannerCarousel onStartPosting={onStartPosting} /></MemoryRouter>);
  return onStartPosting;
};

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.calls = 0;
  mocks.options = [];
  mocks.expanded.reset();
  mocks.collapsed.reset();
  localStorage.clear();
  await changeLanguage('en');
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('HeroBannerCarousel', () => {
  it('keeps only the selected slide accessible and preserves the posting callback', () => {
    const post = showCarousel();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Launch a #trend' })).toHaveAttribute('href', '/trends/create');
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByRole('heading', { name: 'Post on-chain. Get tipped instantly.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start posting' }));
    expect(post).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Launch a #trend' })).not.toBeInTheDocument();
  });

  it('retains all language collection destinations', () => {
    showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 5' }));
    [['English', 'WORDS'], ['中文', 'CHINESE'], ['Русский', 'RUSSIAN'], ['العربية', 'ARABIC']].forEach(([name, collection]) => {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', `/trends/tokens?collection=${collection}`);
    });
  });

  it('keeps language destinations available while a keyboard user focuses them', () => {
    showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 5' }));
    const collection = screen.getByRole('link', { name: /#Bitcoin English/ });
    act(() => collection.focus());
    expect(mocks.expanded.plugins().autoplay.stop).toHaveBeenCalled();
    mocks.expanded.plugins().autoplay.play.mockClear();
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Superhero banner' }));
    expect(mocks.expanded.plugins().autoplay.play).not.toHaveBeenCalled();
    act(() => collection.blur());
    expect(mocks.expanded.plugins().autoplay.play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 6' }));
    expect(screen.queryByRole('link', { name: /#Bitcoin English/ })).not.toBeInTheDocument();
  });

  it('links the platform cards to the published apps and agent integration', () => {
    showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 6' }));
    const destinations = [
      ['iOS · App Store', 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846'],
      ['Android · Google Play', 'https://play.google.com/store/apps/details?id=com.superhero.apps'],
      ['AI agents · Openclaw / Claude', 'https://github.com/superhero-com/superhero-agent-skill'],
    ];
    destinations.forEach(([name, href]) => {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('labels sample activity and does not present the illustrative tip as a transaction', () => {
    showCarousel();
    expect(screen.getByText('$1.24')).toBeVisible();
    expect(screen.getAllByText('Example').filter((el) => !el.closest('[aria-hidden="true"]'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByText('Tip 5 AE')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tip 5 AE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tip 5 AE' })).not.toBeInTheDocument();
  });

  it('preserves the selected app slide across dismiss and expand', async () => {
    showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    expect(localStorage.getItem('hero_banner_dismissed_until')).toBeTruthy();
    await act(async () => { await new Promise((resolve) => { requestAnimationFrame(resolve); }); });
    expect(mocks.collapsed.selectedScrollSnap()).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Show banner' }));
    await act(async () => { await new Promise((resolve) => { requestAnimationFrame(resolve); }); });
    expect(screen.getByRole('heading', { name: 'Built for humans and AI agents.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/landing');
    expect(localStorage.getItem('hero_banner_dismissed_until')).toBeNull();
  });

  it('exposes only the active compact action and pauses autoplay during keyboard focus', async () => {
    const post = showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    await act(async () => { await new Promise((resolve) => { requestAnimationFrame(resolve); }); });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Launch a #trend' })).toHaveAttribute('href', '/trends/create');
    const next = screen.getByRole('button', { name: 'Next slide' });
    act(() => next.focus());
    expect(mocks.collapsed.plugins().autoplay.stop).toHaveBeenCalled();
    mocks.collapsed.plugins().autoplay.play.mockClear();
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Superhero banner' }));
    expect(mocks.collapsed.plugins().autoplay.play).not.toHaveBeenCalled();
    fireEvent.click(next);
    expect(screen.queryByRole('link', { name: 'Launch a #trend' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start posting' }));
    expect(post).toHaveBeenCalledOnce();
    // JSDOM has no pointer hit testing; the pointer has left the region.
    vi.spyOn(screen.getByRole('region', { name: 'Superhero banner' }), 'matches').mockReturnValue(false);
    act(() => next.blur());
    expect(mocks.collapsed.plugins().autoplay.play).toHaveBeenCalled();
  });

  it('restores a saved dismissal and keeps compact autoplay disabled for reduced motion', async () => {
    localStorage.setItem('hero_banner_dismissed_until', new Date(Date.now() + 86400000).toISOString());
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    showCarousel();
    await act(async () => { await new Promise((resolve) => { requestAnimationFrame(resolve); }); });
    expect(screen.getByRole('button', { name: 'Show banner' })).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Superhero banner' }));
    expect(mocks.collapsed.plugins().autoplay.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('button', { name: 'Start posting' })).toBeInTheDocument();
  });

  it('uses the Arabic layout direction and translated content', async () => {
    await changeLanguage('ar');
    showCarousel();
    expect(mocks.options.every((options) => options.direction === 'rtl')).toBe(true);
    expect(screen.getByRole('heading', { name: 'رمّز ‎#الترندات. تاجِر بالإشارة.' })).toBeInTheDocument();
  });

  it('does not restart autoplay for reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    showCarousel();
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Superhero banner' }));
    expect(mocks.expanded.plugins().autoplay.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('heading', { name: 'Post on-chain. Get tipped instantly.' })).toBeInTheDocument();
  });
});
