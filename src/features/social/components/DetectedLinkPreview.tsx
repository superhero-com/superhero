import type { ReactNode } from 'react';
import type { DetectedLink } from '../hooks/useLinkDetection';
import { GitHubCard } from './GitHubCard';
import { LinkPreviewCard } from './LinkPreviewCard';
import { SpotifyEmbed } from './SpotifyEmbed';
import { TwitterCard } from './TwitterCard';
import { YouTubeEmbed } from './YouTubeEmbed';

interface DetectedLinkPreviewProps {
  link: DetectedLink | null;
  onDismiss?: () => void;
  /** When set, wraps the preview in a div (e.g. feed items use `mt-3`). */
  className?: string;
}

/**
 * Maps a detected link to the appropriate embed / preview component.
 * Single place to extend when adding new link types.
 */
export const DetectedLinkPreview = ({ link, onDismiss, className }: DetectedLinkPreviewProps) => {
  if (!link) return null;

  let inner: ReactNode;
  if (link.type === 'youtube' && link.youtubeId) {
    inner = <YouTubeEmbed videoId={link.youtubeId} onDismiss={onDismiss} />;
  } else if (link.type === 'spotify' && link.spotifyType && link.spotifyId) {
    inner = (
      <SpotifyEmbed
        spotifyType={link.spotifyType}
        spotifyId={link.spotifyId}
        onDismiss={onDismiss}
      />
    );
  } else if (link.type === 'twitter') {
    inner = <TwitterCard url={link.url} onDismiss={onDismiss} />;
  } else if (link.type === 'github' && link.githubOwner && link.githubRepo) {
    inner = (
      <GitHubCard
        owner={link.githubOwner}
        repo={link.githubRepo}
        url={link.url}
        onDismiss={onDismiss}
      />
    );
  } else {
    inner = <LinkPreviewCard url={link.url} onDismiss={onDismiss} />;
  }

  if (className) {
    return <div className={className}>{inner}</div>;
  }
  return inner;
};
