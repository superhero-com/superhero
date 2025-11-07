import { useState } from "react";
import { TrendingUp, Users, Coins, ArrowRight } from "lucide-react";
import { Decimal } from "@/libs/decimal";
import LivePriceFormatter from "@/features/shared/components/LivePriceFormatter";

// Note: This percentage should be updated once confirmed from bctsl-contracts repo
// Currently using 0.5% as placeholder based on calculateBuyPriceWithAffiliationFee
const EARNING_PERCENTAGE = 0.5; // This will be updated with actual percentage

interface EarningExplanationProps {
  className?: string;
}

export default function EarningExplanation({ className }: EarningExplanationProps) {
  const [exampleAmount, setExampleAmount] = useState<number>(100);
  const [exampleInvitees, setExampleInvitees] = useState<number>(10);

  // Calculate example earnings
  const exampleEarnings = (exampleAmount * exampleInvitees * EARNING_PERCENTAGE) / 100;

  return (
    <div className={`bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-6 sm:p-8 md:p-10 relative overflow-hidden transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] ${className || ""}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/3 via-purple-500/3 to-blue-500/3 pointer-events-none opacity-50" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="text-4xl sm:text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            💰
          </div>
          <div>
            <h3 className="m-0 mb-2 text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
              How Much Can You Earn?
            </h3>
            <p className="text-sm sm:text-base text-slate-400 m-0">
              Earn a percentage of every token purchase made by your invitees
            </p>
          </div>
        </div>

        {/* Earning Percentage Display */}
        <div className="mb-8 p-6 sm:p-8 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-blue-500/15 rounded-xl sm:rounded-2xl border border-white/10 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400" />
            <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              {EARNING_PERCENTAGE}%
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 m-0">
            of every token purchase made by your invitees
          </p>
        </div>

        {/* Visual Flow */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-400 mb-1">Your Invitees</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {exampleInvitees} friends
                </div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 rotate-90 sm:rotate-0" />
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-400 mb-1">They Buy Tokens</div>
                <LivePriceFormatter
                  aePrice={Decimal.from(exampleAmount)}
                  watchPrice={false}
                  className="text-lg sm:text-xl md:text-2xl font-bold text-white"
                />
                <span className="text-sm text-slate-400 ml-1">each</span>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 rotate-90 sm:rotate-0" />
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center animate-pulse">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-400 mb-1">You Earn</div>
                <LivePriceFormatter
                  aePrice={Decimal.from(exampleEarnings)}
                  watchPrice={false}
                  className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Calculator */}
        <div className="p-4 sm:p-6 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-lg sm:text-xl font-bold text-white mb-4">Try It Yourself</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs sm:text-sm text-slate-400 mb-2">
                Number of Invitees
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={exampleInvitees}
                onChange={(e) => setExampleInvitees(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm text-slate-400 mb-2">
                Average Purchase (AE)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                step="0.1"
                value={exampleAmount}
                onChange={(e) => setExampleAmount(Math.max(0.1, Math.min(10000, Number(e.target.value) || 0)))}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20"
              />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-500/15 to-teal-500/15 rounded-lg border border-white/10">
            <div className="text-xs sm:text-sm text-slate-300 mb-1">Your Potential Earnings</div>
            <LivePriceFormatter
              aePrice={Decimal.from(exampleEarnings)}
              watchPrice={false}
              className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent"
            />
          </div>
        </div>

        {/* Key Points */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-pink-400 text-lg">✓</span>
            <p className="text-sm text-slate-300 m-0">
              Earnings are automatic - no action needed once invitees buy tokens
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-purple-400 text-lg">✓</span>
            <p className="text-sm text-slate-300 m-0">
              Rewards accumulate over time from all your invitees' purchases
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-blue-400 text-lg">✓</span>
            <p className="text-sm text-slate-300 m-0">
              Withdraw anytime after 4+ invitees have purchased tokens
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

