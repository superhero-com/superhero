import { fetchJson } from '@/utils/common';
import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconClose } from '@/icons';
import { CONFIG } from '@/config';
import Spinner from '@/components/Spinner';

interface GifSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  onMediaUrlsChange: (mediaUrls: string[]) => void;
}

export const GifSelectorDialog = ({
  open,
  onOpenChange,
  mediaUrls,
  onMediaUrlsChange,
}: GifSelectorDialogProps) => {
  const [query, setQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
    queryKey: ['giphy', query],
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL(
        `https://api.giphy.com/v1/gifs/${query ? 'search' : 'trending'}`,
      );
      if (query) url.searchParams.set('q', query);
      url.searchParams.set('limit', '12');
      url.searchParams.set('offset', pageParam.toString());
      if (CONFIG.GIPHY_API_KEY) {
        url.searchParams.set('api_key', CONFIG.GIPHY_API_KEY);
      }
      const { data: responseData, pagination } = await fetchJson(url.toString());
      return {
        results: responseData.map(({ images, id }: any) => ({
          id, // Use Giphy's unique ID
          still: images?.fixed_width_still?.url,
          animated: images?.fixed_width?.url,
          // Prefer lightweight mp4 for smooth autoplay where available
          mp4:
            images?.fixed_width?.mp4
            || images?.downsized_small?.mp4
            || images?.original_mp4?.mp4,
          original: images?.original?.url,
          // capture intrinsic dimensions to preserve aspect ratio downstream
          width: Number(images?.original?.width),
          height: Number(images?.original?.height),
        })),
        totalCount: pagination.total_count,
        nextOffset: pagination.offset + pagination.count,
        hasMore: pagination.offset + pagination.count < pagination.total_count,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextOffset : undefined),
    initialPageParam: 0,
    enabled: open,
  });

  const results = data?.pages.flatMap((page) => page.results) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;
  const resultCount = `${totalCount.toLocaleString()} Results`;

  // Auto-load more when reaching bottom using IntersectionObserver
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return () => {};
    const sentinel = sentinelRef.current;
    if (!sentinel) return () => {};

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Prevent multiple simultaneous fetches
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
          isFetchingRef.current = true;
          fetchNextPage().finally(() => {
            // Add a small delay to prevent rapid re-triggering on iOS
            setTimeout(() => {
              isFetchingRef.current = false;
            }, 300);
          });
        }
      },
      {
        // Don't specify root for better iOS compatibility
        rootMargin: '200px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleGifClick = (gif: any) => {
    try {
      const u = new URL(gif.original);
      const params = new URLSearchParams();
      if (gif?.width && gif?.height && Number(gif.width) > 0 && Number(gif.height) > 0) {
        params.set('w', String(gif.width));
        params.set('h', String(gif.height));
      }
      // store dimensions in the URL hash so media stays a simple string
      if ([...params.keys()].length > 0) {
        u.hash = params.toString();
      }
      onMediaUrlsChange([...mediaUrls, u.toString()]);
    } catch {
      onMediaUrlsChange([...mediaUrls, gif.original]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[60vh] sm:max-h-[90vh] overflow-hidden sm:max-w-[600px] bg-gray-900 border-white/12 text-white flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Add a GIF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pb-20">
          <input
            type="text"
            placeholder="Search for a GIF"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/16 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/50"
          />

          <div>
            <span className="text-xs text-white/60 font-medium">
              {resultCount}
            </span>
          </div>
          {mediaUrls.length > 0 && (
            <div className="flex flex-row gap-2">
              {mediaUrls.map((url, index) => (
                <div
                  key={url}
                  className="relative rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.2)] w-32"
                >
                  {/.mp4$|.webm$|.mov$/i.test(url) ? (
                    <video
                      src={url}
                      controls
                      className="w-full h-20 object-cover block"
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <img
                      src={url}
                      alt="media"
                      className="w-full h-20 object-cover block"
                    />
                  )}
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
              Error:
              {error.message}
            </div>
          )}

          {!isLoading && !error && (
          <div
            ref={scrollContainerRef}
            className="grid grid-cols-3 gap-3 h-[400px] overflow-y-auto overflow-x-visible scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-2 -m-2"
          >
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleGifClick(result)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleGifClick(result);
                    }
                  }}
                  className="relative w-full cursor-pointer bg-white/5 rounded-lg transition-all duration-200 active:scale-95 sm:hover:scale-105 sm:hover:shadow-lg sm:hover:shadow-primary-400/20 sm:hover:ring-2 sm:hover:ring-primary-400/50 hover:z-20 overflow-visible"
                  style={{ paddingBottom: '100%' }}
                >
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    {result?.mp4 ? (
                      <video
                        src={result.mp4}
                        poster={result.still}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <img
                        src={result.animated || result.still}
                        alt="GIF preview"
                        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
              ))}
              {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="col-span-3 h-4" />
              {isFetchingNextPage && (
                <div className="col-span-3 flex items-center justify-center py-4">
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
            className="w-full px-6 py-3 rounded-full bg-[#1161FE] text-white font-semibold text-sm uppercase tracking-wide transition-all duration-300 hover:bg-[#0d4fd8] hover:shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Confirm
            {' '}
            {mediaUrls.length > 0 && `(${mediaUrls.length})`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GifSelectorDialog;
