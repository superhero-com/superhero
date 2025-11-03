import { useEffect, useMemo, useState } from "react";
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
      <div className="mb-4">
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
      {/* Profile header (banner + avatar + stats) */}
      <div className="mb-5 md:mb-6 rounded-2xl overflow-visible md:overflow-hidden relative md:border md:border-white/10 md:bg-gradient-to-b md:from-white/10 md:to-white/5 md:backdrop-blur-xl">
        {/* Banner (desktop only) */}
        <div className="hidden md:block h-28 w-full bg-[radial-gradient(100%_60%_at_0%_0%,rgba(17,97,254,0.35),transparent_60%),radial-gradient(100%_60%_at_100%_0%,rgba(78,205,196,0.35),transparent_60%)]" />

        {/* Avatar and main info */}
        <div className="px-0 md:px-6 pb-0 md:pb-6 mt-0 md:-mt-12 relative z-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-start md:gap-4">
            <div className="flex flex-col gap-2 min-w-0 md:flex-1">
              {/* Row 1: avatar + identity */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Avatar */}
                <div className="md:hidden shrink-0">
                  <AddressAvatarWithChainName
                    address={effectiveAddress}
                    size={64}
                    overlaySize={22}
                    showAddressAndChainName={false}
                    isHoverEnabled={true}
                  />
                </div>
                <div className="hidden md:block shrink-0">
                  <AddressAvatarWithChainName
                    address={effectiveAddress}
                    size={72}
                    overlaySize={24}
                    showAddressAndChainName={false}
                    isHoverEnabled={true}
                  />
                </div>
                {/* Identity */}
                <div className="min-w-0 md:self-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent tracking-tight">{chainName || "Legend"}</span>
                  </div>
                  <div className="font-mono text-xs text-white/70 break-all mt-0 md:mt-2">{effectiveAddress}</div>
                </div>
              </div>
              {/* Row 2: bio on its own line */}
              {bioText && (
                <div className="mt-1 text-sm text-white whitespace-pre-wrap inline-flex items-center gap-2">
                  <span>{bioText}</span>
                  <span id="bio-loading-indicator" className="hidden w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-row flex-wrap items-start gap-2 md:flex-col md:items-end md:gap-2 md:ml-auto md:self-start">
              {canEdit ? (
                <AeButton
                  size="sm"
                  variant="ghost"
                  className="!border !border-solid !border-white/20 hover:!border-white/35"
                  onClick={() => setEditOpen(true)}
                >
                  Edit Profile
                </AeButton>
              ) : null}
              {!canEdit ? (
                <AeButton
                  onClick={() => openModal({ name: "tip", props: { toAddress: effectiveAddress } })}
                  variant="ghost"
                  size="sm"
                  className="!border !border-solid !border-white/15 hover:!border-white/35 inline-flex items-center gap-2"
                  title={t('titles.sendATip')}
                >
                  <IconDiamond className="w-4 h-4 text-[#1161FE]" />
                  Tip
                </AeButton>
              ) : null}

              {/* Explorer link */}
              <AeButton
                variant="ghost"
                size="sm"
                className="!border !border-solid !border-white/15 hover:!border-white/35 [&_svg]:!size-[0.9em]"
                onClick={() => {
                  const base = (CONFIG.EXPLORER_URL || "https://aescan.io").replace(/\/$/, "");
                  const url = `${base}/accounts/${effectiveAddress}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                title={t('titles.openOnAescan')}
              >
                <span className="inline-flex items-center gap-2">
                  <span>View on æScan</span>
                  <IconLink className="w-[0.65em] h-[0.65em] opacity-80 align-middle" />
                </span>
              </AeButton>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">AE Balance</div>
              <div className="text-white font-bold mt-1">{decimalBalance ? `${decimalBalance.prettify()} AE` : "Loading..."}</div>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">Owned Trends</div>
              <div className="text-white font-bold mt-1">{(ownedTokensResp as any)?.meta?.totalItems ?? (Array.isArray(aex9Balances) ? aex9Balances.length : 0)}</div>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">Created Trends</div>
              <div className="text-white font-bold mt-1">{accountInfo?.total_created_tokens ?? 0}</div>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/60">Posts</div>
              <div className="text-white font-bold mt-1">{posts.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - reuse main feed filter styles (mobile underline, desktop pills) */}
      <div className="w-full mb-2">
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
