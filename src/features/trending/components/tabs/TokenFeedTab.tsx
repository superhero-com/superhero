import React, { useMemo } from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenTopicFeed from '@/features/social/components/TokenTopicFeed';
import TokenTopicComposer from '@/features/social/components/TokenTopicComposer';
import { Clock, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type TokenFeedTabProps = {
  token: TokenDto;
  isMobile: boolean;
  showComposer: boolean;
  holdersOnly: boolean;
  setHoldersOnly: (next: boolean) => void;
  showTradePanels: boolean;
  setShowTradePanels: (next: boolean | ((prev: boolean) => boolean)) => void;
};

export const TokenFeedTab = ({
  token,
  isMobile,
  showComposer,
  holdersOnly: _holdersOnly,
  setHoldersOnly,
  showTradePanels,
  setShowTradePanels,
}: TokenFeedTabProps) => {
  const { t } = useTranslation('trending');
  const holdersOnly = useMemo(() => (_holdersOnly && token.sale_address), [_holdersOnly, token.sale_address]);

  return (
    <div className="grid">
      {isMobile && (
        <div className="px-3 py-2.5 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHoldersOnly(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${holdersOnly
                  ? 'bg-[#4ecdc4] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'
                }`}
                aria-pressed={holdersOnly}
              >
                <Flame className="h-3.5 w-3.5" />
                {t('feedTab.popular')}
              </button>
              <button
                type="button"
                onClick={() => setHoldersOnly(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!holdersOnly
                  ? 'bg-[#4ecdc4] text-black'
                  : 'bg-white/5 text-white/60 hover:text-white'
                }`}
                aria-pressed={!holdersOnly}
              >
                <Clock className="h-3.5 w-3.5" />
                {t('feedTab.latest')}
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap px-1">
        {!isMobile && (
          <h3 className="m-0 text-white/90 font-semibold">
            {t('feedTab.postsForHashtag', { name: String(token.name || token.symbol || '').toUpperCase() })}
          </h3>
        )}
        {(!isMobile && token.sale_address) && (
          <div className="inline-flex items-center rounded-full bg-white/10 border border-white/25 p-1">
            <button
              type="button"
              onClick={() => setShowTradePanels((prev) => !prev)}
              aria-pressed={showTradePanels}
              className={`px-3.5 py-1.5 rounded-full text-[18px] font-bold tracking-wide transition-colors ${showTradePanels
                ? 'bg-white/10 text-white/80 hover:text-white'
                : 'bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-black shadow-md'
              }`}
            >
              {showTradePanels ? t('feedTab.hideGraphs') : t('feedTab.trade')}
            </button>
          </div>
        )}
      </div>

      {showComposer && (
        <TokenTopicComposer tokenName={(token.name || token.symbol || '').toString()} />
      )}

      {!isMobile && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/15 p-0.5 text-[11px]">
            {
              token.sale_address && (
                <button
                  type="button"
                  onClick={() => setHoldersOnly(true)}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${holdersOnly
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-sm'
                    : 'bg-transparent text-white/65 hover:text-white'
                  }`}
                >
                  {t('feedTab.holdersOnly')}
                </button>
              )
            }
            <button
              type="button"
              onClick={() => setHoldersOnly(false)}
              className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${!holdersOnly
                ? 'bg-white text-black shadow-sm'
                : 'bg-transparent text-white/65 hover:text-white'
              }`}
            >
              {t('feedTab.allPosts')}
            </button>
          </div>
        </div>
      )}

      <TokenTopicFeed
        topicName={`#${String(token.name || token.symbol || '').toLowerCase()}`}
        displayTokenName={(token.name || token.symbol || '').toString()}
        showEmptyMessage
        tokenSaleAddress={String((token as any).sale_address || (token as any).address || (token as any).token_address || '')}
        tokenDecimals={Number((token as any).decimals ?? 18)}
        tokenSymbol={String(token.symbol || token.name || '').toString()}
        holdersOnly={holdersOnly}
        onAutoDisableHoldersOnly={() => setHoldersOnly(false)}
      />
    </div>
  );
};
