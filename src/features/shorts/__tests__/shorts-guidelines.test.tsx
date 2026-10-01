import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import { ShortsGuidelines } from '../shorts-guidelines';
import { ShortsJourney } from '../shorts-journey';
import type { Short } from '../types';

const video = (overrides: Partial<Short> = {}): Short => ({
  id: 'example',
  title: 'My story',
  creator: 'creator',
  topic: 'Art',
  status: 'pending',
  moderation: 'pending',
  hostingStatus: 'unfunded',
  guidelines: { status: 'reviewing' },
  cid: 'bafy-example',
  bytes: 1000,
  duration: 10,
  until: 0,
  likes: 0,
  views: 0,
  liked: false,
  mine: true,
  videoUrl: '',
  posterUrl: '',
  ...overrides,
});
const show = (short: Short, busy = false) => {
  const fund = vi.fn(); const retry = vi.fn();
  render(
    <MemoryRouter>
      <ShortsJourney video={short} busy={busy} fund={fund} />
      <ShortsGuidelines video={short} busy={busy} retry={retry} />
    </MemoryRouter>,
  );
  return { fund, retry };
};

describe('Hosting and community-guidelines status', () => {
  it('allows hosting while a video is still being reviewed without promising feed inclusion', () => {
    const { fund } = show(video());
    expect(screen.getByRole('heading', { name: 'Under review' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose hosting' }));
    expect(fund).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Watch & share' })).not.toBeInTheDocument();
    expect(screen.queryByText('Visual content inspection')).not.toBeInTheDocument();
  });

  it('keeps paid hosting renewable when the video is excluded from the feed', () => {
    const { fund } = show(video({
      status: 'rejected', moderation: 'rejected', hostingStatus: 'active', until: Date.now() + 86400000, guidelines: { status: 'ineligible', reason: 'This video contains spam.' },
    }));
    expect(screen.getByRole('heading', { name: 'Your video is hosted' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not eligible for the feed' })).toBeInTheDocument();
    expect(screen.getByText('This video contains spam.')).toBeInTheDocument();
    expect(screen.getByText(/Your paid hosting is unaffected/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Extend hosting' }));
    expect(fund).toHaveBeenCalledOnce();
  });

  it('explains a check outage without exposing model diagnostics or blocking hosting', () => {
    const { retry } = show(video({ guidelines: { status: 'unavailable' } }));
    expect(screen.getByRole('heading', { name: 'Checks temporarily unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose hosting' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry check' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('only shows a live feed link after review and active hosting', () => {
    show(video({ status: 'active', hostingStatus: 'active', guidelines: { status: 'eligible' } }));
    expect(screen.getByRole('link', { name: 'Watch & share' })).toHaveAttribute('href', '/shorts?short=example');
    expect(screen.getByRole('heading', { name: 'Eligible for the feed' })).toBeInTheDocument();
  });

  it('does not offer hosting or a feed link for withdrawn videos', () => {
    show(video({ status: 'withdrawn', hostingStatus: 'withdrawn', guidelines: { status: 'eligible' } }));
    expect(screen.queryByRole('button', { name: /hosting/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Watch & share' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create another Short' })).toBeInTheDocument();
  });

  it('prevents duplicate funding or check requests while busy', () => {
    show(video({ guidelines: { status: 'unavailable' } }), true);
    expect(screen.getByRole('button', { name: 'Choose hosting' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
  });
});
