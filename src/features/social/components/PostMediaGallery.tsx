import { imageUrl } from '@/features/profile-images/api';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AspectMedia } from '@/components/AspectMedia';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';

export const PostMediaGallery = ({ media }: { media: string[] }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const urls = [...new Set(media.map((value) => imageUrl(value, 'full')
    || (typeof value === 'string' && /^https?:\/\//i.test(value) ? value : undefined))
    .filter((value): value is string => !!value))].slice(0, 4);
  const isVideo = (url: string) => /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url);
  const images = urls.filter((url) => !isVideo(url));
  const move = (step: number) => setSelected((index) => ((index ?? 0) + step + images.length) % images.length);
  if (!urls.length) return null;
  return (
    <div className="feed-post__media mt-3" role="presentation" onClick={(event) => event.stopPropagation()}>
      <div className={`grid gap-1 overflow-hidden rounded-xl border border-white/10 ${urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {urls.map((url, index) => (isVideo(url) ? (
          <AspectMedia key={url} src={url} maxHeight={320} />
        ) : (
          <button
            key={url}
            type="button"
            onClick={(event) => { event.stopPropagation(); setSelected(images.indexOf(url)); }}
            aria-label={t('social.images.open', { number: index + 1 })}
            className={`block min-w-0 overflow-hidden bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 ${urls.length === 3 && index === 0 ? 'row-span-2' : ''}`}
          >
            <img
              src={imageUrl(url, 'preview') || url}
              loading="lazy"
              decoding="async"
              alt={t('social.images.preview', { number: index + 1 })}
              className={urls.length === 1 ? 'mx-auto block max-h-[520px] w-full object-contain' : 'block h-full max-h-[380px] min-h-0 w-full object-cover'}
              style={urls.length > 1 ? { aspectRatio: urls.length === 3 && index > 0 ? '2 / 1' : '1 / 1' } : undefined}
            />
          </button>
        )))}
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent
          className="max-w-5xl border-white/10 bg-black/95 p-3 pt-12 text-white sm:p-6 sm:pt-12"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (images.length > 1 && event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
            if (images.length > 1 && event.key === 'ArrowRight') { event.preventDefault(); move(1); }
          }}
        >
          <DialogTitle className="sr-only">{t('social.images.viewer')}</DialogTitle>
          <DialogDescription className="sr-only">{t('social.images.viewerHint')}</DialogDescription>
          {selected !== null && <img src={images[selected]} alt={t('social.images.preview', { number: selected + 1 })} className="mx-auto max-h-[72dvh] max-w-full object-contain" />}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={() => move(-1)} aria-label={t('social.images.previous')} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft aria-hidden /></button>
              <span aria-live="polite" className="text-sm text-white/70">
                {(selected ?? 0) + 1}
                {' '}
                /
                {' '}
                {images.length}
              </span>
              <button type="button" onClick={() => move(1)} aria-label={t('social.images.next')} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight aria-hidden /></button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
