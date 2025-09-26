import React from 'react';
import { cn } from '@/lib/utils';

interface TokenCandlestickChartSkeletonProps {
  /** Whether to show a simplified boilerplate version */
  boilerplate?: boolean;
}

export default function TokenCandlestickChartSkeleton({ 
  boilerplate = false 
}: TokenCandlestickChartSkeletonProps) {
  const skeletonClass = cn(
    'bg-gradient-to-r from-white/10 via-white/20 to-white/10',
    'bg-[length:200%_100%] animate-skeleton-loading rounded'
  );

  return (
    <div className="relative w-full h-full p-4 bg-[var(--secondary-color)] rounded-[10px]">
      {/* Token Info Section */}
      <div className="pr-24">
        {/* Token name row */}
        <div className="flex items-center gap-2">
          <div className={cn(skeletonClass, 'w-52 h-5')} />
          <div className={cn(skeletonClass, 'w-40 h-3')} />
        </div>

        {/* Price info */}
        <div className="mt-3">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={cn(skeletonClass, 'w-44 h-2')} />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className={cn(skeletonClass, 'w-24 h-2')} />
            ))}
          </div>
        </div>
      </div>

      {/* Chart Grid Section */}
      <div className="relative h-[300px] flex mt-4">
        {/* Loading message */}
        {!boilerplate && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="border rounded bg-[#1a1a1a] flex items-center p-4 gap-2">
              {/* Chart Icon */}
              <div className="w-[30px] h-[30px] p-1 text-white">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path opacity="0.44"
                    d="M12.5502 22C10.0943 22.0008 7.73533 21.0415 5.97689 19.327C4.21846 17.6126 3.19983 15.2787 3.13843 12.8235L13.7266 14.9412V3.24884C16.1044 3.54537 18.2795 4.73764 19.8085 6.58256C21.3375 8.42749 22.1053 10.7861 21.9552 13.1776C21.8052 15.569 20.7486 17.8132 19.001 19.4526C17.2534 21.0919 14.9463 22.003 12.5502 22Z"
                    fill="currentColor" />
                  <path
                    d="M11.3706 12.1176L2.03003 10.25C2.31442 7.97291 3.42048 5.87803 5.14043 4.3589C6.86037 2.83977 9.07583 2.00094 11.3706 2V12.1176Z"
                    fill="currentColor" />
                </svg>
              </div>

              <div className="text-white">
                <div className="text-base">Loading</div>
                <div className="opacity-30">Data will be shown shortly</div>
              </div>
            </div>
          </div>
        )}

        {/* Price points on the right */}
        <div className="absolute right-0 -top-1 -bottom-1 w-[75px] flex flex-col justify-between">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={cn(skeletonClass, 'w-full h-2')} />
          ))}
        </div>

        {/* Grid lines */}
        <div className="relative flex flex-col justify-between w-full opacity-50 mr-[85px]">
          {/* Horizontal lines */}
          <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={cn(skeletonClass, 'w-full h-px')} />
            ))}
          </div>
          {/* Vertical lines */}
          <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-between px-10 md:px-14">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className={cn(skeletonClass, 'w-px h-full')} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between gap-4 mt-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={cn(skeletonClass, 'w-[14px] h-[14px] rounded-full')} />
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className={cn(skeletonClass, 'w-28 h-[10px]')} />
          <div className={cn(skeletonClass, 'w-14 h-[10px]')} />
          <div className={cn(skeletonClass, 'w-[17px] h-[17px] rounded-full')} />
        </div>
      </div>
    </div>
  );
}
