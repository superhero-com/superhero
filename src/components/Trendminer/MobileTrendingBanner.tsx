import React from 'react';
import { cn } from '../../lib/utils';
import AeButton from '../AeButton';
import WalletConnectBtn from '../WalletConnectBtn';
import GlobalStatsAnalytics from './GlobalStatsAnalytics';

interface MobileTrendingBannerProps {
  className?: string;
}

export default function MobileTrendingBanner({ className = '' }: MobileTrendingBannerProps) {
  return (
    <div className={cn(
      'bg-gradient-to-br from-yellow-400/10 to-orange-500/10 rounded-2xl p-5 mb-4 border border-white/10',
      'sm:p-4 sm:mb-3',
      className
    )}>
      <div className="flex flex-col gap-5 mb-5 sm:gap-4 sm:mb-4 md:flex-row md:items-start md:gap-6 lg:gap-8">
        <div className="md:flex-1">
          <h1 className="text-[28px] font-bold leading-tight mb-4 text-[var(--standard-font-color)] sm:text-2xl sm:mb-3 md:text-[32px]">
            Tokenize Trends.<br/>
            Own the Hype.<br/>
            Build Communities.
          </h1>
          
          <p className="text-sm leading-relaxed text-[var(--light-font-color)] opacity-80 sm:text-xs md:text-[15px]">
            Tokenized trends are community tokens launched on a bonding curve. Price moves with buys/sells, no order books.
            Each token mints a DAO treasury that can fund initiatives via on-chain votes. Connect your wallet to trade and participate.
          </p>
        </div>
        
        <div className="flex justify-center md:flex-none md:min-w-70 lg:min-w-80 md:order-first lg:order-last">
          <GlobalStatsAnalytics />
        </div>
      </div>
      
      <div className="space-y-3 sm:space-y-2.5 md:flex md:flex-wrap md:gap-3 md:space-y-0">
        <AeButton 
          variant="primary" 
          size="md" 
          rounded
          onClick={() => window.location.href = '/trendminer/create'}
          className="w-full h-11 text-sm font-semibold justify-center sm:h-10 sm:text-xs md:flex-1 md:min-w-35 md:max-w-50"
        >
          Tokenize a Trend
        </AeButton>
        
        <AeButton 
          variant="secondary" 
          size="md" 
          rounded
          outlined
          onClick={() => window.open('https://wallet.superhero.com', '_blank')}
          className="w-full h-11 text-sm font-semibold justify-center sm:h-10 sm:text-xs md:flex-1 md:min-w-35 md:max-w-50"
        >
          Get Superhero Wallet ↘
        </AeButton>
        
        <AeButton 
          variant="accent" 
          size="md" 
          rounded
          onClick={() => window.location.href = '/trendminer/daos'}
          className="w-full h-11 text-sm font-semibold justify-center sm:h-10 sm:text-xs md:flex-1 md:min-w-35 md:max-w-50"
        >
          Explore DAOs
        </AeButton>
        
        <AeButton 
          variant="ghost" 
          size="md" 
          rounded
          onClick={() => window.location.href = '/trendminer/invite'}
          className="w-full h-11 text-sm font-semibold justify-center sm:h-10 sm:text-xs md:flex-1 md:min-w-35 md:max-w-50"
        >
          Invite & Earn
        </AeButton>
        
        <WalletConnectBtn className="w-full h-11 text-sm font-semibold justify-center sm:h-10 sm:text-xs md:flex-1 md:min-w-35 md:max-w-50" />
      </div>
    </div>
  );
}
