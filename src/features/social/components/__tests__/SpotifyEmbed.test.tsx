import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';

import { SpotifyEmbed } from '../SpotifyEmbed';

describe('SpotifyEmbed (sandboxed embed)', () => {
  it('renders the open.spotify.com embed iframe for the given type/id', () => {
    render(<SpotifyEmbed spotifyType="track" spotifyId="4uLU6hMCjMI75M1A2tKUQC" />);
    const iframe = screen.getByTitle(/spotify/i) as HTMLIFrameElement;
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toBe(
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=oembed',
    );
  });

  it('carries a minimal sandbox allowlist (scripts/same-origin/popups only)', () => {
    render(<SpotifyEmbed spotifyType="track" spotifyId="4uLU6hMCjMI75M1A2tKUQC" />);
    const iframe = screen.getByTitle(/spotify/i);
    const tokens = (iframe.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);

    expect(tokens.sort()).toEqual(['allow-popups', 'allow-same-origin', 'allow-scripts'].sort());
    expect(tokens).not.toContain('allow-top-navigation');
    expect(tokens).not.toContain('allow-forms');
    expect(tokens).not.toContain('allow-modals');
    expect(tokens).not.toContain('allow-presentation');
  });

  it('does not grant clipboard-write (address-swap risk)', () => {
    render(<SpotifyEmbed spotifyType="track" spotifyId="4uLU6hMCjMI75M1A2tKUQC" />);
    const iframe = screen.getByTitle(/spotify/i);
    expect(iframe.getAttribute('allow') ?? '').not.toContain('clipboard-write');
  });

  it('still grants the playback-relevant Permissions-Policy features', () => {
    render(<SpotifyEmbed spotifyType="track" spotifyId="4uLU6hMCjMI75M1A2tKUQC" />);
    const iframe = screen.getByTitle(/spotify/i);
    const allow = iframe.getAttribute('allow') ?? '';
    ['autoplay', 'encrypted-media', 'fullscreen', 'picture-in-picture'].forEach(
      (feature) => expect(allow).toContain(feature),
    );
  });

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<SpotifyEmbed spotifyType="track" spotifyId="4uLU6hMCjMI75M1A2tKUQC" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
