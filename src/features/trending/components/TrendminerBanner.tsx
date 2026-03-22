import React from 'react';
import AeButton from '../../../components/AeButton';
import GlobalStatsAnalytics from '../../../components/Trendminer/GlobalStatsAnalytics';

const TrendminerBanner = () => (
  <div className="rounded-2xl mt-4 mb-4 border border-white/10 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent">
    <div className="p-3 sm:p-4">
      {/* Headline + actions */}
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-snug text-white">
            Tokenize Trends.
            {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Own the Hype.
            </span>
            {' '}
            Build Communities.
          </h1>
          <p className="text-xs text-white/50 mt-1 leading-relaxed hidden sm:block">
            Tokenized trends are community DAO tokens launched on a bonding curve. Price moves with buys/sells, no order books.
            <br />
            Each token creates a DAO with treasury that can fund initiatives via on-chain votes. Connect your wallet to trade and participate.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <AeButton
            variant="primary"
            size="sm"
            rounded
            onClick={() => { window.location.href = '/trends/create'; }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Tokenize a Trend
          </AeButton>

          <AeButton
            variant="accent"
            size="sm"
            rounded
            onClick={() => { window.location.href = '/trends/daos'; }}
            className="bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Explore DAOs
          </AeButton>

          <AeButton
            variant="ghost"
            size="sm"
            rounded
            onClick={() => { window.location.href = '/trends/invite'; }}
            className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Invite &amp; Earn
          </AeButton>
        </div>
      </div>

      {/* Stats row — always on top, full width */}
      <div className="mt-3">
        <GlobalStatsAnalytics />
      </div>
    </div>
  </div>
);

export default TrendminerBanner;
