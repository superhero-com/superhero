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
    expect(screen.getByRole('link', { name: 'Launch a trend' })).toHaveAttribute('href', '/trends/create');
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByRole('heading', { name: 'Your voice. On-chain.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start posting' }));
    expect(post).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Launch a trend' })).not.toBeInTheDocument();
  });

  it('retains all language collection destinations', () => {
    showCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 5' }));
    [['English', 'WORDS'], ['中文', 'CHINESE'], ['Русский', 'RUSSIAN'], ['العربية', 'ARABIC']].forEach(([name, collection]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `/trends/tokens?collection=${collection}`);
    });
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
    expect(screen.getByRole('heading', { name: 'Your ideas. Superpowered.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get Superhero' })).toHaveAttribute('href', '/landing');
    expect(localStorage.getItem('hero_banner_dismissed_until')).toBeNull();
  });

  it('uses the Arabic layout direction and translated content', async () => {
    await changeLanguage('ar');
    showCarousel();
    expect(mocks.options.every((options) => options.direction === 'rtl')).toBe(true);
    expect(screen.getByRole('heading', { name: 'أطلق ترندًا. واجعله لك.' })).toBeInTheDocument();
  });

  it('does not restart autoplay for reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    showCarousel();
    fireEvent.mouseLeave(screen.getByRole('region', { name: 'Superhero banner' }));
    expect(mocks.expanded.plugins().autoplay.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(screen.getByRole('heading', { name: 'Your voice. On-chain.' })).toBeInTheDocument();
  });
});
