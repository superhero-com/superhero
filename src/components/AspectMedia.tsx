import { useEffect, useMemo, useRef, useState } from "react";

interface AspectMediaProps {
  src: string;
  alt?: string;
  className?: string;
  maxHeight?: string | number; // e.g. "50vh" or 500
}

// Renders media preserving its intrinsic aspect ratio.
// - Parses optional w/h from URL hash (e.g. #w=480&h=270)
// - Falls back to natural dimensions on load
export function AspectMedia({ src, alt = "media", className = "", maxHeight = "50vh" }: AspectMediaProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const isVideo = /\.(mp4|webm|mov)$/i.test(src);
  const ratioStyle = useMemo(() => {
    if (!dims) return { maxHeight } as React.CSSProperties;
    return { aspectRatio: `${dims.w} / ${dims.h}`, maxHeight } as React.CSSProperties;
  }, [dims, maxHeight]);

  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = mediaRef.current as any;
    if (!el) return;

    const onLoad = () => {
      const w = isVideo ? el.videoWidth : el.naturalWidth;
      const h = isVideo ? el.videoHeight : el.naturalHeight;
      if (w > 0 && h > 0) setDims({ w, h });
    };

    if (isVideo) {
      el.addEventListener("loadedmetadata", onLoad, { once: true });
    } else {
      if (el.complete) onLoad();
      else el.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      if (isVideo) el.removeEventListener("loadedmetadata", onLoad);
      else el.removeEventListener("load", onLoad);
    };
  }, [src, isVideo]);

  // Wrapper with max-height constraint; border radius applied to image itself
  return (
    <div className={`w-full ${className}`} style={ratioStyle}>
      {isVideo ? (
        <video
          ref={mediaRef as any}
          src={src}
          controls
          className="w-full h-full object-contain object-left block rounded"
        />
      ) : (
        <img
          ref={mediaRef as any}
          src={src}
          alt={alt}
          className="w-full h-full object-contain object-left block rounded"
        />
      )}
    </div>
  );
}

export default AspectMedia;


