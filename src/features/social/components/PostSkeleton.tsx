import { memo } from 'react';

const PostSkeleton = memo(() => (
  <>
    {/* Mirrors ReplyToFeedItem: a borderless border-b row with the same paddings,
        avatar sizes and action layout, so the loading state resembles the card it becomes. */}
    <article className="relative w-full px-3 md:px-4 py-4 md:py-5 border-b border-white/10 bg-transparent">
      {/* Top-right on-chain badge skeleton */}
      <div className="absolute top-4 right-2 md:top-5 md:right-5 z-10">
        <div className="px-2 py-1 md:py-0 md:h-7 bg-white/[0.08] rounded-lg skeleton-shimmer flex items-center">
          <div className="h-3 w-16" />
        </div>
      </div>
      {/* Bottom-right share skeleton */}
      <div className="absolute bottom-4 right-2 md:bottom-5 md:right-5 z-10">
        <div className="h-[28px] w-8 skeleton-shimmer rounded-lg" />
      </div>

      <div className="flex gap-3 items-start">
        {/* Avatar skeleton - circular */}
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <div className="w-[36px] h-[36px] rounded-full skeleton-shimmer" />
          </div>
          <div className="hidden md:block">
            <div className="w-[40px] h-[40px] rounded-full skeleton-shimmer" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-9 md:pr-24">
          {/* Header skeleton: name · time */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-[15px] w-28 skeleton-shimmer rounded" />
            <div className="h-[12px] w-8 skeleton-shimmer rounded" />
          </div>
          {/* Address skeleton - mono font style, smaller */}
          <div className="mt-1 h-[10px] w-56 skeleton-shimmer rounded font-mono" />

          {/* Content skeleton - text lines */}
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full skeleton-shimmer rounded" />
            <div className="h-4 w-5/6 skeleton-shimmer rounded" />
          </div>

          {/* Actions skeleton - Comment + Tip buttons (Share is bottom-right, above) */}
          <div className="mt-3 flex items-center gap-5">
            <div className="h-5 w-10 skeleton-shimmer rounded-lg" />
            <div className="h-5 w-12 skeleton-shimmer rounded-lg" />
          </div>
        </div>
      </div>
    </article>
    <style>
      {`
        .skeleton-shimmer {
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.08) 25%, 
            rgba(255, 255, 255, 0.15) 50%, 
            rgba(255, 255, 255, 0.08) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 2.5s infinite linear;
          opacity: 0.6;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Ensure consistent animation speed on mobile to match desktop */
        /* Mobile browsers may render animations faster, so we explicitly set the duration */
        @media (max-width: 768px) {
          .skeleton-shimmer {
            animation: skeleton-loading 2.5s infinite linear !important;
            animation-duration: 2.5s !important;
            animation-timing-function: linear !important;
          }
        }
      `}
    </style>
  </>
));

PostSkeleton.displayName = 'PostSkeleton';

export default PostSkeleton;
