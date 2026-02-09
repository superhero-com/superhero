interface LeaderboardSkeletonProps {
  rows?: number;
  variant?: 'table' | 'card';
}

export const LeaderboardSkeleton = ({
  rows = 5,
  variant = 'table',
}: LeaderboardSkeletonProps) => {
  const items = Array.from({ length: rows }, (_, idx) => `row-${idx + 1}`);

  if (variant === 'card') {
    return (
      <div className="flex flex-col gap-3">
        {items.map((rowKey) => (
          <div
            key={rowKey}
            className="animate-pulse flex flex-col gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-32 bg-white/[0.06] rounded" />
                <div className="h-2.5 w-20 bg-white/[0.04] rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-3 w-20 bg-white/[0.05] rounded" />
              <div className="h-3 w-24 bg-white/[0.05] rounded justify-self-end" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((rowKey) => (
        <div
          key={rowKey}
          className="animate-pulse grid grid-cols-[60px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr)] items-center py-3 px-3 border border-white/5 rounded-xl bg-white/[0.01]"
        >
          <div className="w-6 h-4 rounded bg-white/[0.06] mx-auto" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-32 bg-white/[0.06] rounded" />
            <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
          </div>
          <div className="h-3 w-16 bg-white/[0.06] rounded justify-self-end" />
          <div className="h-3 w-20 bg-white/[0.06] rounded justify-self-end" />
        </div>
      ))}
    </div>
  );
};
