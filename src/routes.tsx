import React, { lazy } from "react";
import { RouteObject, Navigate } from "react-router-dom";
import SocialLayout from "./components/layout/SocialLayout";

const FeedList = lazy(() => import("./features/social/views/FeedList"));
const TokenList = lazy(() => import("./features/trendminer/views/TokenList"));
const TrendCloud = lazy(() => import("./views/Trendminer/TrendCloud"));
const TrendCloudVisx = lazy(() => import("./views/Trendminer/TrendCloudVisx"));
const TrendInvite = lazy(() => import("./views/Trendminer/Invite"));
const TrendDao = lazy(() => import("./views/Trendminer/Dao"));
const TrendDaos = lazy(() => import("./views/Trendminer/Daos"));
const TrendAccounts = lazy(() => import("./views/Trendminer/Accounts"));
const TrendAccountDetails = lazy(
  () => import("./views/Trendminer/AccountDetails")
);
const TrendCreate = lazy(
  () => import("./features/trendminer/views/CreateTokenView")
);
const TokenSaleDetails = lazy(
  () => import("./features/trendminer/views/TokenSaleDetails")
);
const PostDetail = lazy(() => import("./features/social/views/PostDetail"));
const UserProfile = lazy(() => import("./views/UserProfile"));
const Landing = lazy(() => import("./views/Landing"));
const Conference = lazy(() => import("./views/Conference"));
const Governance = lazy(() => import("./views/Governance"));
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
const Swap = lazy(() => import("./views/Swap"));
const Explore = lazy(() => import("./views/Explore"));
const TokenDetail = lazy(() => import("./views/TokenDetail"));
const PoolDetail = lazy(() => import("./views/PoolDetail"));
const AddTokens = lazy(() => import("./views/AddTokens"));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <SocialLayout />,
    children: [
      { index: true, element: <FeedList standalone={false} /> },
      { path: "post/:postId", element: <PostDetail standalone={false} /> },
      {
        path: "post/:postId/comment/:id",
        element: <PostDetail standalone={false} />,
      },
      { path: "users/:address", element: <UserProfile standalone={false} /> },
    ],
  },
  { path: "/trendminer/tokens", element: <TokenList /> },
  { path: "/trendminer", element: <TrendCloud /> },
  { path: "/trendminer/visx", element: <TrendCloudVisx /> },
  { path: "/trendminer/tokens/:tokenName", element: <TokenSaleDetails /> },
  { path: "/tx-queue/:id", element: <TxQueue /> },
  { path: "/trendminer/invite", element: <TrendInvite /> },
  { path: "/trendminer/dao/:saleAddress", element: <TrendDao /> },
  { path: "/trendminer/daos", element: <TrendDaos /> },
  { path: "/trendminer/accounts", element: <TrendAccounts /> },
  { path: "/trendminer/accounts/:address", element: <TrendAccountDetails /> },
  { path: "/trendminer/create", element: <TrendCreate /> },
  // Kept for backward compatibility; redirecting into SocialLayout version
  { path: "/users/:address", element: <UserProfile /> },
  { path: "/landing", element: <Landing /> },
  { path: "/meet/:room?", element: <Conference /> },
  { path: "/voting", element: <Governance /> },
  { path: "/voting/p/:id", element: <Governance /> },
  { path: "/voting/account", element: <Governance /> },

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
  { path: "/swap", element: <Swap /> },
  { path: "/pool", element: <Pool /> },
  { path: "/explore", element: <Explore /> },
  { path: "/explore/tokens/:id", element: <TokenDetail /> },
  { path: "/explore/pools/:id", element: <PoolDetail /> },
  { path: "/pool/add-tokens", element: <AddTokens /> },

  { path: "/terms", element: <Terms /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/faq", element: <FAQ /> },
  {
    path: "*",
    element: <SocialLayout />,
    children: [{ index: true, element: <FeedList standalone={false} /> }],
  },
];
