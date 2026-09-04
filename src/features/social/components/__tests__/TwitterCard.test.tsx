import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  afterEach, beforeEach, describe, expect, it, onTestFinished, vi,
} from 'vitest';

import { TwitterCard } from '../TwitterCard';

const TWEET_URL = 'https://twitter.com/aeternity/status/1234567890123456789';

describe('TwitterCard (sandboxed embed)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html: '<script>evil()</script>' }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders Twitter\'s own embed iframe by tweet id (no HTML injection)', async () => {
    render(<TwitterCard url={TWEET_URL} />);

    const iframe = await screen.findByTitle('Twitter post');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('src')).toBe(
      'https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789&theme=dark&dnt=true',
    );
  });

  it('never renders dangerouslySetInnerHTML content from the oEmbed response', async () => {
    render(<TwitterCard url={TWEET_URL} />);
    await screen.findByTitle('Twitter post');
    // The oEmbed JSON `html` field (which could contain a script tag) must
    // never appear anywhere in our DOM.
    expect(document.querySelector('script[src*="widgets.js"]')).toBeNull();
    expect(document.body.innerHTML).not.toContain('evil()');
  });

  it('sandboxes the frame with allow-scripts + allow-popups and NEVER allow-same-origin', async () => {
    render(<TwitterCard url={TWEET_URL} />);
    const iframe = await screen.findByTitle('Twitter post');

    const sandbox = iframe.getAttribute('sandbox') ?? '';
    const tokens = sandbox.split(/\s+/).filter(Boolean);

    expect(tokens).toContain('allow-scripts');
    expect(tokens).toContain('allow-popups');
    // The load-bearing security assertion: allow-scripts + allow-same-origin
    // together would let the framed document escape to our origin (DOM,
    // cookies, IndexedDB seed vault). Must never be present.
    expect(tokens).not.toContain('allow-same-origin');
  });

  it('never loads platform.twitter.com/widgets.js into the parent document', async () => {
    render(<TwitterCard url={TWEET_URL} />);
    await screen.findByTitle('Twitter post');
    const scripts = Array.from(document.scripts);
    expect(scripts.some((s) => s.src.includes('platform.twitter.com/widgets.js'))).toBe(false);
  });

  it('renders nothing when the oEmbed availability check fails (deleted/invalid tweet)', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { container } = render(<TwitterCard url={TWEET_URL} />);
    await waitFor(() => expect(container.querySelector('iframe')).toBeNull());
  });

  it('renders nothing when the url has no tweet id', async () => {
    const { container } = render(<TwitterCard url="https://twitter.com/aeternity" />);
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('calls onDismiss when the dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<TwitterCard url={TWEET_URL} onDismiss={onDismiss} />);
    await screen.findByTitle('Twitter post');

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('only accepts postMessage height updates from the Twitter embed origin', async () => {
    render(<TwitterCard url={TWEET_URL} />);
    const iframe = await screen.findByTitle('Twitter post') as HTMLIFrameElement;

    // Stub on the prototype, not on this node: the component re-renders while the oEmbed
    // promise settles, and a stub pinned to one element loses its effect if that render
    // hands `iframeRef` a different node — which made this test flaky. The handler still has
    // to clear both its real gates (embed origin, and source === the frame's contentWindow).
    const realContentWindow = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      'contentWindow',
    );
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get: () => window,
    });
    onTestFinished(() => {
      if (realContentWindow) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', realContentWindow);
      }
    });

    // Malicious/foreign origin: ignored.
    fireEvent(window, new MessageEvent('message', {
      origin: 'https://evil.example',
      source: window,
      data: JSON.stringify({ method: 'twttr.private.resize', params: [{ height: 999 }] }),
    }));
    expect(iframe.style.height).not.toBe('999px');

    // Legitimate Twitter embed origin: applied.
    fireEvent(window, new MessageEvent('message', {
      origin: 'https://platform.twitter.com',
      source: window,
      data: JSON.stringify({ method: 'twttr.private.resize', params: [{ height: 555 }] }),
    }));
    await waitFor(() => expect(iframe.style.height).toBe('555px'));
  });
});
