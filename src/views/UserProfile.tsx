import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import Head from "../seo/Head";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AeButton from "../components/AeButton";
import RightRail from "../components/layout/RightRail";
import Shell from "../components/layout/Shell";

import { useQuery } from "@tanstack/react-query";
import { PostsService } from "../api/generated";
import { AccountsService } from "../api/generated/services/AccountsService";
import { AccountTokensService } from "../api/generated/services/AccountTokensService";
import { PostApiResponse } from "../features/social/types";
import "../features/social/views/FeedList.scss";
import { useAccountBalances } from "../hooks/useAccountBalances";
import { useAddressByChainName, useChainName } from "../hooks/useChainName";

import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import AccountCreatedToken from "@/components/Account/AccountCreatedToken";
import AccountFeed from "@/components/Account/AccountFeed";
import AccountOwnedTokens from "@/components/Account/AccountOwnedTokens";
import AccountTrades from "@/components/Account/AccountTrades";
import AccountPortfolio from "@/components/Account/AccountPortfolio";
import ProfileEditModal from "../components/modals/ProfileEditModal";
import { CONFIG } from "../config";
import { useModal } from "../hooks";
import { useProfile } from "../hooks/useProfile";
import { IconDiamond, IconLink } from "../icons";

type TabType = "feed" | "owned" | "created" | "transactions";
export default function UserProfile({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { address } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Support AENS chain name route: /users/<name.chain>
  const isChainName = address?.endsWith(".chain");
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? address : undefined
  );
  const effectiveAddress =
    isChainName && resolvedAddress ? resolvedAddress : (address as string);
  const { decimalBalance, aex9Balances, loadAccountData } =
    useAccountBalances(effectiveAddress);
  const { chainName } = useChainName(effectiveAddress);
  const { getProfile, canEdit } = useProfile(effectiveAddress);
  const { openModal } = useModal();

  const { data, refetch: refetchPosts } = useQuery({
    queryKey: ["PostsService.listAll", address],
    queryFn: () =>
      PostsService.listAll({
        limit: 100,
        page: 1,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: "",
        accountAddress: effectiveAddress,
      }) as unknown as Promise<PostApiResponse>,
    enabled: !!effectiveAddress,
  });

  // Account info (bio, chain name, totals) from backend
  const { data: accountInfo, refetch: refetchAccount } = useQuery({
    queryKey: ["AccountsService.getAccount", effectiveAddress],
    queryFn: () =>
      AccountsService.getAccount({
        address: effectiveAddress,
      }) as unknown as Promise<any>,
    enabled: !!effectiveAddress,
    staleTime: 10_000,
  });

  const [profile, setProfile] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  
  // Get tab from URL search params, default to "feed"
  const tabFromUrl = searchParams.get("tab") as TabType;
  const [tab, setTab] = useState<TabType>(
    tabFromUrl && ["feed", "owned", "created", "transactions"].includes(tabFromUrl) 
      ? tabFromUrl 
      : "feed"
  );

  // Function to handle tab changes and update URL
  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams);
    if (newTab === "feed") {
      // Remove tab param for default tab to keep URL clean
      newSearchParams.delete("tab");
    } else {
      newSearchParams.set("tab", newTab);
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
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Sync tab state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabType;
    if (urlTab && ["feed", "owned", "created", "transactions"].includes(urlTab)) {
      setTab(urlTab);
    } else if (!urlTab) {
      setTab("feed");
    }
  }, [searchParams]);


  const { data: ownedTokensResp } = useQuery({
    queryKey: [
      "AccountTokensService.listTokenHolders-counter",
      effectiveAddress,
    ],
    queryFn: () =>
      AccountTokensService.listTokenHolders({
        address: effectiveAddress,
        orderBy: "balance",
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
      const hasTagInTopicsOrMedia = topics.includes("bio-update") || media.includes("bio-update");

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
  const bioText =
    (accountInfo?.bio || "").trim() ||
    latestBioPost?.content?.trim() ||
    profile?.biography;

  useEffect(() => {
    if (!effectiveAddress) return;
    // Scroll to top whenever navigating to a user profile
    window.scrollTo(0, 0);
    loadAccountData();
    (async () => {
      const p = await getProfile();
      setProfile(p);
    })();
  }, [effectiveAddress]);

  // Listen for bio post submissions to show a spinner and refetch until updated
  useEffect(() => {
    function handleBioPosted(e: Event) {
      try {
        const detail = (e as CustomEvent).detail as { address?: string };
        if (!detail?.address || detail.address !== effectiveAddress) return;
        const el = document.getElementById("bio-loading-indicator");
        if (el) el.classList.remove("hidden");
        // Poll account endpoint briefly to pick up new bio
        const start = Date.now();
        const interval = window.setInterval(async () => {
          await refetchAccount();
          const latestBio = (accountInfo?.bio || "").trim();
          if (latestBio) {
            if (el) el.classList.add("hidden");
            window.clearInterval(interval);
          }
          if (Date.now() - start > 15_000) {
            // timeout after 15s
            if (el) el.classList.add("hidden");
            window.clearInterval(interval);
          }
        }, 1500);
      } catch { }
    }
    window.addEventListener("profile-bio-posted", handleBioPosted as any);
    return () => window.removeEventListener("profile-bio-posted", handleBioPosted as any);
  }, [effectiveAddress, accountInfo?.bio]);

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
            const canGoBack = typeof state.idx === "number" ? state.idx > 0 : window.history.length > 1;
            if (canGoBack) navigate(-1);
            else navigate("/", { replace: true });
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
                overlaySize={22}
                showAddressAndChainName={false}
                isHoverEnabled={true}
                className="relative"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-[var(--neon-teal)] via-teal-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                {chainName || "Legend"}
              </h1>
              <div className="font-mono text-xs text-white/60 mt-0.5 break-all">
                {effectiveAddress}
              </div>
              {bioText && (
                <div className="mt-2 text-sm text-white/80 leading-relaxed line-clamp-2">
                  <span>{bioText}</span>
                  <span id="bio-loading-indicator" className="hidden ml-2 w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                onClick={() => openModal({ name: "tip", props: { toAddress: effectiveAddress } })}
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
                const base = (CONFIG.EXPLORER_URL || "https://aescan.io").replace(/\/$/, "");
                const url = `${base}/accounts/${effectiveAddress}`;
                window.open(url, "_blank", "noopener,noreferrer");
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
          <div className="rounded-2xl bg-white/[0.02] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.04] transition-all">
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              AE Balance
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {decimalBalance ? `${decimalBalance.prettify()} AE` : "Loading..."}
            </div>
          </div>
          <button
            onClick={() => handleTabChange("owned")}
            className="rounded-2xl bg-white/[0.02] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.04] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              Owned Trends
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {(ownedTokensResp as any)?.meta?.totalItems ?? (Array.isArray(aex9Balances) ? aex9Balances.length : 0)}
            </div>
          </button>
          <button
            onClick={() => handleTabChange("created")}
            className="rounded-2xl bg-white/[0.02] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.04] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              Created Trends
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {accountInfo?.total_created_tokens ?? 0}
            </div>
          </button>
          <button
            onClick={() => handleTabChange("feed")}
            className="rounded-2xl bg-white/[0.02] border border-solid border-white/10 p-2 md:p-2.5 hover:bg-white/[0.04] transition-all cursor-pointer text-left w-full focus:outline-none"
          >
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1">
              Posts
            </div>
            <div className="text-base md:text-lg font-bold text-white">
              {posts.length}
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
              { key: "feed", label: "Feed" },
              { key: "owned", label: "Owned Trends" },
              { key: "created", label: "Created Trends" },
              { key: "transactions", label: "Transactions" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as TabType)}
                className={[
                  "relative px-1 py-3 text-xs leading-none font-semibold transition-colors !bg-transparent !shadow-none whitespace-nowrap shrink-0 md:px-3 md:py-3 md:text-sm",
                  "hover:!bg-transparent focus:!bg-transparent active:!bg-transparent focus-visible:!ring-0 focus:!outline-none",
                  tab === key
                    ? "text-white after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0.5 after:bg-[#1161FE] after:rounded-full after:mx-1"
                    : "text-white/70",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* No desktop pill group; using the same layout across breakpoints */}
      </div>

      {tab === "feed" && (<AccountFeed address={effectiveAddress} tab="feed" />)}

      {tab === "owned" && (<AccountOwnedTokens address={effectiveAddress} tab="owned" />)}

      {tab === "created" && (<AccountCreatedToken address={effectiveAddress} tab="created" />)}

      {tab === "transactions" && (<AccountTrades address={effectiveAddress} tab="transactions" />)}

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
