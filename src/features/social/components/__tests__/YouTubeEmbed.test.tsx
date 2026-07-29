import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';

import { YouTubeEmbed } from '../YouTubeEmbed';

describe('YouTubeEmbed (HARDEN-03 medium / HARDEN-06 sandboxed embed)', () => {
  it('renders the youtube-nocookie iframe for the given video id', () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/youtube/i) as HTMLIFrameElement;
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1');
  });

  it('carries a minimal sandbox allowlist (scripts/same-origin/presentation/popups only)', () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/youtube/i);
    const tokens = (iframe.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);

    expect(tokens.sort()).toEqual(
      ['allow-popups', 'allow-presentation', 'allow-same-origin', 'allow-scripts'].sort(),
    );
    // Never anything broader than the reviewed allowlist (e.g. no allow-top-navigation,
    // no allow-forms, no allow-modals) -- the player needs none of those to play.
    expect(tokens).not.toContain('allow-top-navigation');
    expect(tokens).not.toContain('allow-forms');
    expect(tokens).not.toContain('allow-modals');
  });

  it('does not grant clipboard-write (address-swap risk, HARDEN-03)', () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/youtube/i);
    expect(iframe.getAttribute('allow') ?? '').not.toContain('clipboard-write');
  });

  it('still grants the playback-relevant Permissions-Policy features', () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/youtube/i);
    const allow = iframe.getAttribute('allow') ?? '';
    ['accelerometer', 'autoplay', 'encrypted-media', 'gyroscope', 'picture-in-picture'].forEach(
      (feature) => expect(allow).toContain(feature),
    );
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
