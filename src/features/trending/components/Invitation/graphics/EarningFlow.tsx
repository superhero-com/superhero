import { ArrowRight, Users, Coins, TrendingUp } from "lucide-react";

interface EarningFlowProps {
  className?: string;
}

export default function EarningFlow({ className }: EarningFlowProps) {
  return (
    <div className={`relative ${className || ""}`}>
      {/* Flow visualization */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 p-6 sm:p-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]">
        {/* Step 1: Invite */}
        <div className="flex flex-col items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/40">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 opacity-30 blur-lg animate-pulse" />
          </div>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-400 mb-1">You Invite</div>
            <div className="text-sm sm:text-base font-bold text-white">Friends</div>
          </div>
        </div>

        {/* Arrow 1 */}
        <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 rotate-90 sm:rotate-0 flex-shrink-0" />

        {/* Step 2: They Buy */}
        <div className="flex flex-col items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <Coins className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-30 blur-lg animate-pulse" />
          </div>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-400 mb-1">They Buy</div>
            <div className="text-sm sm:text-base font-bold text-white">Tokens</div>
          </div>
        </div>

        {/* Arrow 2 */}
        <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 rotate-90 sm:rotate-0 flex-shrink-0" />

        {/* Step 3: You Earn */}
        <div className="flex flex-col items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/40 animate-pulse">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500 to-teal-500 opacity-30 blur-lg animate-pulse" />
          </div>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-400 mb-1">You Earn</div>
            <div className="text-sm sm:text-base font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
              Rewards
            </div>
          </div>
        </div>
      </div>

      {/* Percentage badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full border-2 border-black/20 shadow-lg">
        <span className="text-xs sm:text-sm font-bold text-white">0.5% Commission</span>
      </div>
    </div>
  );
}

