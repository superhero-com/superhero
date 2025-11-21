import React, { lazy } from "react";
import { routeRegistry } from "@/features/social/plugins/registries";
import { RouteObject, Navigate, useParams } from "react-router-dom";
import SocialLayout from "./components/layout/SocialLayout";

const FeedList = lazy(() => import("./features/social/views/FeedList"));
const TokenList = lazy(() => import("./features/trending/views/TokenList"));
const TrendCloudVisx = lazy(() => import("./views/Trendminer/TrendCloudVisx"));
const TrendInvite = lazy(() => import("./views/Trendminer/Invite"));

// Daos
const TrendDao = lazy(() => import("./features/dao/views/TokenDaosListView"));
const TrendDaos = lazy(() => import("./features/dao/views/DaoListView"));
const VoteView = lazy(() => import("./features/dao/views/DaoVoteDetailsView"));

const TrendAccounts = lazy(() => import("./views/Trendminer/Accounts"));
const TrendAccountDetails = lazy(
  () => import("./views/Trendminer/AccountDetails")
);
const TrendCreate = lazy(
  () => import("./features/trending/views/CreateTokenView")
);
const LeaderboardView = lazy(
  () => import("./features/trending/views/LeaderboardView")
);
const TokenSaleDetails = lazy(
  () => import("./features/trending/views/TokenSaleDetails")
);
const PostDetail = lazy(() => import("./features/social/views/PostDetail"));
const PollDetail = lazy(() => import("./features/social/views/PollDetail"));
const UserProfile = lazy(() => import("./views/UserProfile"));
const Landing = lazy(() => import("./views/Landing"));
const Conference = lazy(() => import("./views/Conference"));
const Terms = lazy(() => import("./views/Terms"));
const Privacy = lazy(() => import("./views/Privacy"));
const FAQ = lazy(() => import("./views/FAQ"));
const TxQueue = lazy(() => import("./views/TxQueue"));

// DEX Components
const DexLayout = lazy(() => import("./features/dex/layouts/DexLayout"));
const DexSwap = lazy(() => import("./features/dex/views/DexSwap"));
const DexWrap = lazy(() => import("./features/dex/views/DexWrap"));
const DexBridge = lazy(() => import("./features/dex/views/DexBridge"));
const Pool = lazy(() => import("./features/dex/views/Pool"));
const DexExploreTokens = lazy(
  () => import("./features/dex/views/DexExploreTokens")
);
const DexExplorePools = lazy(
  () => import("./features/dex/views/DexExplorePools")
);
const DexExploreTransactions = lazy(
  () => import("./features/dex/views/DexExploreTransactions")
);
const Bridge = lazy(() => import("./features/ae-eth-bridge/views/Bridge"));

// Legacy DEX components (for backward compatibility)
const Explore = lazy(() => import("./views/Explore"));
const TokenDetail = lazy(() => import("./views/TokenDetail"));
const PoolDetail = lazy(() => import("./features/dex/views/PoolDetail"));
const AddTokens = lazy(() => import("./views/AddTokens"));

// Redirect helpers for legacy /trending/* paths
function NavigateTrendingToken() {
  const { tokenName } = useParams();
  return <Navigate to={`/trends/tokens/${encodeURIComponent(tokenName || "")}`} replace />;
}

function NavigateTrendingDao() {
  const { saleAddress } = useParams();
  return <Navigate to={`/trends/dao/${encodeURIComponent(saleAddress || "")}`} replace />;
}

function NavigateTrendingVote() {
  const { saleAddress, voteId, voteAddress } = useParams();
  return (
    <Navigate
      to={`/trends/dao/${encodeURIComponent(saleAddress || "")}/vote/${encodeURIComponent(voteId || "")}/${encodeURIComponent(voteAddress || "")}`}
      replace
    />
  );
}

function NavigateTrendingAccount() {
  const { address } = useParams();
  return <Navigate to={`/trends/accounts/${encodeURIComponent(address || "")}`} replace />;
}

function NavigateUserProfile() {
  const { address } = useParams();
  return <Navigate to={`/users/${encodeURIComponent(address || "")}`} replace />;
}

// Export a function that builds routes dynamically, including plugin routes
export const getRoutes = (): RouteObject[] => [
  {
    path: "/",
    element: <SocialLayout />,
    children: [
      { index: true, element: <FeedList standalone={false} /> },
      // Post routes - slug-based (also handles IDs, which will redirect in PostDetail)
      { path: "post/:slug", element: <PostDetail standalone={false} /> },
      {
        path: "post/:slug/comment/:id",
        element: <PostDetail standalone={false} />,
      },
      { path: "poll/:pollAddress", element: <PollDetail standalone={false} /> },
      { path: "users/:address", element: <UserProfile standalone={false} /> },
    ],
  },
  // New trends routes
  { path: "/trends/tokens", element: <TokenList /> },
  { path: "/trends", element: <Navigate to="/trends/tokens" replace /> },
  { path: "/trends/visx", element: <TrendCloudVisx /> },
  { path: "/trends/tokens/:tokenName", element: <TokenSaleDetails /> },
  { path: "/trends/leaderboard", element: <LeaderboardView /> },
  { path: "/tx-queue/:id", element: <TxQueue /> },
  { path: "/trends/invite", element: <TrendInvite /> },
  { path: "/trends/daos", element: <TrendDaos /> },
  { path: "/trends/dao/:saleAddress", element: <TrendDao /> },
  { path: "/trends/dao/:saleAddress/vote/:voteId/:voteAddress", element: <VoteView /> },
  { path: "/trends/accounts", element: <TrendAccounts /> },
  { path: "/trends/accounts/:address", element: <TrendAccountDetails /> },
  { path: "/trends/create", element: <TrendCreate /> },
  // Legacy redirects from /trending/* -> /trends/*
  { path: "/trending", element: <Navigate to="/trends/tokens" replace /> },
  { path: "/trending/tokens", element: <Navigate to="/trends/tokens" replace /> },
  { path: "/trending/visx", element: <Navigate to="/trends/visx" replace /> },
  { path: "/trending/invite", element: <Navigate to="/trends/invite" replace /> },
  { path: "/trending/daos", element: <Navigate to="/trends/daos" replace /> },
  { path: "/trending/accounts", element: <Navigate to="/trends/accounts" replace /> },
  { path: "/trending/create", element: <Navigate to="/trends/create" replace /> },
  { path: "/trending/leaderboard", element: <Navigate to="/trends/leaderboard" replace /> },
  // Param redirects using small wrappers
  { path: "/trending/tokens/:tokenName", element: <NavigateTrendingToken /> },
  { path: "/trending/dao/:saleAddress", element: <NavigateTrendingDao /> },
  { path: "/trending/dao/:saleAddress/vote/:voteId/:voteAddress", element: <NavigateTrendingVote /> },
  { path: "/trending/accounts/:address", element: <NavigateTrendingAccount /> },
  // Redirect /user/* to /users/* for consistency
  {
    path: "/user/:address",
    element: <NavigateUserProfile />,
  },
  { path: "/landing", element: <Landing /> },
  { path: "/meet/:room?", element: <Conference /> },

  // New DEX Routes with Layout
  {
    path: "/defi",
    element: <Navigate to="/defi/swap" replace />,
  },
  {
    path: "/defi/swap",
    element: (
      <DexLayout>
        <DexSwap />
      </DexLayout>
    ),
  },
  {
    path: "/defi/wrap",
    element: (
      <DexLayout>
        <DexWrap />
      </DexLayout>
    ),
  },
  {
    path: "/defi/buy-ae-with-eth",
    element: (
      <DexLayout>
        <DexBridge />
      </DexLayout>
    ),
  },
  {
    path: "/defi/bridge",
    element: (
      <DexLayout>
        <Bridge />
      </DexLayout>
    ),
  },
  {
    path: "/defi/pool",
    element: (
      <DexLayout>
        <Pool />
      </DexLayout>
    ),
  },
  {
    path: "/defi/pool/add-tokens",
    element: (
      <DexLayout>
        <AddTokens />
      </DexLayout>
    ),
  },
  {
    path: "/defi/explore/tokens",
    element: (
      <DexLayout>
        <DexExploreTokens />
      </DexLayout>
    ),
  },
  {
    path: "/defi/explore/tokens/:tokenAddress",
    element: (
      <DexLayout>
        <TokenDetail />
      </DexLayout>
    ),
  },
  {
    path: "/defi/explore/pools",
    element: (
      <DexLayout>
        <DexExplorePools />
      </DexLayout>
    ),
  },
  {
    path: "/defi/explore/pools/:poolAddress",
    element: (
      <DexLayout>
        <PoolDetail />
      </DexLayout>
    ),
  },
  {
    path: "/defi/explore/transactions",
    element: (
      <DexLayout>
        <DexExploreTransactions />
      </DexLayout>
    ),
  },

  // Legacy DEX Routes (for backward compatibility)
  { path: "/swap", element: <Navigate to="/defi/swap" replace /> },
  { path: "/pool", element: <Pool /> },
  { path: "/explore", element: <Explore /> },
  { path: "/explore/tokens/:id", element: <TokenDetail /> },
  { path: "/explore/pools/:id", element: <PoolDetail /> },
  { path: "/pool/add-tokens", element: <AddTokens /> },

  { path: "/terms", element: <Terms /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/faq", element: <FAQ /> },
  // Plugin-provided routes appended at the end (top-level)
  ...routeRegistry,
  {
    path: "*",
    element: <SocialLayout />,
    children: [{ index: true, element: <FeedList standalone={false} /> }],
  },
];
