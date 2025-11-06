import { Link } from 'react-router-dom';
import { PostDto, TokensService } from '../../../api/generated';
import { useQuery } from '@tanstack/react-query';
import { TrendminerApi } from '../../../api/backend';

export default function HashtagWithChange({ tag, post }: { tag: string, post?: PostDto }) {
  const clean = String(tag || '').replace(/^#/, '');
  const upper = clean.toUpperCase();
  const normalized = clean.toLowerCase();

  // Try to find topic in post topics (case-insensitive)
  // Handle both TopicDto objects and string arrays (for backward compatibility)
  // Also handle trailing punctuation in topic names (e.g., "people." vs "people")
  const normalizeTopicName = (name: string) => name.toLowerCase().replace(/[.,!?;:]+$/, '');
  const topic = post?.topics?.find((t) => {
    if (typeof t === 'string') {
      return normalizeTopicName(t) === normalized;
    }
    return normalizeTopicName(t.name || '') === normalized;
  });
  const topicPerf = typeof topic === 'object' && topic !== null && 'token' in topic 
    ? topic.token?.performance 
    : null;
  const changePercentFromTopic = topicPerf?.past_30d?.current_change_percent 
    ?? topicPerf?.past_7d?.current_change_percent
    ?? topicPerf?.past_24h?.current_change_percent;
  const hasTopicData = changePercentFromTopic != null;
  const topicToken = typeof topic === 'object' && topic !== null && 'token' in topic 
    ? topic.token 
    : null;
  // Check if topic token has actual change percent data (not just null periods)
  const topicTokenHasPerformance = !!(
    topicToken?.performance?.past_30d?.current_change_percent != null ||
    topicToken?.performance?.past_7d?.current_change_percent != null ||
    topicToken?.performance?.past_24h?.current_change_percent != null
  );

  // If topic has token but no performance, fetch performance for that token
  const shouldFetchTopicPerformance = !!topicToken && !topicTokenHasPerformance && !!topicToken?.sale_address;
  const { data: topicPerformanceData } = useQuery({
    queryKey: ['topic-token-performance', topicToken?.sale_address],
    queryFn: async () => {
      if (!topicToken?.sale_address) return null;
      try {
        const result = await TrendminerApi.getTokenPerformance(topicToken.sale_address);
        return result;
      } catch (err) {
        console.warn(`[HashtagWithChange] Failed to fetch performance for topic token ${upper}:`, err);
        return null;
      }
    },
    enabled: shouldFetchTopicPerformance,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fallback: if we don't have change percent data, try to fetch token by symbol
  // Fetch if: no topic data AND no topic token (if topic has token, we fetch performance instead)
  const shouldFetchToken = !hasTopicData && !topicToken && !!normalized;
  const { data: tokenData, isLoading: isLoadingToken } = useQuery({
    queryKey: ['token-by-symbol', upper],
    queryFn: async () => {
      try {
        const result = await TokensService.findByAddress({ address: upper });
        if (result) {
          console.log(`[HashtagWithChange] Fetched token for ${upper}:`, { 
            hasPerformance: !!result.performance,
            saleAddress: result.sale_address 
          });
        }
        return result;
      } catch (err) {
        console.warn(`[HashtagWithChange] Failed to fetch token for ${upper}:`, err);
        return null;
      }
    },
    enabled: shouldFetchToken,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // If token exists but doesn't have performance data, fetch it separately
  const tokenExists = !!tokenData;
  // Check if token has actual change percent data (not just null periods)
  const tokenHasPerformance = !!(
    tokenData?.performance?.past_30d?.current_change_percent != null ||
    tokenData?.performance?.past_7d?.current_change_percent != null ||
    tokenData?.performance?.past_24h?.current_change_percent != null
  );
  const shouldFetchPerformance = shouldFetchToken && tokenExists && !tokenHasPerformance && !!tokenData?.sale_address;
  const { data: performanceData } = useQuery({
    queryKey: ['token-performance', tokenData?.sale_address],
    queryFn: async () => {
      if (!tokenData?.sale_address) return null;
      try {
        const result = await TrendminerApi.getTokenPerformance(tokenData.sale_address);
        return result;
      } catch (err) {
        console.warn(`[HashtagWithChange] Failed to fetch performance for ${upper}:`, err);
        return null;
      }
    },
    enabled: shouldFetchPerformance,
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Try to get change percent from various sources, checking multiple time periods
  const getChangePercent = (perf: any) => {
    return perf?.past_30d?.current_change_percent 
      ?? perf?.past_7d?.current_change_percent
      ?? perf?.past_24h?.current_change_percent
      ?? null;
  };

  const changePercent = changePercentFromTopic 
    ?? getChangePercent(topicPerformanceData)
    ?? getChangePercent(tokenData?.performance)
    ?? getChangePercent(performanceData);
  const isUp = changePercent != null && changePercent > 0;
  const isDown = changePercent != null && changePercent < 0;


  const linkTo = `/trends/tokens/${upper}`;

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <Link
        to={linkTo}
        className="break-words relative inline-block"
        style={{ color: '#00ff9d' }}
        onClick={(e) => e.stopPropagation()}
      >
        #{clean}
      </Link>
      {changePercent != null && (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none tracking-tighter ${isUp
              ? 'bg-green-400/10 text-green-400 border border-green-400/20'
              : isDown
                ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}
          title="24h change"
          aria-label={`24h change: ${changePercent.toFixed(2)}%`}
        >
          {changePercent.toFixed(2)}%
        </span>
      )}
    </span>
  );
}


