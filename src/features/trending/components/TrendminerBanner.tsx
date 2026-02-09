import React from 'react';
import AeButton from '../../../components/AeButton';
import GlobalStatsAnalytics from '../../../components/Trendminer/GlobalStatsAnalytics';

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
                  onClick={() => (window.location.href = '/trends/create')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  TOKENIZE A TREND
                </AeButton>

                <AeButton
                  variant="accent"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = '/trends/daos')}
                  className="bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  EXPLORE DAOS
                </AeButton>
                <AeButton
                  variant="ghost"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = '/trends/invite')}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  INVITE & EARN
                </AeButton>
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
