import React from 'react';
import FeedList from '@/features/social/views/FeedList';
import { GlassSurface } from '@/components/ui/GlassSurface';

export default function FeedWidget() {
  return (
    <div className="h-fit min-w-0">
      <GlassSurface className="mb-4" interactive={false}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <h3 className="text-base font-bold text-white">Feed</h3>
          </div>
          <a 
            href="/" 
            className="text-xs text-white/40 hover:text-white transition-colors"
            title="Open in full screen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </GlassSurface>

      {/* Use FeedList with standalone=false to get just the feed content */}
      <div className="[&_>_div]:!w-full [&_>_div]:!max-w-none">
        <style>{`
          /* Hide CreatePost in FeedWidget - it's the first div > div > div */
          [data-feed-widget] > div > div:first-child > div:first-child {
            display: none !important;
          }
        `}</style>
        <div data-feed-widget>
          <FeedList standalone={false} compact={true} />
        </div>
      </div>
    </div>
  );
}
