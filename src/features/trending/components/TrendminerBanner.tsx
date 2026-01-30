import React from "react";
import AeButton from "../../../components/AeButton";
import GlobalStatsAnalytics from "../../../components/Trendminer/GlobalStatsAnalytics";

export default function TrendminerBanner() {
  return (
    <div className="rounded-[24px] mt-4 mb-6" style={{ background: 'linear-gradient(90deg, rgba(244, 193, 12, 0.1), rgba(255, 109, 21, 0.1))' }}>
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-center text-2xl sm:text-3xl lg:text-left lg:text-4xl font-bold leading-tight text-white">
              Tokenize Trends.
              <br />
              Own the Hype.
              <br />
              Build Communities.
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <AeButton
                  variant="primary"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = "/trends/create")}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  TOKENIZE A TREND
                </AeButton>

                <AeButton
                  variant="accent"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = "/trends/daos")}
                  className="bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  EXPLORE DAOS
                </AeButton>
                {/* Highlighted Invite & Earn Button */}
                <button
                  onClick={() => (window.location.href = "/trends/invite")}
                  className="group relative px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wide overflow-hidden transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                    boxShadow: '0 0 25px rgba(251, 191, 36, 0.4), 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                    color: '#000',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {/* Animated shimmer effect */}
                  <span 
                    className="absolute inset-0 opacity-60"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                      animation: 'invite-shimmer 2.5s ease-in-out infinite',
                    }}
                  />
                  {/* Pulse glow behind */}
                  <span 
                    className="absolute -inset-1 rounded-xl -z-10"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      filter: 'blur(12px)',
                      opacity: 0.6,
                      animation: 'invite-pulse 2s ease-in-out infinite',
                    }}
                  />
                  {/* Content */}
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <span>INVITE & EARN</span>
                    <span 
                      className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        color: '#fff',
                      }}
                    >
                      AE
                    </span>
                  </span>
                </button>
                {/* Animations for the button */}
                <style>{`
                  @keyframes invite-shimmer {
                    0% { transform: translateX(-100%); }
                    50%, 100% { transform: translateX(100%); }
                  }
                  @keyframes invite-pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.02); }
                  }
                `}</style>
              </div>

            </div>
            <div className="text-sm text-white/75 mt-2.5 max-w-[720px] overflow-hidden text-ellipsis leading-relaxed">
              Tokenized trends are community DAO tokens launched on a bonding
              curve. Price moves with buys/sells, no order books. Each token
              creates a DAO with treasury that can fund initiatives via on-chain
              votes. Connect your wallet to trade and participate.
            </div>
          </div>
          <div className="min-w-[300px] flex-shrink-0 lg:mt-8">
            <GlobalStatsAnalytics />
          </div>
        </div>
      </div>
    </div>
  );
}
