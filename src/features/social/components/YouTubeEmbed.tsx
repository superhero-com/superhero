import { useTranslation } from 'react-i18next';
import { IconClose } from '@/icons';

interface YouTubeEmbedProps {
  videoId: string;
  onDismiss?: () => void;
}

export const YouTubeEmbed = ({ videoId, onDismiss }: YouTubeEmbedProps) => {
  const { t } = useTranslation('social');
  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
      {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 z-10 bg-black/70 rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/90 transition-colors"
        aria-label={t('embed.dismissVideo')}
      >
        <IconClose className="w-3.5 h-3.5 text-white" />
      </button>
      )}
      <iframe
        className="w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={t('embed.youtubeTitle')}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        // embed sandboxing: cross-origin embed, previously unsandboxed. Minimal
        // allowlist verified (headless-browser click-through, see PR) to still render/play the
        // player: allow-scripts + allow-same-origin are required for the YT player app to
        // initialize at all (without allow-same-origin the frame gets an opaque origin and the
        // player fails to boot); allow-presentation backs the player's cast button; allow-popups
        // backs the "Watch on YouTube" / share links. `clipboard-write` above was dropped
        // (address-swap risk) — nothing in this embed needs it.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    </div>
  );
};
