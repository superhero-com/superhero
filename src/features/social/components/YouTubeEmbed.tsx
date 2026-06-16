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
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
