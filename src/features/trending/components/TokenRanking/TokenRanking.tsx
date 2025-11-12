import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SuperheroApi } from '../../../../api/backend';
import { Decimal } from '../../../../libs/decimal';
import { toAe } from '@aeternity/aepp-sdk';

interface TokenRankingProps {
  token: {
    sale_address?: string;
    name?: string;
    symbol?: string;
    total_supply?: string;
    rank?: number;
  };
}

interface RankingToken {
  sale_address: string;
  name: string;
  symbol: string;
  total_supply: string;
  rank: number;
}

interface RankingData {
  items: RankingToken[];
  meta?: {
    currentPage: number;
    totalPages: number;
  };
}

const LIST_SIZE = 5;

export default function TokenRanking({ token }: TokenRankingProps) {
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate ranking limit based on token rank (similar to Vue computed)
  const tokenRankingLimit = useMemo(() => {
    const rank = token.rank || 1;
    if (rank === 1) return LIST_SIZE + 3;
    if (rank === 2) return LIST_SIZE + 1;
    return LIST_SIZE;
  }, [token.rank]);

  // Fetch ranking data
  useEffect(() => {
    let cancelled = false;

    async function fetchRankings() {
      if (!token.sale_address) return;
      
      setLoading(true);
      try {
        const data = await SuperheroApi.listTokenRankings(token.sale_address, {
          limit: tokenRankingLimit,
          page: 1,
        });
        
        if (!cancelled) {
          setRankingData(data as RankingData);
        }
      } catch (error) {
        console.error('Failed to fetch token rankings:', error);
        if (!cancelled) {
          setRankingData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRankings();
    return () => {
      cancelled = true;
    };
  }, [token.sale_address, tokenRankingLimit]);

  const rankingTokens = rankingData?.items || [];

  // Find current token rank from ranking data or use prop
  const tokenRank = useMemo(() => {
    return rankingTokens.find(item => item.sale_address === token.sale_address)?.rank || token.rank || 1;
  }, [rankingTokens, token.sale_address, token.rank]);

  // Calculate tokens ahead to level up
  const tokensAhead = useMemo(() => {
    const nextRankToken = rankingTokens.find(({ rank }) => rank === tokenRank - 1);
    
    if (!nextRankToken || !token.total_supply) return '0';

    const nextTokenSupply = getDecimalValue(nextRankToken.total_supply);
    const currentTokenSupply = getDecimalValue(token.total_supply);
    const difference = nextTokenSupply.sub(currentTokenSupply);

    return difference.gte(0) ? difference.shorten().replace('.00', '') : '0';
  }, [rankingTokens, tokenRank, token.total_supply]);

  // Find closest chaser (token behind current)
  const closestChaser = useMemo(() => {
    return tokenRank <= 1 
      ? undefined 
      : rankingTokens.find(item => item.rank === tokenRank + 1);
  }, [rankingTokens, tokenRank]);

  // Calculate tokens behind
  const tokensBehind = useMemo(() => {
    if (!closestChaser || !token.total_supply) return '0';

    const currentTokenSupply = getDecimalValue(token.total_supply);
    const chaserTokenSupply = getDecimalValue(closestChaser.total_supply);
    const difference = currentTokenSupply.sub(chaserTokenSupply);

    return difference.gte(0) ? difference.shorten().replace('.00', '') : '0';
  }, [closestChaser, token.total_supply]);

  function getDecimalValue(value: string): Decimal {
    try {
      // Convert from aettos to AE (assuming 18 decimals)
      return Decimal.from(toAe(value));
    } catch {
      return Decimal.from(0);
    }
  }

  function getShortenValue(value: string): string {
    return getDecimalValue(value).shorten();
  }

  function calculateDifference(currentSupply: string, compareSupply: string): { value: string; isPositive: boolean } {
    const current = getDecimalValue(currentSupply);
    const compare = getDecimalValue(compareSupply);
    
    // If current token supply is less than compare token supply, show positive (red)
    // If current token supply is greater than compare token supply, show negative (green)
    const isCurrentLess = current.lt(compare);
    const difference = isCurrentLess ? compare.sub(current) : current.sub(compare);
    
    return {
      value: difference.shorten(),
      isPositive: isCurrentLess // Red when current token has less supply (behind)
    };
  }

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <h3 className="text-xl font-bold text-white m-0 mb-6 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
        Ranking Race
      </h3>

      {/* Level Up Info */}
      <div className="mb-6 text-sm font-medium text-white/70 leading-relaxed">
        {tokenRank > 1 ? (
          <div>
            Buy <strong className="text-[#4ecdc4]">{tokensAhead === '0' ? 'any amount' : tokensAhead}</strong> more{' '}
            <span className="font-bold text-white">{token.name}</span> to level up!
          </div>
        ) : (
          <div>
            Highest ranked token!
            {closestChaser && (
              <div className="mt-1">
                <strong className="text-[#4ecdc4]">{tokensBehind}</strong> tokens ahead of the next token.
              </div>
            )}
          </div>
        )}
      </div>

      {/* List Header */}
      <div className="flex justify-between items-center mb-4 text-xs font-semibold text-white/60 uppercase tracking-wide">
        <div className="flex items-center gap-1">
          <span>MC Rank</span>
          <div className="relative group">
            {/* <button className="rounded-full bg-white/10 text-white/60 text-sm items-center justify-center hover:bg-white/20 transition-colors">
              ?
            </button> */}
            <button className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white cursor-pointer text-base">
                !
              </button>
            <div className="absolute bottom-6 left-0 bg-white/10 border border-white/20 rounded-lg p-2 text-xs text-white/80 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Market Cap Ranking Information
            </div>
          </div>
        </div>
        <div>Total Supply</div>
      </div>

      {/* Ranking List */}
      <div className="space-y-2">
        {rankingTokens.map((item) => {
          const isCurrentToken = item.sale_address === token.sale_address;
          const difference = token.total_supply ? calculateDifference(token.total_supply, item.total_supply) : null;

          return (
            
            <Link
              key={item.sale_address}
              to={`/trending/tokens/${item.name}`}
              className={`
                flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ease-out text-decoration-none
                ${isCurrentToken 
                  ? 'bg-white/20 border-white/30 text-white' 
                  : 'bg-white/[0.05] border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`
                  text-sm font-bold text-right min-w-[20px] tracking-tight
                  
                `}>
                  {item.rank}
                </div>
                <div className={`
                  font-bold text-sm tracking-tight truncate transition-all duration-200 text-[#4ecdc4] opacity-100
                  
                `}>
                  {item.symbol}
                </div>
              </div>

              <div className="text-right font-semibold">
                {isCurrentToken ? (
                  <span className="text-white">
                    {getShortenValue(item.total_supply)}
                  </span>
                ) : difference ? (
                  <span className={difference.isPositive ? 'text-red-400' : 'text-green-400'}>
                    {difference.isPositive ? '+' : '-'}{difference.value}
                  </span>
                ) : (
                  <span className="text-white/60">
                    {getShortenValue(item.total_supply)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {rankingTokens.length === 0 && !loading && (
        <div className="text-center py-8 text-white/60">
          No ranking data available
        </div>
      )}
    </div>
  );
}
