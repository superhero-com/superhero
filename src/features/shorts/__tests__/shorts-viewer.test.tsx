import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsViewer } from '../shorts-viewer';
import type { Short } from '../types';
import { defaultPreferences } from '../shorts-preferences';

vi.mock('../shorts-creator', () => ({
  ShortsCreator: ({ address }: { address: string }) => <div>{address}</div>,
  ShortsCreatorAvatar: () => null,
}));
vi.mock('../shorts-follow', () => ({ ShortsFollow: () => null }));
vi.mock('../use-short-hls', async () => {
  const { useEffect } = await import('react');
  return {
    useShortHls: (ref: { current: HTMLVideoElement | null }, id: string, warm: boolean) => {
      useEffect(() => {
        if (warm) ref.current?.setAttribute('src', `blob:hls/${id}`);
      }, [ref, id, warm]);
      return { status: 'ready', token: 'measured-token', retry: vi.fn() };
    },
  };
});

const clips = ['one', 'two'].map((id) => ({
  id,
  title: `Video ${id}`,
  creator: 'ak_full_creator_address',
  topic: 'Art',
  duration: 20,
  status: 'active',
  cid: `bafy-${id}`,
  bytes: 100,
  publicationStatus: 'published',
  likes: 2,
  views: 3,
  liked: false,
  mine: false,
  moderation: 'approved',
} satisfies Short));
const makeProps = () => ({
  pricing: { network: 'ae_uat' as const, likeFeeAetto: '100000000000000000', treasuryBps: 2000 },
  feed: clips,
  topics: ['All', 'Art'],
  topic: 'All',
  onTopic: vi.fn(),
  onLike: vi.fn(),
  onPlayback: vi.fn(),
  personal: { preferences: { ...defaultPreferences }, update: vi.fn(), toggle: vi.fn() },
  onReport: vi.fn(),
  onStudio: vi.fn(),
  onUpload: vi.fn(),
  message: '',
  onDismissMessage: vi.fn(),
  busy: false,
  suspended: false,
  ready: true,
});

it('offers accessible pagination retry and a latest-feed action without replacing the current player', () => {
  const props = { ...makeProps(), feed: [clips[0]] };
  const pagination = {
    next: 'next-page', loading: false, error: 'Please try again.', more: vi.fn(), restart: vi.fn(), focus: vi.fn(),
  };
  const view = render(<MemoryRouter><ShortsViewer {...props} pagination={pagination} /></MemoryRouter>);
  const video = view.container.querySelector('video');
  expect(pagination.more).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(pagination.more).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh Shorts feed' })); expect(pagination.restart).toHaveBeenCalledOnce();
  view.rerender(<MemoryRouter><ShortsViewer {...props} feed={[...clips]} pagination={{ ...pagination, error: '', next: null }} /></MemoryRouter>);
  expect(view.container.querySelector('video')).toBe(video);
  expect(pagination.focus).toHaveBeenCalledWith('one');
});
let playing: WeakMap<HTMLMediaElement, boolean>;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
  playing = new WeakMap();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function pausedState(this: HTMLMediaElement) { return !playing.get(this); });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play(this: HTMLMediaElement) {
    playing.set(this, true); this.dispatchEvent(new Event('play')); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause(this: HTMLMediaElement) {
    playing.set(this, false); this.dispatchEvent(new Event('pause'));
  });
  Element.prototype.scrollTo = vi.fn();
});
const mount = (props = makeProps()) => {
  const view = render(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
  const region = screen.getByRole('region', { name: 'Shorts video feed' });
  Object.defineProperty(region, 'clientHeight', { value: 700 });
  return { ...view, region, videos: [...view.container.querySelectorAll('video')] };
};
describe('Shorts playback lifecycle', () => {
  it('uses the same release price in the Like action and details, then removes it when unavailable', () => {
    const props = {
      ...makeProps(),
      feed: [clips[0]],
      pricing: {
        network: 'ae_mainnet' as const, likeFeeAetto: '2000000000000000000', treasuryBps: 2500,
      },
    };
    const view = render(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Like for 2 AE' })).toBeEnabled();
    expect(screen.getByText('Mainnet')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Video details and report' }));
    expect(screen.getByText(/Each Like costs 2 AE: 1.5 AE to the creator and 0.5 AE/)).toBeVisible();
    view.rerender(<MemoryRouter><ShortsViewer {...props} pricing={undefined} /></MemoryRouter>);
    expect(screen.queryByText('Mainnet')).not.toBeInTheDocument();
    expect(screen.getByText('Like payment details are temporarily unavailable.')).toBeVisible();
  });

  it('has no playback opt-in controls and never starts measurement for an unplayed video', () => {
    const props = makeProps();
    mount(props);
    fireEvent(window, new Event('pagehide'));
    expect(props.onPlayback.mock.calls.every((call) => call[0] === 'one')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'For you' }));
    expect(screen.queryByRole('checkbox', { name: /playback/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete my playback/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset feed preferences' })).toBeVisible();
  });
  it('hands playback to the visible clip and pauses every clip while a payment is open', () => {
    const props = makeProps();
    const { region, videos, rerender } = mount(props);
    expect(videos.map((video) => video.paused)).toEqual([false, true]);
    fireEvent.scroll(region, { target: { scrollTop: 700 } });
    expect(videos.map((video) => video.paused)).toEqual([true, false]);
    rerender(<MemoryRouter><ShortsViewer {...props} suspended /></MemoryRouter>);
    expect(videos.map((video) => video.paused)).toEqual([true, true]);
    rerender(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
    expect(videos.map((video) => video.paused)).toEqual([true, false]);
  });
  it('preserves an explicit pause when closing an overlay and pauses on browser backgrounding', () => {
    const props = makeProps();
    const { videos, rerender } = mount(props);
    fireEvent.click(screen.getAllByRole('button', { name: 'Pause video' })[0]);
    rerender(<MemoryRouter><ShortsViewer {...props} suspended /></MemoryRouter>);
    rerender(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
    expect(videos[0].paused).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Play video' })[0]);
    expect(videos[0].paused).toBe(false);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(videos.every((video) => video.paused)).toBe(true);
  });
  it('requires actual playback time rather than seeking to count a preview view', () => {
    const props = makeProps();
    const { videos } = mount(props);
    videos[0].currentTime = 10;
    fireEvent.seeking(videos[0]); fireEvent.timeUpdate(videos[0]);
    expect(props.onPlayback.mock.calls.every((call) => call[2] === 0)).toBe(true);
    let now = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    [10.5, 11, 11.5, 12].forEach((position) => {
      now += 500;
      videos[0].currentTime = position; fireEvent.timeUpdate(videos[0]);
    });
    expect(props.onPlayback).toHaveBeenCalledWith('one', expect.any(String), 2, 'measured-token');
  });
  it('measures the playing video automatically and flushes a partial heartbeat on pause', () => {
    const props = makeProps();
    const { videos, rerender } = mount(props);
    expect(screen.getAllByText('3 views')).toHaveLength(2);
    expect(props.onPlayback).toHaveBeenCalledWith('one', expect.any(String), 0, 'measured-token');
    expect(props.onPlayback.mock.calls.every((call) => call[0] === 'one')).toBe(true);
    let now = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    [0.5, 1, 1.5, 2, 2.5].forEach((position) => {
      now += 500; videos[0].currentTime = position; fireEvent.timeUpdate(videos[0]);
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Pause video' })[0]);
    expect(props.onPlayback).toHaveBeenLastCalledWith('one', expect.any(String), 2.5, 'measured-token');
    const callback = vi.fn();
    rerender(<MemoryRouter><ShortsViewer {...props} onPlayback={callback} /></MemoryRouter>);
    fireEvent.play(videos[0]);
    expect(callback).not.toHaveBeenCalledWith('one', expect.any(String), 0, 'measured-token');
  });
  it('counts the final segment of a two-second Short before looping, without adding another completion', () => {
    const props = { ...makeProps(), feed: [{ ...clips[0], duration: 2 }] };
    const { videos } = mount(props);
    let now = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    [0.5, 1, 1.5].forEach((position) => {
      now += 500; videos[0].currentTime = position; fireEvent.timeUpdate(videos[0]);
    });
    now += 500; videos[0].currentTime = 2; fireEvent.ended(videos[0]);
    expect(props.onPlayback).toHaveBeenLastCalledWith('one', expect.any(String), 2, 'measured-token');
    expect(videos[0].currentTime).toBe(0);
    [0.5, 1, 1.5, 2].forEach((position) => {
      now += 500; videos[0].currentTime = position; fireEvent.timeUpdate(videos[0]);
    });
    expect(props.onPlayback.mock.calls.filter((call) => call[2] === 2)).toHaveLength(1);
  });
});

describe('Shared video content cover', () => {
  it('keeps rejected content blurred without loading video or audio until the viewer chooses to reveal it', () => {
    const props = { ...makeProps(), feed: [{ ...clips[0], moderation: 'rejected', contentWarning: 'feed-excluded' as const }], shared: true };
    const { container } = render(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Not eligible for the feed' })).toBeInTheDocument();
    expect(container.querySelector('.sv-warning-poster')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'k' });
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(props.onPlayback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'View video' }));
    expect(container.querySelector('video')).toHaveAttribute('src', 'blob:hls/one');
    fireEvent.click(screen.getByRole('button', { name: 'Hide video' }));
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View video' })).toBeInTheDocument();
  });

  it('explains incomplete checks and resets the cover for a different shared video', () => {
    const props = { ...makeProps(), feed: [{ ...clips[0], contentWarning: 'unreviewed' as const }], shared: true };
    const { container, rerender } = render(<MemoryRouter><ShortsViewer {...props} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'This video is under review' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View video' }));
    expect(container.querySelector('video')).toBeInTheDocument();
    rerender(<MemoryRouter><ShortsViewer {...props} feed={[{ ...clips[1], contentWarning: 'feed-excluded' }]} /></MemoryRouter>);
    expect(container.querySelector('video')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not eligible for the feed' })).toBeInTheDocument();
  });
});

describe('Long feed memory bounds', () => {
  it('retains the current player and restores its position after reordering and window eviction', () => {
    const feed = Array.from({ length: 60 }, (_, i) => ({ ...clips[0], id: `short-${i}` }));
    const props = { ...makeProps(), feed };
    const { container, region, rerender } = mount(props);
    fireEvent.scroll(region, { target: { scrollTop: 700 * 39 } });
    const video = container.querySelector('[data-short-id="short-39"] video');
    // New candidates evict older metadata; ranking can also move the current ID.
    const next = [...feed.slice(20, 39), ...feed.slice(40), feed[39]];
    rerender(<MemoryRouter><ShortsViewer {...props} feed={next} /></MemoryRouter>);
    expect(container.querySelector('[data-short-id="short-39"] video')).toBe(video);
    expect(container.querySelector('article:not([inert])')).toHaveAttribute('data-short-id', 'short-39');
    expect(region.scrollTo).toHaveBeenLastCalledWith({ top: 700 * 39, behavior: 'instant' });
    rerender(<MemoryRouter><ShortsViewer {...props} feed={[feed[39], ...next.slice(0, -1)]} /></MemoryRouter>);
    expect(container.querySelector('[data-short-id="short-39"] video')).toBe(video);
    expect(region.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });

  it('mounts only nearby cards and keeps the correct absolute position after a long scroll', () => {
    const props = { ...makeProps(), feed: Array.from({ length: 1000 }, (_, i) => ({ ...clips[0], id: `short-${i}`, title: `Clip ${i}` })) };
    const { container, region } = mount(props);
    expect(container.querySelectorAll('article')).toHaveLength(3);
    expect(container.querySelectorAll('video').length).toBeLessThanOrEqual(5);
    fireEvent.scroll(region, { target: { scrollTop: 700 * 500 } });
    expect(container.querySelectorAll('article')).toHaveLength(5);
    expect(container.querySelector('article:not([inert])')).toHaveAttribute('data-short-id', 'short-500');
    expect(container.querySelector('[data-short-id="short-0"]')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous Short' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next Short' })).not.toBeDisabled();
  });
});
