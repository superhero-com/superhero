import { Trophy, TrendingUp, Users } from "lucide-react";

interface StatsSectionProps {
  className?: string;
}

export default function StatsSection({ className }: StatsSectionProps) {
  // Placeholder stats - these would be fetched from API in real implementation
  const stats = {
    totalRewardsEarned: 0, // Would be fetched from API
    totalInvitees: 0, // Would be fetched from API
    topEarner: null as { address: string; amount: number } | null, // Would be fetched from API
  };

  // Only show if we have data (for now, showing placeholder structure)
  const showStats = false; // Set to true when API integration is ready

  if (!showStats) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 relative overflow-hidden ${className || ""}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-red-500/5 animate-pulse pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
          <div>
            <h3 className="m-0 mb-2 text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent break-words">
              Community Stats
            </h3>
            <p className="text-sm sm:text-base text-slate-400 m-0">
              See how the community is earning together
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Total Rewards */}
          <div className="p-4 sm:p-6 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">
                Total Rewards
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {/* Would display actual stats */}
            </div>
          </div>

          {/* Total Invitees */}
          <div className="p-4 sm:p-6 bg-white/5 rounded-xl border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">
                Total Invitees
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {/* Would display actual stats */}
            </div>
          </div>

          {/* Top Earner */}
          {stats.topEarner && (
            <div className="p-4 sm:p-6 bg-white/5 rounded-xl border border-white/10 hover:border-blue-400/50 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider">
                  Top Earner
                </div>
              </div>
              <div className="text-sm sm:text-base font-bold text-white truncate">
                {/* Would display top earner address */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

