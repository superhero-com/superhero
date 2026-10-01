import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsViewer } from '../shorts-viewer';
import type { Short } from '../types';

vi.mock('../shorts-creator', () => ({
  ShortsCreator: ({ address }: { address: string }) => <div>{address}</div>,
  ShortsCreatorAvatar: () => null,
}));
vi.mock('../shorts-follow', () => ({ ShortsFollow: () => null }));

const clips = ['one', 'two'].map((id) => ({
  id,
  title: `Video ${id}`,
  creator: 'ak_full_creator_address',
  topic: 'Art',
  videoUrl: `/${id}.mp4`,
  posterUrl: `/${id}.jpg`,
  duration: 20,
  status: 'active',
  cid: `bafy-${id}`,
  bytes: 100,
  until: Date.now() + 86400000,
  likes: 2,
  views: 3,
  liked: false,
  mine: false,
  moderation: 'approved',
} satisfies Short));
const makeProps = () => ({
  feed: clips,
  topics: ['All', 'Art'],
  topic: 'All',
  onTopic: vi.fn(),
  onLike: vi.fn(),
  onView: vi.fn(),
  onReport: vi.fn(),
  onStudio: vi.fn(),
  onUpload: vi.fn(),
  message: '',
  onDismissMessage: vi.fn(),
  busy: false,
  suspended: false,
  ready: true,
});
let playing: WeakMap<HTMLMediaElement, boolean>;
beforeEach(() => {
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
    expect(props.onView).not.toHaveBeenCalled();
    [10.5, 11, 11.5, 12].forEach((position) => {
      videos[0].currentTime = position; fireEvent.timeUpdate(videos[0]);
    });
    expect(props.onView).toHaveBeenCalledWith('one', 2);
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
    expect(props.onView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'View video' }));
    expect(container.querySelector('video')).toHaveAttribute('src', expect.stringContaining('/one.mp4'));
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
