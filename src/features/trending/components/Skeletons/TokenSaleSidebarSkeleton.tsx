import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const TokenSaleSidebarSkeleton = () => {
  const skeletonClass = cn(
    'bg-gradient-to-r from-white/10 via-white/20 to-white/10',
    'bg-[length:200%_100%] animate-skeleton-loading rounded',
  );
  const makeKeys = (count: number, prefix: string) => Array.from(
    { length: count },
    (_, idx) => `${prefix}-${idx + 1}`,
  );

  return (
    <div className="token-sale-sidebar-skeleton">
      {/* Trade Card Skeleton */}
      <Card className="mb-2 bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          {/* Buy/Sell buttons */}
          <div className="flex gap-2">
            <div className={cn(skeletonClass, 'h-10 flex-1')} />
            <div className={cn(skeletonClass, 'h-10 flex-1')} />
          </div>

          {/* Input fields */}
          <div className="flex flex-col gap-2 mt-3">
            <div className={cn(skeletonClass, 'h-4 opacity-70')} />
            <div className={cn(skeletonClass, 'h-4 opacity-70')} />
          </div>

          {/* Trade button */}
          <div className={cn(skeletonClass, 'h-10 mt-3')} />
        </CardContent>
      </Card>

      {/* Token Details Card Skeleton */}
      <Card className="mt-2 bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          {/* Highlighted info box */}
          <div className="border border-white/10 p-2 rounded mb-2">
            <div className={cn(skeletonClass, 'h-4 opacity-30')} />
            <div className={cn(skeletonClass, 'h-4 mt-1')} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            {makeKeys(4, 'stat').map((key) => (
              <div key={key} className="border border-white/10 p-2 rounded">
                <div className={cn(skeletonClass, 'h-4 opacity-50')} />
                <div className={cn(skeletonClass, 'h-4 mt-2')} />
              </div>
            ))}
          </div>

          {/* Additional info lines */}
          <div className="flex flex-col gap-2 mt-3">
            {makeKeys(4, 'info-line').map((key) => (
              <div key={key} className={cn(skeletonClass, 'h-4 opacity-70')} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Token Ranking Card Skeleton */}
      <Card className="mt-2 bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col gap-2">
            {makeKeys(5, 'rank-row').map((key) => (
              <div key={key} className={cn(skeletonClass, 'h-8')} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenSaleSidebarSkeleton;
