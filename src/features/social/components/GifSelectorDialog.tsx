import { fetchJson } from "@/utils/common";
import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconClose } from "@/icons";
import { CONFIG } from "@/config";

interface GifSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  onMediaUrlsChange: (mediaUrls: string[]) => void;
}


export function GifSelectorDialog({
  open,
  onOpenChange,
  mediaUrls,
  onMediaUrlsChange,
}: GifSelectorDialogProps) {
  const [query, setQuery] = useState("");
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
    queryKey: ["giphy", query],
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL(
        `https://api.giphy.com/v1/gifs/${query ? "search" : "trending"}`
      );
      if (query) url.searchParams.set("q", query);
      url.searchParams.set("limit", "12");
      url.searchParams.set("offset", pageParam.toString());
      if (CONFIG.GIPHY_API_KEY) {
        url.searchParams.set("api_key", CONFIG.GIPHY_API_KEY);
      }
      const { data, pagination } = await fetchJson(url.toString());
      return {
        results: data.map(({ images, id }: any) => ({
          id: id, // Use Giphy's unique ID
          still: images?.fixed_width_still?.url,
          animated: images?.fixed_width?.url,
          // Prefer lightweight mp4 for smooth autoplay where available
          mp4:
            images?.fixed_width?.mp4 ||
            images?.downsized_small?.mp4 ||
            images?.original_mp4?.mp4,
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
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined;
    },
    initialPageParam: 0,
    enabled: open,
  });

  const results = data?.pages.flatMap(page => page.results) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;
  const resultCount = `${totalCount.toLocaleString()} Results`;

  // Auto-load more when reaching bottom using IntersectionObserver
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    
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
        threshold: 0 
      }
    );
    
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleGifClick = (gif: any) => {
    try {
      const u = new URL(gif.original);
      const params = new URLSearchParams();
      if (gif?.width && gif?.height && Number(gif.width) > 0 && Number(gif.height) > 0) {
        params.set("w", String(gif.width));
        params.set("h", String(gif.height));
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
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-white/12 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add a GIF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                  key={index}
                  className="relative rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.2)] w-32"
                >
                  {/.mp4$|.webm$|.mov$/i.test(url) ? (
                    <video
                      src={url}
                      controls
                      className="w-full h-20 object-cover block"
                    />
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
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary-400 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center py-4">Error: {error.message}</div>
          )}

          {!isLoading && !error && (
          <div 
              ref={scrollContainerRef}
              className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto overflow-x-visible scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-2 -m-2"
            >
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleGifClick(result)}
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
                      />
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
                  <div className="animate-spin h-6 w-6 border-3 border-primary-400 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default GifSelectorDialog;