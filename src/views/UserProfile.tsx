/* eslint-disable
  import/no-named-as-default,
  import/order,
  react/function-component-definition,
  @typescript-eslint/no-unused-vars,
  react-hooks/exhaustive-deps,
  no-restricted-syntax,
  no-shadow,
  no-nested-ternary,
  react/button-has-type,
  max-len,
  no-console
*/
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import AccountCreatedToken from '@/components/Account/AccountCreatedToken';
import AccountFeed from '@/components/Account/AccountFeed';
import Spinner from '@/components/Spinner';
import AccountOwnedTokens from '@/components/Account/AccountOwnedTokens';
import AccountTrades from '@/components/Account/AccountTrades';
import Head from '../seo/Head';
import AeButton from '../components/AeButton';
import RightRail from '../components/layout/RightRail';
import Shell from '../components/layout/Shell';

import { PostsService } from '../api/generated';
import type { PostDto } from '../api/generated';
import { AccountsService } from '../api/generated/services/AccountsService';
import { AccountTokensService } from '../api/generated/services/AccountTokensService';
import { TokensService } from '../api/generated/services/TokensService';
import { TransactionsService } from '../api/generated/services/TransactionsService';
import { PostApiResponse } from '../features/social/types';
import '../features/social/views/FeedList.scss';
import { useAccountBalances } from '../hooks/useAccountBalances';
import { useAddressByChainName, useChainName } from '../hooks/useChainName';
import { SuperheroApi } from '../api/backend';

import AccountPortfolio from '@/components/Account/AccountPortfolio';
import ProfileEditModal from '../components/modals/ProfileEditModal';
import { CONFIG } from '../config';
import { useModal } from '../hooks';
import { useProfile } from '../hooks/useProfile';
import { IconDiamond, IconLink } from '../icons';

type TabType = 'feed' | 'owned' | 'created' | 'transactions';
export default function UserProfile({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { address } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Support AENS chain name route: /users/<name.chain>
  const isChainName = address?.endsWith('.chain');
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? address : undefined,
  );
  const effectiveAddress = isChainName && resolvedAddress ? resolvedAddress : (address as string);
  const { decimalBalance, aex9Balances, loadAccountData } = useAccountBalances(effectiveAddress);
  const { chainName } = useChainName(effectiveAddress);
  const { getProfile, canEdit } = useProfile(effectiveAddress);
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const { data, refetch: refetchPosts } = useQuery({
    queryKey: ['PostsService.listAll', address],
    queryFn: () => PostsService.listAll({
      limit: 100,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      search: '',
      accountAddress: effectiveAddress,
    }) as unknown as Promise<PostApiResponse>,
    enabled: !!effectiveAddress,
  });

  // Account info (bio, chain name, totals) from backend
  const { data: accountInfo, refetch: refetchAccount } = useQuery({
    queryKey: ['AccountsService.getAccount', effectiveAddress],
    queryFn: () => AccountsService.getAccount({
      address: effectiveAddress,
    }) as unknown as Promise<any>,
    enabled: !!effectiveAddress,
    staleTime: 10_000,
  });

  const [profile, setProfile] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Optimistic bio state - updated immediately when bio is posted
  const [optimisticBio, setOptimisticBio] = useState<string | null>(null);
  // Loading indicator state for bio updates
  const [isBioLoading, setIsBioLoading] = useState(false);

  // Get tab from URL search params, default to "feed"
  const tabFromUrl = searchParams.get('tab') as TabType;
  const [tab, setTab] = useState<TabType>(
    tabFromUrl && ['feed', 'owned', 'created', 'transactions'].includes(tabFromUrl)
      ? tabFromUrl
      : 'feed',
  );

  // Function to handle tab changes and update URL
  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams);
    if (newTab === 'feed') {
      // Remove tab param for default tab to keep URL clean
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', newTab);
    }
    setSearchParams(newSearchParams, { replace: true });

    // Scroll to tabs section after a brief delay to allow DOM update
    setTimeout(() => {
      const tabsSection = document.getElementById('profile-tabs-section');
      if (tabsSection) {
        // Get navbar height dynamically (header is sticky)
        const header = document.querySelector('header') || document.querySelector('[class*="mobile-navigation"]');
        const headerHeight = header ? header.getBoundingClientRect().height : 64; // Default to 64px (h-16)

        // Calculate scroll position accounting for navbar
        const elementPosition = tabsSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight - 8; // 8px extra spacing

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  // Sync tab state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TabType;
    if (urlTab && ['feed', 'owned', 'created', 'transactions'].includes(urlTab)) {
      setTab(urlTab);
    } else if (!urlTab) {
      setTab('feed');
    }
  }, [searchParams]);

  const { data: ownedTokensResp } = useQuery({
    queryKey: [
      'AccountTokensService.listTokenHolders-counter',
      effectiveAddress,
    ],
    queryFn: () => AccountTokensService.listTokenHolders({
      address: effectiveAddress,
      orderBy: 'balance',
      limit: 1,
      page: 1,
    }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!effectiveAddress,
    staleTime: 60_000,
  });

  // Fetch created tokens count for stats display
  const { data: createdTokensResp } = useQuery({
    queryKey: [
      'TokensService.listAll',
      'created-count',
      effectiveAddress,
    ],
    queryFn: () => TokensService.listAll({
      creatorAddress: effectiveAddress,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 1,
      page: 1,
    }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!effectiveAddress,
    staleTime: 60_000,
  });

  // Get posts from the query data
  const posts = data?.items || [];

  // Latest bio from tipping v3 posts tagged with "bio-update"
  const latestBioPost = useMemo(() => {
    for (const p of posts) {
      const topics = (Array.isArray((p as any).topics) ? (p as any).topics : []).map((t: string) => String(t).toLowerCase());
      const media = (Array.isArray((p as any).media) ? (p as any).media : []).map((m: string) => String(m).toLowerCase());

      // Heuristic 1: topics/media contains the tag
      const hasTagInTopicsOrMedia = topics.includes('bio-update') || media.includes('bio-update');

      // Heuristic 2: inspect tx_args for a list of tags including "bio-update"
      const args: any[] = Array.isArray((p as any).tx_args) ? (p as any).tx_args : [];
      const hasTagInTxArgs = args.some((arg: any) => {
        if (!arg || typeof arg !== 'object') return false;
        if (String(arg.type).toLowerCase() !== 'list') return false;
        const listVal: any[] = Array.isArray(arg.value) ? arg.value : [];
        return listVal.some((item: any) => String(item?.value || '').toLowerCase() === 'bio-update');
      });

      if (hasTagInTopicsOrMedia || hasTagInTxArgs) return p;
    }
    return undefined;
  }, [posts]);
  const bioText = (optimisticBio || accountInfo?.bio || '').trim()
    || latestBioPost?.content?.trim()
    || profile?.biography;

  useEffect(() => {
    if (!effectiveAddress) return;
    // Clear optimistic bio and loading state when address changes
    setOptimisticBio(null);
    setIsBioLoading(false);
    // Scroll to top whenever navigating to a user profile
    window.scrollTo(0, 0);
    // Note: loadAccountData() is automatically called by useAccountBalances hook
    // when effectiveAddress changes, so no manual call is needed here
    (async () => {
      const p = await getProfile();
      setProfile(p);
    })();
  }, [effectiveAddress]);

  // Prefetch all tab data in the background so switching tabs is instant
  useEffect(() => {
    if (!effectiveAddress) return;

    // Prefetch feed tab data (posts and activities)
    queryClient.prefetchInfiniteQuery({
      queryKey: ['profile-posts', effectiveAddress],
      queryFn: ({ pageParam = 1 }) => PostsService.listAll({
        accountAddress: effectiveAddress,
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: 10,
        page: pageParam,
      }) as any,
      initialPageParam: 1,
      getNextPageParam: (lastPage: any) => {
        if (
          lastPage?.meta?.currentPage
          && lastPage?.meta?.totalPages
          && lastPage.meta.currentPage < lastPage.meta.totalPages
        ) {
          return lastPage.meta.currentPage + 1;
        }
        return undefined;
      },
    });

    queryClient.prefetchInfiniteQuery({
      queryKey: ['profile-activities', effectiveAddress],
      queryFn: async ({ pageParam = 1 }) => {
        const resp = await SuperheroApi.listTokens({
          creatorAddress: effectiveAddress,
          orderBy: 'created_at',
          orderDirection: 'DESC',
          limit: 50,
          page: pageParam as number,
        }).catch(() => ({ items: [] }));
        // Map token items to PostDto format to match AccountFeed.tsx query
        const items = (resp?.items || []).map((payload: any): PostDto => {
          const saleAddress: string = payload?.sale_address || payload?.address || '';
          const name: string = payload?.token_name || payload?.name || 'Unknown';
          const createdAt: string = payload?.created_at || new Date().toISOString();
          const encodedName = encodeURIComponent(name);
          const id = `token-created:${encodedName}:${saleAddress}:${createdAt}_v3`;
          return {
            id,
            tx_hash: payload?.tx_hash || '',
            tx_args: [
              { token_name: name },
              { sale_address: saleAddress },
              { kind: 'token-created' },
            ],
            sender_address: payload?.creator_address || effectiveAddress || '',
            contract_address: saleAddress || '',
            type: 'TOKEN_CREATED',
            content: '',
            topics: ['token:created', `token_name:${name}`, `#${name}`].filter(Boolean) as string[],
            media: [],
            total_comments: 0,
            created_at: createdAt,
          } as PostDto;
        });
        return items;
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage: any[], pages: any[][]) => (lastPage && lastPage.length === 50 ? pages.length + 1 : undefined),
    });

    // Prefetch owned tokens tab data
    queryClient.prefetchQuery({
      queryKey: ['DataTable', { page: 1, limit: 10 }, { address: effectiveAddress, orderBy: 'balance', orderDirection: 'DESC' }],
      queryFn: () => AccountTokensService.listTokenHolders({
        address: effectiveAddress,
        orderBy: 'balance',
        orderDirection: 'DESC',
        limit: 10,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
      staleTime: 60_000,
    });

    // Prefetch created tokens tab data
    queryClient.prefetchQuery({
      queryKey: [
        'TokensService.listAll',
        'created',
        effectiveAddress,
        'market_cap',
        'DESC',
        1,
        20,
      ],
      queryFn: () => TokensService.listAll({
        creatorAddress: effectiveAddress,
        orderBy: 'market_cap',
        orderDirection: 'DESC',
        limit: 20,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
      staleTime: 60_000,
    });

    // Prefetch transactions tab data
    queryClient.prefetchQuery({
      queryKey: ['DataTable', { page: 1, limit: 10 }, { accountAddress: effectiveAddress, includes: 'token' }],
      queryFn: () => TransactionsService.listTransactions({
        accountAddress: effectiveAddress,
        includes: 'token',
        limit: 10,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
      staleTime: 30_000,
    });
  }, [effectiveAddress, queryClient]);

  // Listen for bio post submissions to optimistically update and then poll until backend confirms
  useEffect(() => {
    function handleBioPosted(e: Event) {
      try {
        const detail = (e as CustomEvent).detail as { address?: string; bio?: string; txHash?: string };
        if (!detail?.address) {
          console.warn('[UserProfile] Bio post event missing address');
          return;
        }
        // Normalize addresses for comparison (trim and lowercase)
        const eventAddress = (detail.address || '').trim().toLowerCase();
        const currentAddress = (effectiveAddress || '').trim().toLowerCase();
        if (eventAddress !== currentAddress) {
          return;
        }
        const submittedBio = (detail.bio || '').trim();
        if (!submittedBio) {
          console.warn('[UserProfile] Bio post event missing bio text');
          return;
        }

        // Update optimistic bio state immediately - this will make bio appear right away
        setOptimisticBio(submittedBio);
        setIsBioLoading(true);

        // Optimistically update the React Query cache immediately so bio appears right after wallet confirmation
        const queryKey = ['AccountsService.getAccount', effectiveAddress];
        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              bio: submittedBio,
            };
          }
          // If no account info exists yet, create a minimal entry
          return {
            address: effectiveAddress,
            bio: submittedBio,
          };
        });

        // Also update the profile state if it exists
        if (profile) {
          setProfile({ ...profile, biography: submittedBio });
        }

        // Refetch posts to ensure the new bio post appears in the feed
        refetchPosts();

        // Poll account endpoint to ensure backend has processed the transaction
        const start = Date.now();
        const interval = window.setInterval(async () => {
          await refetchAccount();
          // Get fresh account info from React Query cache after refetch
          const freshAccountInfo = queryClient.getQueryData<any>(queryKey);
          const latestBio = (freshAccountInfo?.bio || '').trim();
          // Check if bio matches what was submitted (for updates) or if bio exists (for new bios)
          if (latestBio && (submittedBio ? latestBio === submittedBio : true)) {
            // Clear optimistic bio once backend confirms - backend data will take over
            setOptimisticBio(null);
            setIsBioLoading(false);
            window.clearInterval(interval);
          }
          if (Date.now() - start > 15_000) {
            // timeout after 15s - keep optimistic bio but stop loading indicator
            setIsBioLoading(false);
            window.clearInterval(interval);
          }
        }, 1500);
      } catch (error) {
        console.error('[UserProfile] Error handling bio post:', error);
        // Clear optimistic bio and loading state on error
        setOptimisticBio(null);
        setIsBioLoading(false);
      }
    }
    window.addEventListener('profile-bio-posted', handleBioPosted as any);
    return () => window.removeEventListener('profile-bio-posted', handleBioPosted as any);
  }, [effectiveAddress, refetchAccount, refetchPosts, queryClient, profile]);

  const content = (
    <div className="w-full">
      <Head
        title={`${chainName || effectiveAddress} – Profile – Superhero`}
        description={(bioText || `View ${chainName || effectiveAddress} on Superhero, the crypto social network.`).slice(0, 160)}
        canonicalPath={`/users/${address}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: chainName || effectiveAddress,
          identifier: effectiveAddress,
          description: bioText || undefined,
        }}
      />
      {/* Back button */}
      <div className="mb-4 md:mb-6">
        <AeButton
          onClick={() => {
            const state = (window.history?.state as any) || {};
            const canGoBack = typeof state.idx === 'number' ? state.idx > 0 : window.history.length > 1;
            if (canGoBack) navigate(-1);
            else navigate('/', { replace: true });
          }}
          variant="ghost"
          size="sm"
          outlined
          className="!border !border-solid !border-white/15 hover:!border-white/35"
        >
          ← Back
        </AeButton>
      </div>

      {/* Compact Profile Header */}
      <div className="mb-4 md:mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          {/* Avatar and Identity */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/30 to-teal-500/30 blur-lg opacity-50" />
              <AddressAvatarWithChainName
                address={effectiveAddress}
                size={64}
                showAddressAndChainName={false}
                isHoverEnabled
                className="relative"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-[var(--neon-teal)] via-teal-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                {chainName || 'Legend'}
              </h1>
              <div className="font-mono text-xs text-white/60 mt-0.5 break-all">
                {effectiveAddress}
              </div>
              {bioText && (
                <div className="mt-2 text-sm text-white/80 leading-relaxed line-clamp-2">
                  <span>{bioText}</span>
                  {isBioLoading && (
                    <span className="ml-2 inline-block">
                      <Spinner className="w-3 h-3" />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-row gap-2 shrink-0">
            {canEdit ? (
              <AeButton
                size="sm"
                variant="ghost"
                className="!border !border-solid !border-white/20 hover:!border-white/40 hover:bg-white/10 transition-all"
                onClick={() => setEditOpen(true)}
              >
                {bioText ? t('buttons.editBio') : t('buttons.addBio')}
              </AeButton>
            ) : null}
            {!canEdit ? (
              <AeButton
                onClick={() => openModal({ name: 'tip', props: { toAddress: effectiveAddress } })}
                variant="ghost"
                size="sm"
                className="!border !border-solid !border-white/20 hover:!border-white/40 hover:bg-white/10 transition-all inline-flex items-center gap-2"
                title={t('titles.sendATip')}
              >
                <IconDiamond className="w-4 h-4 text-white" />
                Tip
              </AeButton>
            ) : null}
            <AeButton
              variant="ghost"
              size="sm"
              className="!border !border-solid !border-white/20 hover:!border-white/40 hover:bg-white/10 transition-all [&_svg]:!size-[0.9em]"
              onClick={() => {
                const base = (CONFIG.EXPLORER_URL || 'https://aescan.io').replace(/\/$/, '');
                const url = `${base}/accounts/${effectiveAddress}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              title={t('titles.openOnAescan')}
            >
              <IconLink className="w-[0.65em] h-[0.65em] opacity-80 align-middle" />
            </AeButton>
          </div>
        </div>
      </div>

      {/* Portfolio Chart and Stats - Side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 md:gap-6 mb-4 md:mb-4">
        {/* Portfolio Chart - Smaller on md+ */}
        <div className="w-full -mt-4 -mb-6">
          <AccountPortfolio address={effectiveAddress} />
        </div>

        {/* Stats Grid - Right column on md+, full width on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 md:gap-2.5">
          <div className="rounded-2xl bg-white/[0.03] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.05] transition-all flex flex-col justify-center">
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              AE Balance
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {decimalBalance ? (() => {
                try {
                  const value = typeof decimalBalance.toNumber === 'function'
                    ? decimalBalance.toNumber()
                    : typeof decimalBalance === 'number'
                      ? decimalBalance
                      : Number(decimalBalance);
                  // If value is above 1 AE, show 2 decimals
                  if (value >= 1) {
                    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AE`;
                  }
                  // Otherwise use prettify for values below 1 AE
                  return `${decimalBalance.prettify()} AE`;
                } catch {
                  // Fallback to prettify if conversion fails
                  return `${decimalBalance.prettify()} AE`;
                }
              })() : 'Loading...'}
            </div>
          </div>
          <button
            onClick={() => handleTabChange('owned')}
            className="rounded-2xl bg-white/[0.03] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.05] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              {t('explore:ownedTrends')}
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {((ownedTokensResp as any)?.meta?.totalItems ?? (Array.isArray(aex9Balances) ? aex9Balances.length : 0)).toLocaleString()}
            </div>
          </button>
          <button
            onClick={() => handleTabChange('created')}
            className="rounded-2xl bg-white/[0.03] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.05] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              {t('explore:createdTrends')}
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {((createdTokensResp as any)?.meta?.totalItems ?? accountInfo?.total_created_tokens ?? 0).toLocaleString()}
            </div>
          </button>
          <button
            onClick={() => handleTabChange('feed')}
            className="rounded-2xl bg-white/[0.03] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.05] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              {t('explore:posts')}
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {posts.length.toLocaleString()}
            </div>
          </button>
        </div>
      </div>

      {/* Tabs - reuse main feed filter styles (mobile underline, desktop pills) */}
      <div id="profile-tabs-section" className="w-full mb-2">
        {/* Underline tabs with divider. Full-bleed on mobile; constrained on md+. */}
        <div>
          <div className="flex items-center justify-start gap-4 border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] overflow-x-auto whitespace-nowrap md:w-full md:mx-0 md:overflow-visible md:gap-10">
            {([
              { key: 'feed', label: t('explore:feed') },
              { key: 'owned', label: t('explore:ownedTrends') },
              { key: 'created', label: t('explore:createdTrends') },
              { key: 'transactions', label: t('explore:transactions') },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as TabType)}
                className={[
                  'relative px-1 py-3 text-xs leading-none font-semibold transition-colors !bg-transparent !shadow-none whitespace-nowrap shrink-0 md:px-3 md:py-3 md:text-sm',
                  'hover:!bg-transparent focus:!bg-transparent active:!bg-transparent focus-visible:!ring-0 focus:!outline-none',
                  tab === key
                    ? "text-white after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0.5 after:bg-[#1161FE] after:rounded-full after:mx-1"
                    : 'text-white/70',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* No desktop pill group; using the same layout across breakpoints */}
      </div>

      {tab === 'feed' && (<AccountFeed address={effectiveAddress} tab="feed" />)}

      {tab === 'owned' && (<AccountOwnedTokens address={effectiveAddress} tab="owned" />)}

      {tab === 'created' && (<AccountCreatedToken address={effectiveAddress} tab="created" />)}

      {tab === 'transactions' && (<AccountTrades address={effectiveAddress} tab="transactions" />)}

      {/* User comments list removed in unified posts model */}
    </div>
  );

  return standalone ? (
    <Shell right={<RightRail />} containerClassName="max-w-[1080px] mx-auto">
      {content}
      <ProfileEditModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          refetchPosts();
          refetchAccount(); // Refetch account info to get updated bio
          (async () => {
            const p = await getProfile();
            setProfile(p);
          })();
        }}
        address={effectiveAddress}
        initialBio={bioText}
      />
    </Shell>
  ) : (
    <>
      {content}
      <ProfileEditModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          refetchPosts();
          refetchAccount(); // Refetch account info to get updated bio
          (async () => {
            const p = await getProfile();
            setProfile(p);
          })();
        }}
        address={effectiveAddress}
        initialBio={bioText}
      />
    </>
  );
}
