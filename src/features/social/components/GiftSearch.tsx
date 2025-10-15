import { fetchJson } from "@/utils/common";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconClose } from "@/icons";

interface GifSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  onMediaUrlsChange: (mediaUrls: string[]) => void;
}
export default function GifSelectorDialog({
  open,
  onOpenChange,
  mediaUrls,
  onMediaUrlsChange,
}: GifSelectorDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [resultCount, setResultCount] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setResultCount("0 Results");
    setOffset(0);

    try {
      const url = new URL(
        `https://api.giphy.com/v1/gifs/${query ? "search" : "trending"}`
      );
      if (query) url.searchParams.set("q", query);
      url.searchParams.set("limit", "10");
      url.searchParams.set("offset", offset.toString());
      url.searchParams.set("api_key", "P16yBDlSeEfcrJfp1rwnamtEZmQHxHNM");
      const { data, pagination } = await fetchJson(url.toString());
      setResults(
        data.map(({ images }) => ({
          still: images.fixed_width_still.url,
          animated: images.fixed_width.url,
          original: images.original.url,
        }))
      );
      setResultCount(`${pagination.total_count.toLocaleString()} Results`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      handleSearch();
    }
  }, [query, offset, open]);

  const handleGifClick = (gif: any) => {
    onMediaUrlsChange([...mediaUrls, gif.original]);
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
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary-400 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center py-4">Error: {error}</div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleGifClick(result)}
                  className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-white/5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary-400/20 hover:ring-2 hover:ring-primary-400/50"
                >
                  <img
                    src={result.still}
                    alt="GIF preview"
                    className="w-full h-full object-cover group-hover:hidden"
                    loading="lazy"
                  />
                  <img
                    src={result.animated}
                    alt="GIF animated"
                    className="w-full h-full object-cover hidden group-hover:block"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
