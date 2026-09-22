/* eslint-disable
  import/no-named-as-default,
  import/order,
  react/function-component-definition,
  @typescript-eslint/no-unused-vars,
  react/button-has-type,
  max-len
*/
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import AccountCreatedToken from '@/components/Account/AccountCreatedToken';
import AccountFeed from '@/components/Account/AccountFeed';
import AccountOwnedTokens from '@/components/Account/AccountOwnedTokens';
import AccountTrades from '@/components/Account/AccountTrades';
import Head from '../seo/Head';
import RightRail from '../components/layout/RightRail';
import Shell from '../components/layout/Shell';

import { PostsService } from '../api/generated';
import type { PostDto } from '../api/generated';
import {
  getLinkedBio,
  getLinkedPreferredAensName,
  getLinkedSite,
  getLinkedXUsername,
  isXLinked,
  patchAccountCacheEntry,
  SuperheroApi,
} from '@/api/backend';
import { AccountsService } from '../api/generated/services/AccountsService';
import { AccountTokensService } from '../api/generated/services/AccountTokensService';
import { TokensService } from '../api/generated/services/TokensService';
import { TransactionsService } from '../api/generated/services/TransactionsService';
import { PostApiResponse } from '../features/social/types';
import ProfileHeaderCard from '../features/social/components/ProfileHeaderCard';
import '../features/social/views/FeedList.scss';
import { useAccountBalances } from '../hooks/useAccountBalances';
import { useAddressByChainName, useChainName } from '../hooks/useChainName';

import AccountPortfolio from '@/components/Account/AccountPortfolio';
import ProfileTabPanel from '../features/social/components/ProfileTabPanel';
import ProfileEditModal from '../components/modals/ProfileEditModal';
import { useModal } from '../hooks';
import { useProfile } from '../hooks/useProfile';
import { useAeSdk } from '../hooks/useAeSdk';
import { isMobileDevice, isStandalone } from '../utils/displayMode';

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
  const { aex9Balances, loadAccountData } = useAccountBalances(effectiveAddress);
  const { chainName } = useChainName(effectiveAddress);
  const { canEdit } = useProfile(effectiveAddress);
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const socialErrorSlotRef = useRef<HTMLDivElement>(null);

  // Send/Receive is the installed-PWA-on-mobile wallet surface: in a plain
  // browser tab, and on a desktop that merely has the app installed, the wallet
  // lives in the extension and already owns these actions. Resolved after mount
  // rather than during render because the server has no `display-mode` or user
  // agent of its own to read — deciding at render time would make the hydrated
  // tree disagree with the SSR'd one.
  const [walletActionsEnabled, setWalletActionsEnabled] = useState(false);
  useEffect(() => {
    setWalletActionsEnabled(isStandalone() && isMobileDevice());
  }, []);

  const isOwnProfile = !!activeAccount && activeAccount === effectiveAddress;
  const showWalletActions = walletActionsEnabled && !!activeAccount && !!effectiveAddress;

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

  // Account info (bio, chain name, totals, embedded profile) from backend.
  // getAccount already embeds the profile (profile/public_name), so a separate
  // SuperheroApi.getProfile poll is redundant — see patchAccountCacheEntry below,
  // which keeps this cache entry in sync with profile edits directly.
  const { data: accountInfo, refetch: refetchAccount } = useQuery({
    queryKey: ['AccountsService.getAccount', effectiveAddress],
    queryFn: () => AccountsService.getAccount({
      address: effectiveAddress,
    }) as unknown as Promise<any>,
    enabled: !!effectiveAddress,
    staleTime: 10_000,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editInitialSection, setEditInitialSection] = useState<'profile' | 'x'>('profile');

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

  // Owned/created token counts come from the account aggregate
  // (holdings_count/total_created_tokens) — no separate list-count queries needed.

  const bioText = getLinkedBio(accountInfo) || '';
  const linkedPreferredName = getLinkedPreferredAensName(accountInfo);
  const displayName = (linkedPreferredName || accountInfo?.public_name || chainName || '').trim()
    || effectiveAddress;
  const isXVerified = isXLinked(accountInfo);
  const linkedXUsername = getLinkedXUsername(accountInfo);
  const linkedSite = getLinkedSite(accountInfo);
  // Posts count is the true total the list response already carries, not the
  // 100-capped page length. Undefined until loaded — the counts row renders
  // nothing rather than a zero.
  const postsTotal = data?.meta?.totalItems;

  const openProfileEdit = () => {
    setEditInitialSection('profile');
    setEditOpen(true);
  };

  useEffect(() => {
    if (!effectiveAddress) return;
    // Scroll to top whenever navigating to a user profile
    window.scrollTo(0, 0);
    // Note: loadAccountData() is automatically called by useAccountBalances hook
    // when effectiveAddress changes, so no manual call is needed here
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
            sender: {
              address: payload?.creator_address || effectiveAddress || '',
              public_name: '',
              bio: '',
              avatarurl: '',
            },
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

  const content = (
    <div className="w-full">
      <Head
        title={`${displayName} – Profile – Superhero`}
        description={(bioText || `View ${displayName} on Superhero, the crypto social network.`).slice(0, 160)}
        canonicalPath={`/users/${address}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: displayName,
          identifier: effectiveAddress,
          description: bioText || undefined,
        }}
      />
      {/* Blocks 1-4: band (with back + share/more over it) -> identity -> counts. */}
      <ProfileHeaderCard
        address={effectiveAddress}
        displayName={displayName}
        handle={chainName}
        isVerified={isXVerified}
        verifiedUsername={linkedXUsername}
        bio={bioText}
        site={linkedSite}
        ownProfile={canEdit}
        followersCount={accountInfo?.profile?.followers_count}
        followingCount={accountInfo?.profile?.following_count}
        postsCount={postsTotal}
        onBack={() => {
          const state = (window.history?.state as any) || {};
          const canGoBack = typeof state.idx === 'number' ? state.idx > 0 : window.history.length > 1;
          if (canGoBack) navigate(-1);
          else navigate('/', { replace: true });
        }}
        onEdit={openProfileEdit}
        onEditBio={openProfileEdit}
        onTip={() => openModal({ name: 'tip', props: { toAddress: effectiveAddress } })}
        onPostsClick={() => handleTabChange('feed')}
        errorSlotRef={socialErrorSlotRef}
      />

      {/* Wallet actions — installed PWA on mobile only. On your own profile this
          is the wallet home pair; on someone else's it is a pre-addressed Send. */}
      {showWalletActions && (
        <div className="mb-4 md:mb-4 flex gap-2.5 md:max-w-[420px]">
          <button
            type="button"
            data-testid="profile-send-button"
            onClick={() => openModal({
              name: 'send',
              props: isOwnProfile ? {} : { toAddress: effectiveAddress },
            })}
            className="group flex-1 min-w-0 inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-solid border-[#1161FE]/40 bg-[#1161FE]/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1161FE]/20 hover:border-[#1161FE]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1161FE]/60"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1161FE]/25">
              <ArrowUpRight className="h-4 w-4 text-[#8ab6ff]" />
            </span>
            <span className="truncate">{t('buttons.send')}</span>
          </button>
          {isOwnProfile && (
            <button
              type="button"
              data-testid="profile-receive-button"
              onClick={() => openModal({ name: 'receive', props: { address: effectiveAddress } })}
              className="group flex-1 min-w-0 inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-solid border-[rgba(0,255,157,0.35)] bg-[rgba(0,255,157,0.08)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[rgba(0,255,157,0.16)] hover:border-[rgba(0,255,157,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,255,157,0.6)]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(0,255,157,0.2)]">
                <ArrowDownLeft className="h-4 w-4 text-[var(--neon-teal)]" />
              </span>
              <span className="truncate">{t('buttons.receive')}</span>
            </button>
          )}
        </div>
      )}

      {canEdit && !isXVerified && (
        <button
          type="button"
          onClick={() => {
            setEditInitialSection('x');
            setEditOpen(true);
          }}
          className="mb-4 md:mb-4 w-full text-left rounded-xl border border-solid px-4 py-3 text-sm text-white/90 transition-colors focus:outline-none focus:ring-2"
          style={{
            borderColor: 'rgba(0,255,157,0.3)',
            background: 'rgba(0,255,157,0.08)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,157,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,157,0.08)';
          }}
        >
          <span style={{ color: 'var(--neon-teal)' }} className="font-semibold">
            {t('account.linkXCtaTitle')}
          </span>
          <span className="text-white/70">
            {' '}
            {t('account.linkXCtaDescription')}
          </span>
        </button>
      )}

      <AccountPortfolio
        key={effectiveAddress}
        address={effectiveAddress}
      />

      {/* Tabs - reuse main feed filter styles (mobile underline, desktop pills) */}
      <div id="profile-tabs-section" className="w-full mb-2">
        {/* Underline tabs with divider. Full-bleed on mobile; constrained on md+. */}
        <div>
          <div className="flex items-center justify-start gap-4 border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] overflow-x-auto whitespace-nowrap md:w-full md:mx-0 md:overflow-visible md:gap-10">
            {([
              { key: 'feed', label: t('explore:posts'), count: postsTotal },
              {
                key: 'owned',
                label: t('explore:holdings'),
                // `aex9Balances` is always an array and starts empty, so its
                // length is only a real count once something has loaded into it.
                // Until then show nothing rather than a zero the API may contradict.
                count: accountInfo?.holdings_count
                  ?? (aex9Balances.length > 0 ? aex9Balances.length : undefined),
              },
              { key: 'created', label: t('explore:created'), count: accountInfo?.total_created_tokens },
              { key: 'transactions', label: t('explore:activity'), count: undefined },
            ]).map(({ key, label, count }) => (
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
                {/* Tab counts carry the numbers the Holdings tiles used to duplicate.
                    A null/absent count renders nothing (never a zero, never a dash). */}
                {typeof count === 'number' && Number.isFinite(count) && (
                  <span className="ml-1.5 font-semibold tabular-nums text-white/50">
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* No desktop pill group; using the same layout across breakpoints */}
      </div>

      <ProfileTabPanel activeTab={tab}>
        {tab === 'feed' && (<AccountFeed address={effectiveAddress} tab="feed" />)}

        {tab === 'owned' && <AccountOwnedTokens address={effectiveAddress} tab="owned" />}

        {tab === 'created' && (<AccountCreatedToken address={effectiveAddress} tab="created" />)}

        {tab === 'transactions' && (<AccountTrades address={effectiveAddress} tab="transactions" />)}
      </ProfileTabPanel>

      {/* User comments list removed in unified posts model */}
    </div>
  );

  const handleProfileEditClose = (updatedProfile?: any) => {
    setEditOpen(false);
    setEditInitialSection('profile');
    if (updatedProfile) {
      queryClient.setQueryData(['AccountsService.getAccount', effectiveAddress], (oldData: any) => {
        const bioChanged = getLinkedBio(updatedProfile) !== getLinkedBio(oldData);
        const chainNameChanged = getLinkedPreferredAensName(updatedProfile)
          !== getLinkedPreferredAensName(oldData);
        return patchAccountCacheEntry(oldData, {
          updatedProfile,
          bioChanged,
          formBio: updatedProfile?.profile?.bio ?? '',
          chainNameChanged,
          formChainName: updatedProfile?.profile?.chain_name ?? '',
        });
      });
    }
    // Always refetch on close — X linking (and other link flows) can complete out-of-band
    // via the OAuth redirect / wallet deep link, so the cached account that drives the
    // "Link your X account" prompt may be stale even when no in-modal save happened.
    refetchAccount();
  };

  const profileModals = (
    <ProfileEditModal
      open={editOpen}
      onClose={handleProfileEditClose}
      // Hide the dialog while a save runs (or when it's dismissed mid-save) without
      // triggering the refetches in handleProfileEditClose — those would race the
      // in-flight link requests and could write pre-save data back into the cache.
      // onClose/onSaveError fire once the save settles.
      onHide={() => {
        setEditOpen(false);
        setEditInitialSection('profile');
      }}
      // A failed save may have partially applied (e.g. bio linked but site failed), so
      // refetch to restore server truth without running the dismiss logic above.
      onSaveError={() => {
        refetchAccount();
      }}
      address={effectiveAddress}
      initialBio={bioText}
      initialSection={editInitialSection}
    />
  );

  return standalone ? (
    <Shell right={<RightRail />} containerClassName="max-w-[1080px] mx-auto">
      {content}
      {profileModals}
    </Shell>
  ) : (
    <>
      {content}
      {profileModals}
    </>
  );
}
