import { IconClose } from '@/icons';

const HEIGHTS: Record<string, number> = {
  track: 152,
  episode: 152,
  artist: 352,
  album: 352,
  playlist: 352,
  show: 352,
};

interface SpotifyEmbedProps {
  spotifyType: string;
  spotifyId: string;
  onDismiss?: () => void;
}

export const SpotifyEmbed = ({ spotifyType, spotifyId, onDismiss }: SpotifyEmbedProps) => {
  const height = HEIGHTS[spotifyType] ?? 152;
  const src = `https://open.spotify.com/embed/${spotifyType}/${spotifyId}?utm_source=oembed`;

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 z-10 bg-black/70 rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/90 transition-colors"
          aria-label="Dismiss embed"
        >
          <IconClose className="w-3.5 h-3.5 text-white" />
        </button>
      )}
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 'none' }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify embed"
      />
    </div>
  );
};
