import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconClose } from '@/icons';
import Spinner from '@/components/Spinner';

const PER_PAGE = 15;

async function searchOpenverse(query: string, page: number) {
  const url = new URL('https://api.openverse.org/v1/images/');
  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.set('q', 'blockchain');
  }
  url.searchParams.set('page_size', PER_PAGE.toString());
  url.searchParams.set('page', page.toString());
  url.searchParams.set('license_type', 'commercial,modification');
  url.searchParams.set('extension', 'jpg,png');
  url.searchParams.set('mature', 'false');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Image search error ${res.status}`);
  return res.json();
}

interface ImageSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  onMediaUrlsChange: (mediaUrls: string[]) => void;
}

export const ImageSelectorDialog = ({
  open,
  onOpenChange,
  mediaUrls,
  onMediaUrlsChange,
}: ImageSelectorDialogProps) => {
  const { t } = useTranslation('social');
  const [query, setQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['openverse-image-search', query],
    queryFn: ({ pageParam = 1 }) => searchOpenverse(query, pageParam as number),
    getNextPageParam: (lastPage: { page?: number; page_count?: number }) => {
      const page = lastPage.page ?? 1;
      const pageCount = lastPage.page_count ?? 0;
      return page < pageCount ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: open,
  });

  const allResults = data?.pages.flatMap((page: any) => page.results ?? []) ?? [];
  const results = allResults.filter((photo: any) => {
    const ft = (photo?.filetype ?? '').toLowerCase();
    const urlOk = /\.(jpe?g|png)(\?|$)/i.test(photo?.url ?? '');
    return ft === 'jpg' || ft === 'jpeg' || ft === 'png' || (!ft && urlOk);
  });
  const totalCount: number = data?.pages[0]?.result_count ?? 0;
  const isTrending = query.length === 0;

  // Auto-load more on scroll using IntersectionObserver
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return () => {};
    const sentinel = sentinelRef.current;
    if (!sentinel) return () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
          isFetchingRef.current = true;
          fetchNextPage().finally(() => {
            setTimeout(() => { isFetchingRef.current = false; }, 300);
          });
        }
      },
      { rootMargin: '200px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleImageClick = (photo: any) => {
    const imageUrl: string = photo.url ?? '';
    if (!imageUrl) return;
    onMediaUrlsChange([...mediaUrls, imageUrl]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[60vh] sm:max-h-[90vh] overflow-hidden sm:max-w-[600px] liquid-glass liquid-glass--strong rounded-xl text-white flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-white">{t('imageSelector.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pb-20">
          <input
            type="text"
            placeholder={t('imageSelector.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/16 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:!shadow-none focus:!translate-y-0"
          />

          <span className="text-xs text-white/60 font-medium block">
            {isTrending && t('imageSelector.trendingOpenverse')}
            {!isTrending && totalCount > 0 && t('imageSelector.resultsOpenverse', { total: totalCount.toLocaleString() })}
          </span>

          {/* Already selected images */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-row gap-2">
              {mediaUrls.map((url, index) => (
                <div
                  key={url}
                  className="relative rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.2)] w-32"
                >
                  <img
                    src={url}
                    alt={t('imageSelector.selectedAlt')}
                    className="w-full h-20 object-cover block"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/70 border-none text-white w-5 h-5 rounded-full cursor-pointer grid place-items-center transition-all duration-200 hover:bg-black/90 hover:scale-105"
                    onClick={() => onMediaUrlsChange(mediaUrls.filter((_, i) => i !== index))}
                  >
                    <IconClose className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-[400px]">
              <Spinner className="h-8 w-8" />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center h-[400px] flex items-center justify-center">
              {t('imageSelector.errorPrefix')}
              {' '}
              {(error as Error).message}
            </div>
          )}

          {!isLoading && !error && (
            <div
              className="grid grid-cols-3 gap-3 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-2 -m-2"
            >
              {results.map((photo: any) => photo?.id && (
                <div
                  key={photo.id}
                  onClick={() => handleImageClick(photo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleImageClick(photo);
                    }
                  }}
                  className="relative w-full cursor-pointer bg-white/5 rounded-lg transition-all duration-200 active:scale-95 sm:hover:scale-105 sm:hover:shadow-lg sm:hover:shadow-primary-400/20 sm:hover:ring-2 sm:hover:ring-primary-400/50 hover:z-20 overflow-visible"
                  style={{ paddingBottom: '100%' }}
                >
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <img
                      src={photo.thumbnail ?? photo.url}
                      alt={photo.title ?? t('imageSelector.photoAlt')}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget.closest('[role="button"]') as HTMLElement | null)?.style.setProperty('display', 'none'); }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {photo.creator && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white/70 text-[10px] px-1.5 py-0.5 truncate rounded-b-lg pointer-events-none">
                      {photo.creator}
                    </div>
                  )}
                </div>
              ))}
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="col-span-3 h-4" />
              {isFetchingNextPage && (
                <div className="col-span-3 flex justify-center py-4">
                  <Spinner className="h-6 w-6" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Confirm Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent border-t border-white/10">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full px-6 py-3 rounded-btn bg-[#1161FE] text-white font-semibold text-sm uppercase tracking-wide transition-all duration-300 hover:bg-[#0d4fd8] hover:shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('imageSelector.confirm')}
            {' '}
            {mediaUrls.length > 0 && `(${mediaUrls.length})`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
