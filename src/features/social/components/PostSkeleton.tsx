import { memo } from "react";

const PostSkeleton = memo(() => {
  return (
    <>
      <article className="relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 pt-4 pb-5 md:w-full md:mx-0 md:p-5 bg-transparent md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:rounded-2xl md:backdrop-blur-xl">
        {/* Top-right on-chain badge skeleton */}
        <div className="absolute top-4 right-2 md:top-5 md:right-5 z-10">
          <div className="px-2 py-1 bg-white/[0.08] border border-white/20 rounded-lg skeleton-shimmer">
            <div className="h-3 w-16" />
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 items-start">
          {/* Avatar skeleton - circular with border */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="md:hidden">
              <div className="w-[34px] h-[34px] rounded-full border border-white/20 skeleton-shimmer" />
            </div>
            <div className="hidden md:block">
              <div className="w-[40px] h-[40px] rounded-full border border-white/20 skeleton-shimmer" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-8 md:pr-12">
            {/* Header skeleton: name · time */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-baseline gap-2.5 min-w-0">
                <div className="h-[15px] w-20 skeleton-shimmer rounded" />
                <span className="text-white/50 shrink-0">·</span>
                <div className="h-3 w-12 skeleton-shimmer rounded" />
              </div>
            </div>
            {/* Address skeleton - mono font style, smaller */}
            <div className="mt-1 h-[10px] w-48 skeleton-shimmer rounded font-mono" />

            {/* Content skeleton - text lines */}
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-5/6 skeleton-shimmer rounded" />
            </div>

            {/* URL link skeleton - green link style (sometimes present) */}
            <div className="mt-2 h-4 w-56 skeleton-shimmer rounded" style={{ opacity: 0.5 }} />

            {/* Actions skeleton - Tip button, Comment button, Share button */}
            <div className="mt-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-4 md:gap-2">
                {/* Tip button skeleton */}
                <div className="h-[28px] w-12 md:w-14 skeleton-shimmer rounded-lg" />
                {/* Comment button skeleton */}
                <div className="h-[28px] w-16 md:w-20 skeleton-shimmer rounded-lg" />
              </div>
              {/* Share button skeleton (upload icon) */}
              <div className="h-5 w-5 skeleton-shimmer rounded" />
            </div>
          </div>
        </div>
      </article>
      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.08) 25%, 
            rgba(255, 255, 255, 0.15) 50%, 
            rgba(255, 255, 255, 0.08) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  );
});

PostSkeleton.displayName = 'PostSkeleton';

export default PostSkeleton;

