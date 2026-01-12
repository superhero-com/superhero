import React, { useEffect, useRef, useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import HeroSection from "../components/landing/HeroSection";
import FeaturedTopics from "../components/landing/FeaturedTopics";
import LiveActivityTicker from "../components/landing/LiveActivityTicker";
import EnhancedTokenList from "../components/landing/EnhancedTokenList";
import Head from "../seo/Head";
import { useSectionTheme } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { TokensService } from "@/api/generated";
import { useAccount } from "@/hooks";
import Spinner from "@/components/Spinner";

type SortOption = 'trending_score' | 'market_cap' | 'price' | 'newest' | 'holders_count';

export default function Home() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { activeAccount } = useAccount();
  
  // Scroll tracking for section transition
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Token list state
  const [orderBy, setOrderBy] = useState<SortOption>('trending_score');
  const [search, setSearch] = useState("");
  const [searchThrottled, setSearchThrottled] = useState("");
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setHasScrolledPastHero(rect.top <= 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Throttle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchThrottled(search);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const orderByMapped = useMemo(() => {
    if (orderBy === 'newest') {
      return 'created_at';
    }
    return orderBy;
  }, [orderBy]);

  const finalOrderDirection = useMemo((): 'ASC' | 'DESC' => {
    if (orderBy === 'newest') return 'DESC';
    return 'DESC';
  }, [orderBy]);

  const { data, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      TokensService.listAll({
        orderBy: orderByMapped as any,
        orderDirection: finalOrderDirection,
        search: searchThrottled || undefined,
        limit: 20,
        page: pageParam,
      }),
    getNextPageParam: (lastPage: any, allPages, lastPageParam) =>
      lastPage?.meta?.currentPage === lastPage?.meta?.totalPages
        ? undefined
        : lastPageParam + 1,
    queryKey: [
      "Home.TokenList",
      orderBy,
      orderByMapped,
      finalOrderDirection,
      searchThrottled,
    ],
    staleTime: 1000 * 60,
  });

  // Flatten all token items from pages
  const allTokens = useMemo(() => 
    data?.pages?.flatMap(page => page.items) || [],
    [data?.pages]
  );

  // Intersection observer for infinite loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio === 1 && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );
    if (loadMoreBtn.current) {
      observer.observe(loadMoreBtn.current);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  return (
    <div className="home-page">
      <Head
        title="Superhero - Tokenize Trends, Own the Hype"
        description="Every hashtag is a token. Discover trending topics, trade opinions, and own the hype on Superhero."
        canonicalPath="/"
      />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Live Activity Ticker */}
      <LiveActivityTicker />
      
      {/* Featured Topics/Hashtags Grid */}
      <FeaturedTopics />
      
      {/* Full Token List - Continuous Scroll */}
      <div ref={sectionRef} className="w-full mt-6">
        {/* Enhanced Token List */}
        <EnhancedTokenList
          tokens={allTokens}
          loading={isFetching && !data?.pages?.length}
          orderBy={orderBy}
          onSortChange={setOrderBy}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center py-6">
            <button
              ref={loadMoreBtn}
              onClick={() => fetchNextPage()}
              disabled={isFetching}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold
                transition-all duration-300
                ${isFetching
                  ? isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-400'
                  : 'hover:scale-105 active:scale-95'
                }
              `}
              style={!isFetching ? {
                background: colors.gradient,
                color: 'white',
                boxShadow: `0 4px 20px ${colors.primary}30`
              } : undefined}
            >
              {isFetching ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Loading...
                </>
              ) : (
                <>
                  Load More Hashtags
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
