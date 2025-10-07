import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AeButton from "../components/AeButton";
import Identicon from "../components/Identicon";
import RightRail from "../components/layout/RightRail";
import Shell from "../components/layout/Shell";
import UserBadge from "../components/UserBadge";

import { useQuery } from "@tanstack/react-query";
import { PostsService } from "../api/generated";
import { AccountsService } from "../api/generated/services/AccountsService";
import { TokensService } from "../api/generated/services/TokensService";
import { AccountTokensService } from "../api/generated/services/AccountTokensService";
import { TransactionsService } from "../api/generated/services/TransactionsService";
import FeedItem from "../features/social/components/FeedItem";
import { PostApiResponse } from "../features/social/types";
import "../features/social/views/FeedList.scss";
import { useAccountBalances } from "../hooks/useAccountBalances";
import { useChainName, useAddressByChainName } from "../hooks/useChainName";
import TokenListTable from "../features/trending/components/TokenListTable";
import AddressChip from "../components/AddressChip";
import PriceDataFormatter from "../features/shared/components/PriceDataFormatter";
import { formatLongDate } from "../utils/common";
import { TX_FUNCTIONS } from "../utils/constants";
import { Decimal } from "../libs/decimal";
import { fromAettos } from "../libs/dex";

import AddressAvatar from "../components/AddressAvatar";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import ProfileEditModal from "../components/modals/ProfileEditModal";
import { useProfile } from "../hooks/useProfile";
import { IconDiamond, IconLink } from "../icons";
import { useModal } from "../hooks";
import { CONFIG } from "../config";

type TabType = "feed" | "owned" | "created" | "transactions";
export default function UserProfile({
  standalone = true,
}: { standalone?: boolean } = {}) {
  const navigate = useNavigate();
  const { address } = useParams();
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
  const [tab, setTab] = useState<TabType>("feed");

  // Token list sorting state shared by Owned/Created
  const [orderBy, setOrderBy] = useState<
    "market_cap" | "name" | "price" | "created_at" | "holders_count"
  >("market_cap");
  const [orderDirection, setOrderDirection] = useState<"ASC" | "DESC">("DESC");

  // Owned tokens with balances (account tokens endpoint)
  const [ownedOrderDirection, setOwnedOrderDirection] = useState<
    "ASC" | "DESC"
  >("DESC");
  const { data: ownedTokensResp, isFetching: loadingOwned } = useQuery({
    queryKey: [
      "AccountTokensService.listTokenHolders",
      effectiveAddress,
      ownedOrderDirection,
      tab === "owned" ? 100 : 1, // vary by mode so cache keys differ
    ],
    queryFn: () =>
      AccountTokensService.listTokenHolders({
        address: effectiveAddress,
        orderBy: "balance",
        orderDirection: ownedOrderDirection,
        limit: tab === "owned" ? 100 : 1,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!effectiveAddress,
    staleTime: 60_000,
  });

  // Created tokens
  const { data: createdTokensResp, isFetching: loadingCreated } = useQuery({
    queryKey: [
      "TokensService.listAll",
      "created",
      effectiveAddress,
      orderBy,
      orderDirection,
      tab === "created" ? 100 : 1, // vary by mode
    ],
    queryFn: () =>
      TokensService.listAll({
        creatorAddress: effectiveAddress,
        orderBy,
        orderDirection,
        limit: tab === "created" ? 100 : 1,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!effectiveAddress,
    staleTime: 60_000,
  });

  // Transactions pagination
  const [txItemsPerPage, setTxItemsPerPage] = useState(10);
  const [txCurrentPage, setTxCurrentPage] = useState(1);

  const {
    data: txResp,
    isFetching: loadingTx,
    refetch: refetchTx,
    error: txError,
  } = useQuery({
    queryKey: [
      "TransactionsService.listTransactions",
      "account",
      effectiveAddress,
      txItemsPerPage,
      txCurrentPage,
    ],
    queryFn: () =>
      TransactionsService.listTransactions({
        accountAddress: effectiveAddress,
        includes: "token",
        limit: txItemsPerPage,
        page: txCurrentPage,
      }) as unknown as Promise<{
        items: any[];
        meta: { totalItems: number; totalPages: number; currentPage: number };
      }>,
    enabled: !!effectiveAddress && tab === "transactions",
    staleTime: 30_000,
    refetchInterval: 60_000,
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
      const p = await getProfile(effectiveAddress);
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
      } catch {}
    }
    window.addEventListener("profile-bio-posted", handleBioPosted as any);
    return () => window.removeEventListener("profile-bio-posted", handleBioPosted as any);
  }, [effectiveAddress, refetchAccount, accountInfo?.bio]);

  const content = (
    <div className="w-full">
      <div className="mb-4">
        <AeButton
          onClick={() => {
            window.history.length > 1 ? navigate(-1) : navigate("/");
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
                    size={88}
                    overlaySize={28}
                    showAddressAndChainName={false}
                    isHoverEnabled={true}
                  />
                </div>
                {/* Identity */}
                <div className="min-w-0 md:self-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-[var(--neon-teal)] via-[var(--neon-teal)] to-teal-300 bg-clip-text text-transparent tracking-tight">{chainName || "Legend"}</span>
                  </div>
                  <div className="font-mono text-xs text-white/70 break-all">{effectiveAddress}</div>
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
                  title="Send a tip"
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
                title="Open on æScan"
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
              <div className="text-white font-bold mt-1">{(createdTokensResp as any)?.meta?.totalItems ?? ((createdTokensResp?.items?.length) || 0)}</div>
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
                onClick={() => setTab(key as TabType)}
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

      {tab === "feed" && (
        <div className="feed">
          {posts.length === 0 && (
            <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl mt-6">
              <div className="text-4xl mb-4 opacity-30">📝</div>
              <div className="text-white font-semibold mb-2">
                No posts found.
              </div>
              <div className="text-white/60 text-sm">
                This user hasn't posted anything yet.
              </div>
            </div>
          )}
          {posts.map((item: any) => {
            const postId = item.id;
            const commentCount = item.total_comments ?? 0;

            return (
              <div key={postId} className="mb-4">
                <FeedItem
                  key={postId}
                  item={item}
                  commentCount={commentCount}
                  onItemClick={(id: string) => navigate(`/post/${id}`)}
                />
              </div>
            );
          })}
        </div>
      )}

      {tab === "owned" && (
        <div className="mt-4 space-y-4">
          {!loadingOwned && (ownedTokensResp?.items?.length ?? 0) === 0 && (
            <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
              <div className="text-4xl mb-3 opacity-30">🪙</div>
              <div className="text-white font-semibold mb-1">
                No owned tokens
              </div>
              <div className="text-white/60 text-sm">
                This user doesn't own any Trendminer tokens yet.
              </div>
            </div>
          )}

          {/* Owned tokens table: Token | Price | Balance | Total Value */}
          {(ownedTokensResp?.items?.length ?? 0) > 0 && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wide">
                <div>Trends</div>
                <div>Price</div>
                <button
                  className="text-left hover:opacity-80"
                  onClick={() =>
                    setOwnedOrderDirection(
                      ownedOrderDirection === "DESC" ? "ASC" : "DESC"
                    )
                  }
                  title="Sort by balance"
                >
                  Balance {ownedOrderDirection === "DESC" ? "↓" : "↑"}
                </button>
                <div>Total Value</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/5">
                {(ownedTokensResp?.items || []).map(
                  (item: any, idx: number) => {
                    const token = item?.token || item;
                    const tokenName =
                      token?.name ||
                      token?.symbol ||
                      token?.address ||
                      `Token ${idx + 1}`;
                    const tokenHref =
                      token?.name || token?.address
                        ? `/trending/tokens/${encodeURIComponent(
                          token?.name || token?.address
                        )}`
                        : undefined;
                    const balance =
                      item?.balance ?? item?.holder_balance ?? item?.amount;
                    const balanceData = item?.balance_data;
                    const priceData = token?.price_data;

                    return (
                      <div
                        key={`${token?.address || token?.name || idx}`}
                        className="owned-token-row grid grid-cols-1 md:grid-cols-4 gap-4 px-6 py-4 rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      >
                        {/* Trends */}
                        <div className="flex items-center min-w-0">
                          {tokenHref ? (
                            <a
                              href={tokenHref}
                              className="token-name text-md font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent hover:underline truncate"
                            >
                              #{tokenName}
                            </a>
                          ) : (
                            <div className="token-name text-md font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent truncate">
                              #{tokenName}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-center">
                          <div className="bg-gradient-to-r text-sm from-yellow-400 to-cyan-500 bg-clip-text text-transparent">
                            <PriceDataFormatter
                              watchPrice={false}
                              priceData={priceData}
                            />
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="flex items-center">
                          <div className="bg-gradient-to-r text-sm from-cyan-400 to-blue-500 bg-clip-text text-transparent font-medium">
                            {Decimal.from(balance).div(10 ** (token?.decimals || 18)).prettify()}
                          </div>
                        </div>

                        {/* Total Value */}
                        <div className="flex items-center">
                          {balanceData ? (
                            <div className="bg-gradient-to-r text-sm from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                              <PriceDataFormatter
                                watchPrice={false}
                                priceData={balanceData}
                              />
                            </div>
                          ) : (
                            <span className="text-white/60">-</span>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {loadingOwned && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              <style>{`
                .owned-token-row:hover .token-name {
                  background: linear-gradient(to right, #fb923c, #fbbf24);
                  -webkit-background-clip: text;
                  background-clip: text;
                }
                .owned-token-row:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 25px rgba(17, 97, 254, 0.15);
                }
                .owned-token-row:active {
                  transform: translateY(0);
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {tab === "created" && (
        <div className="mt-4">
          {!loadingCreated && (createdTokensResp?.items?.length ?? 0) === 0 && (
            <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
              <div className="text-4xl mb-3 opacity-30">✨</div>
              <div className="text-white font-semibold mb-1">
                No created tokens
              </div>
              <div className="text-white/60 text-sm">
                This user hasn't created any Trendminer tokens yet.
              </div>
            </div>
          )}
          <TokenListTable
            pages={
              createdTokensResp
                ? [{ items: (createdTokensResp.items || []) as any[] }]
                : [{ items: [] }]
            }
            loading={loadingCreated}
            showCollectionColumn={false}
            orderBy={orderBy as any}
            orderDirection={orderDirection}
            onSort={(key) => {
              if (key === "newest") {
                setOrderBy("created_at");
                setOrderDirection("DESC");
              } else if (key === "oldest") {
                setOrderBy("created_at");
                setOrderDirection("ASC");
              } else if (key === orderBy) {
                setOrderDirection(orderDirection === "DESC" ? "ASC" : "DESC");
              } else {
                setOrderBy(key as any);
                setOrderDirection("DESC");
              }
            }}
          />
        </div>
      )}

      {tab === "transactions" && (
        <div className="mt-4 space-y-4">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-4 border border-white/10 rounded-2xl bg-white/[0.02] text-xs font-semibold text-white/60 uppercase tracking-wide">
            <div>Token</div>
            <div>Type</div>
            <div>Volume</div>
            <div>Unit Price</div>
            <div>Total Price</div>
            <div>Date</div>
            <div>Transaction</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {(txResp?.items || []).map((transaction: any) => {
              const txType = (transaction?.tx_type || "").toLowerCase();
              const color = ((): "green" | "red" | "yellow" | "primary" => {
                switch (txType) {
                  case TX_FUNCTIONS.buy:
                    return "green";
                  case TX_FUNCTIONS.sell:
                    return "red";
                  case TX_FUNCTIONS.create_community:
                    return "yellow";
                  default:
                    return "primary";
                }
              })();
              const chipStyles = ((): {
                textColor: string;
                chipBg: string;
                borderColor: string;
              } => {
                switch (color) {
                  case "green":
                    return {
                      textColor: "text-green-400",
                      chipBg: "bg-green-500/20",
                      borderColor: "border-green-500/30",
                    };
                  case "red":
                    return {
                      textColor: "text-red-400",
                      chipBg: "bg-red-500/20",
                      borderColor: "border-red-500/30",
                    };
                  case "yellow":
                    return {
                      textColor: "text-yellow-400",
                      chipBg: "bg-yellow-500/20",
                      borderColor: "border-yellow-500/30",
                    };
                  default:
                    return {
                      textColor: "text-white",
                      chipBg: "bg-white/[0.05]",
                      borderColor: "border-white/10",
                    };
                }
              })();

              const token = transaction?.token;
              const tokenName =
                token?.name || transaction?.token_name || "Token";
              const tokenHref =
                token?.name || token?.address
                  ? `/trending/tokens/${encodeURIComponent(
                    token?.name || token?.address
                  )}`
                  : undefined;

              return (
                <div
                  key={transaction.id}
                  className="grid grid-cols-1 md:grid-cols-7 gap-4 px-4 py-4 bg-white/[0.01]"
                >
                  {/* Token */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Token:
                    </div>
                    {tokenHref ? (
                      <a
                        href={tokenHref}
                        className="text-white hover:underline"
                      >
                        {tokenName}
                      </a>
                    ) : (
                      <div className="text-white">{tokenName}</div>
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Type:
                    </div>
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${chipStyles.textColor} ${chipStyles.chipBg} border ${chipStyles.borderColor}`}
                    >
                      {(transaction?.tx_type || "TRADE")
                        .toString()
                        .toUpperCase()}
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Volume:
                    </div>
                    <div className="text-white font-medium">
                      {formatVolume(transaction?.volume)}
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Unit Price:
                    </div>
                    <PriceDataFormatter
                      watchPrice={false}
                      priceData={transaction?.unit_price}
                    />
                  </div>

                  {/* Total Price */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Total:
                    </div>
                    <PriceDataFormatter
                      watchPrice={false}
                      priceData={transaction?.amount}
                    />
                  </div>

                  {/* Date */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Date:
                    </div>
                    <div className="text-white/70 text-sm">
                      {formatLongDate(transaction?.created_at)}
                    </div>
                  </div>

                  {/* Tx hash */}
                  <div className="flex items-center">
                    <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                      Tx:
                    </div>
                    <AddressChip
                      address={transaction?.tx_hash}
                      linkToExplorer
                    />
                  </div>
                </div>
              );
            })}

            {loadingTx && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            {!loadingTx && !txResp?.items?.length && (
              <div className="text-center py-12">
                <div className="text-white/40 text-lg mb-2">📈</div>
                <div className="text-white/60 text-sm">No transactions yet</div>
              </div>
            )}

            {txError && !loadingTx && (
              <div className="text-center py-12">
                <div className="text-red-400 text-lg mb-2">⚠️</div>
                <div className="text-red-400 text-sm">
                  Failed to load transactions
                </div>
                <button
                  onClick={() => refetchTx()}
                  className="mt-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {(txResp?.meta?.totalPages || 0) > 1 && (
            <div className="flex items-center justify-between text-sm text-white/60">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={txItemsPerPage}
                  onChange={(e) => {
                    setTxItemsPerPage(Number(e.target.value));
                    setTxCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#4ecdc4] transition-colors"
                >
                  {[10, 20, 50, 100].map((opt) => (
                    <option
                      key={opt}
                      value={opt}
                      className="bg-gray-800 text-white"
                    >
                      {opt}
                    </option>
                  ))}
                </select>
                <span>items per page</span>
              </div>
              <div>
                Showing{" "}
                {Math.min(
                  (txCurrentPage - 1) * txItemsPerPage + 1,
                  txResp?.meta?.totalItems || 0
                )}{" "}
                to{" "}
                {Math.min(
                  txCurrentPage * txItemsPerPage,
                  txResp?.meta?.totalItems || 0
                )}{" "}
                of {txResp?.meta?.totalItems || 0} transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setTxCurrentPage(Math.max(1, txCurrentPage - 1))
                  }
                  disabled={txCurrentPage <= 1}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setTxCurrentPage(
                      Math.min(txResp?.meta?.totalPages || 1, txCurrentPage + 1)
                    )
                  }
                  disabled={(txResp?.meta?.totalPages || 1) <= txCurrentPage}
                  className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
            const p = await getProfile(effectiveAddress);
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
            const p = await getProfile(effectiveAddress);
            setProfile(p);
          })();
        }}
        address={effectiveAddress}
        initialBio={bioText}
      />
    </>
  );
}

function formatTokenBalance(balance: any, decimals: any): string {
  try {
    if (balance === null || balance === undefined) return "0";
    const raw = String(balance).replace(/[,\s]/g, "");
    const hasDot = /\./.test(raw);
    const fractional = hasDot ? raw.split(".")[1] || "" : "";
    const hasNonZeroFraction = /[1-9]/.test(fractional);
    let decsNum = Number(decimals);

    // If it clearly looks like a token-unit number (has non-zero fractional part), just prettify
    if (hasDot && hasNonZeroFraction) {
      return Decimal.from(raw).prettify(2);
    }

    // If it has .00 (or only zeros) fractional, treat as base units integer
    let integerBaseUnits = raw;
    if (hasDot && !hasNonZeroFraction) {
      integerBaseUnits = raw.split(".")[0];
    }

    // Heuristic: if it's a very long integer, it's almost certainly base units with 18 decimals
    if (!/\./.test(integerBaseUnits) && integerBaseUnits.length >= 19) {
      const normalized = fromAettos(integerBaseUnits, 18);
      return Decimal.from(normalized).prettify(2);
    }

    // Fallback: use provided decimals if valid (>0), otherwise assume 18
    if (!Number.isFinite(decsNum) || decsNum <= 0) decsNum = 18;
    const normalized = fromAettos(integerBaseUnits, decsNum);
    return Decimal.from(normalized).prettify(2);
  } catch {
    try {
      return Decimal.from(String(balance || "0")).prettify(2);
    } catch {
      return String(balance || "0");
    }
  }
}

function formatVolume(volume: string | number): string {
  if (!volume) return "0";
  const num = typeof volume === "string" ? parseFloat(volume) : volume;
  if (!isFinite(num)) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}
