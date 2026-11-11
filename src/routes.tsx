import { SHORTS_ENABLED } from '@/shorts-enabled';
import React, { lazy } from 'react';
import { RouteObject, Navigate, useParams } from 'react-router-dom';
import SocialLayout from './components/layout/SocialLayout';
import { PageHead } from './seo/PageHead';
import { postDetailPath } from './features/notifications/notificationNavigation';

const FeedList = lazy(() => import('./features/social/views/FeedList'));
const NotFound = lazy(() => import('./views/NotFound'));
const TokenList = lazy(() => import('./features/trending/views/TokenList'));
const TrendCloudVisx = lazy(() => import('./views/Trendminer/TrendCloudVisx'));
const TrendInvite = lazy(() => import('./views/Trendminer/Invite'));

// Daos
const TrendDao = lazy(() => import('./features/dao/views/TokenDaosListView'));
const TrendDaos = lazy(() => import('./features/dao/views/DaoListView'));
const VoteView = lazy(() => import('./features/dao/views/DaoVoteDetailsView'));

const TrendAccounts = lazy(() => import('./views/Trendminer/Accounts'));
const TrendAccountDetails = lazy(
  () => import('./views/Trendminer/AccountDetails'),
);
const TrendCreate = lazy(
  () => import('./features/trending/views/CreateTokenView'),
);
const LeaderboardView = lazy(
  () => import('./features/trending/views/LeaderboardView'),
);
const TokenSaleDetails = lazy(
  () => import('./features/trending/views/TokenSaleDetails'),
);
const PostDetail = lazy(() => import('./features/social/views/PostDetail'));
const UserProfile = lazy(() => import('./views/UserProfile'));
const Landing = lazy(() => import('./views/Landing'));
const Wallet = lazy(() => import('./views/Wallet'));
const Conference = lazy(() => import('./views/Conference'));
const Governance = lazy(() => import('./views/Governance'));
const Terms = lazy(() => import('./views/Terms'));
const Privacy = lazy(() => import('./views/Privacy'));
const FAQ = lazy(() => import('./views/FAQ'));
const Branding = lazy(() => import('./views/Branding'));
const BuyAe = lazy(() => import('./views/BuyAe'));
const Whitepaper = lazy(() => import('./views/Whitepaper'));
const TxQueue = lazy(() => import('./views/TxQueue'));

// DEX Components
const DexLayout = lazy(() => import('./features/dex/layouts/DexLayout'));
const DexSwap = lazy(() => import('./features/dex/views/DexSwap'));
const DexWrap = lazy(() => import('./features/dex/views/DexWrap'));
const Pool = lazy(() => import('./features/dex/views/Pool'));
const DexExploreTokens = lazy(
  () => import('./features/dex/views/DexExploreTokens'),
);
const DexExplorePools = lazy(
  () => import('./features/dex/views/DexExplorePools'),
);
const DexExploreTransactions = lazy(
  () => import('./features/dex/views/DexExploreTransactions'),
);

// Legacy DEX components (for backward compatibility)
const Explore = lazy(() => import('./views/Explore'));
const TokenDetail = lazy(() => import('./views/TokenDetail'));
const PoolDetail = lazy(() => import('./features/dex/views/PoolDetail'));
const AddTokens = lazy(() => import('./views/AddTokens'));
const ProfileXCallback = lazy(() => import('./views/ProfileXCallback'));

// Chat — inbox (All / Communities / DMs), DM threads, and token-gated rooms
const ChatLayout = lazy(() => import('./features/chat/layouts/ChatLayout'));
const ChatInbox = lazy(() => import('./features/chat/views/InboxView'));
const DmThread = lazy(() => import('./features/chat/views/DmThreadView'));
const ChatRoom = lazy(() => import('./features/chat/views/RoomView'));
const ChatRoomInfo = lazy(() => import('./features/chat/views/RoomInfoView'));
const ChatRelaySettings = lazy(() => import('./features/chat/views/RelaySettingsView'));

// Redirect helpers for legacy /trending/* paths
const NavigateTrendingToken = () => {
  const { tokenName } = useParams();
  return <Navigate to={`/trends/tokens/${encodeURIComponent(tokenName || '')}`} replace />;
};

const NavigateTrendingDao = () => {
  const { saleAddress } = useParams();
  return <Navigate to={`/trends/dao/${encodeURIComponent(saleAddress || '')}`} replace />;
};

const NavigateTrendingVote = () => {
  const { saleAddress, voteId, voteAddress } = useParams();
  return (
    <Navigate
      to={`/trends/dao/${encodeURIComponent(saleAddress || '')}/vote/${encodeURIComponent(voteId || '')}/${encodeURIComponent(voteAddress || '')}`}
      replace
    />
  );
};

const NavigateTrendingAccount = () => {
  const { address } = useParams();
  return <Navigate to={`/trends/accounts/${encodeURIComponent(address || '')}`} replace />;
};

const NavigateUserProfile = () => {
  const { address } = useParams();
  return <Navigate to={`/users/${encodeURIComponent(address || '')}`} replace />;
};

// Legacy /post/:slug/comment/:id — emitted by older post-comment notifications.
// A comment is itself a post, so the canonical way to focus one is /post/:id
// (PostDetail renders the ancestor chain above it). Without this the nested path
// rendered PostDetail on the *parent* slug and the comment was never focused.
export const NavigatePostComment = () => {
  const { slug, id } = useParams();
  // The comment is the target; the parent slug is only a fallback for a link that
  // arrived without one. `postDetailPath` is shared with the in-app bell so the
  // `_v3` rule cannot drift between the two.
  return <Navigate to={postDetailPath(id || slug || '')} replace />;
};

// Dev-only wallet lab. It clears and rewrites the real on-device vault store, so
// it must never reach a shipped bundle. `import.meta.env.DEV` is statically `false`
// under `vite build`, so this whole block — the WalletLab element and its
// dynamically-imported chunk — is dead-code-eliminated from production `dist`,
// while `npm run dev` keeps the diagnostic reachable at /wallet-lab.
const devRoutes: RouteObject[] = [];
if (import.meta.env.DEV) {
  const WalletLab = lazy(() => import('./views/WalletLab'));
  devRoutes.push({ path: '/wallet-lab', element: <WalletLab /> });
}

if (SHORTS_ENABLED) {
  const Shorts = lazy(() => import('./features/shorts/shorts-page').then((m) => ({ default: m.ShortsPage })));
  devRoutes.push({ path: '/shorts/*', element: <Shorts /> });
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <SocialLayout />,
    children: [
      { index: true, element: <FeedList standalone={false} /> },
      // Post routes - slug-based (also handles IDs, which will redirect in PostDetail)
      { path: 'post/:slug', element: <PostDetail standalone={false} /> },
      { path: 'post/:slug/comment/:id', element: <NavigatePostComment /> },
      { path: 'users/:address', element: <UserProfile standalone={false} /> },
    ],
  },
  // New trends routes
  { path: '/trends/tokens', element: <TokenList /> },
  { path: '/trends', element: <Navigate to="/trends/tokens" replace /> },
  { path: '/trends/visx', element: <PageHead page="trendCloud"><TrendCloudVisx /></PageHead> },
  { path: '/trends/tokens/:tokenName', element: <TokenSaleDetails /> },
  { path: '/trends/leaderboard', element: <LeaderboardView /> },
  { path: '/tx-queue/:id', element: <PageHead page="txQueue"><TxQueue /></PageHead> },
  { path: '/trends/invite', element: <PageHead page="invite"><TrendInvite /></PageHead> },
  { path: '/trends/daos', element: <PageHead page="daos"><TrendDaos /></PageHead> },
  { path: '/trends/dao/:saleAddress', element: <PageHead page="dao"><TrendDao /></PageHead> },
  {
    path: '/trends/dao/:saleAddress/vote/:voteId/:voteAddress',
    element: <PageHead page="daoVote"><VoteView /></PageHead>,
  },
  { path: '/trends/accounts', element: <PageHead page="accounts"><TrendAccounts /></PageHead> },
  {
    path: '/trends/accounts/:address',
    element: <PageHead page="accountDetails"><TrendAccountDetails /></PageHead>,
  },
  { path: '/trends/create', element: <PageHead page="createToken"><TrendCreate /></PageHead> },
  // Legacy redirects from /trending/* -> /trends/*
  { path: '/trending', element: <Navigate to="/trends/tokens" replace /> },
  { path: '/trending/tokens', element: <Navigate to="/trends/tokens" replace /> },
  { path: '/trending/visx', element: <Navigate to="/trends/visx" replace /> },
  { path: '/trending/invite', element: <Navigate to="/trends/invite" replace /> },
  { path: '/trending/daos', element: <Navigate to="/trends/daos" replace /> },
  { path: '/trending/accounts', element: <Navigate to="/trends/accounts" replace /> },
  { path: '/trending/create', element: <Navigate to="/trends/create" replace /> },
  { path: '/trending/leaderboard', element: <Navigate to="/trends/leaderboard" replace /> },
  // Param redirects using small wrappers
  { path: '/trending/tokens/:tokenName', element: <NavigateTrendingToken /> },
  { path: '/trending/dao/:saleAddress', element: <NavigateTrendingDao /> },
  { path: '/trending/dao/:saleAddress/vote/:voteId/:voteAddress', element: <NavigateTrendingVote /> },
  { path: '/trending/accounts/:address', element: <NavigateTrendingAccount /> },
  // Redirect /user/* to /users/* for consistency
  {
    path: '/user/:address',
    element: <NavigateUserProfile />,
  },
  { path: '/profile/x/callback', element: <ProfileXCallback /> },
  {
    path: '/chat',
    element: <ChatLayout />,
    children: [
      { index: true, element: <PageHead page="chat"><ChatInbox /></PageHead> },
      { path: 'settings/relays', element: <PageHead page="chatRelays"><ChatRelaySettings /></PageHead> },
      { path: 'dm/:address', element: <PageHead page="chatDm"><DmThread /></PageHead> },
      { path: ':saleAddress', element: <PageHead page="chatRoom"><ChatRoom /></PageHead> },
      { path: ':saleAddress/info', element: <PageHead page="chatRoomInfo"><ChatRoomInfo /></PageHead> },
    ],
  },
  { path: '/landing', element: <PageHead page="landing"><Landing /></PageHead> },
  { path: '/wallet', element: <PageHead page="wallet"><Wallet /></PageHead> },
  { path: '/meet/:room?', element: <PageHead page="meet"><Conference /></PageHead> },
  { path: '/voting', element: <PageHead page="governance"><Governance /></PageHead> },
  { path: '/voting/p/:id', element: <PageHead page="governance"><Governance /></PageHead> },
  { path: '/voting/account', element: <PageHead page="governance"><Governance /></PageHead> },
  { path: '/voting/create', element: <PageHead page="governance"><Governance /></PageHead> },

  // New DEX Routes with Layout
  {
    path: '/defi',
    element: <Navigate to="/defi/swap" replace />,
  },
  {
    path: '/defi/swap',
    element: (
      <DexLayout>
        <DexSwap />
      </DexLayout>
    ),
  },
  {
    path: '/defi/wrap',
    element: (
      <DexLayout>
        <PageHead page="dexWrap" />
        <DexWrap />
      </DexLayout>
    ),
  },
  // The ETH bridge was removed; keep old links landing somewhere useful.
  { path: '/defi/buy-ae-with-eth', element: <Navigate to="/defi/swap" replace /> },
  { path: '/defi/bridge', element: <Navigate to="/defi/swap" replace /> },
  {
    path: '/defi/pool',
    element: (
      <DexLayout>
        <PageHead page="dexPool" />
        <Pool />
      </DexLayout>
    ),
  },
  {
    path: '/defi/pool/add-tokens',
    element: (
      <DexLayout>
        <PageHead page="dexAddTokens" />
        <AddTokens />
      </DexLayout>
    ),
  },
  {
    path: '/defi/explore/tokens',
    element: (
      <DexLayout>
        <PageHead page="dexExploreTokens" />
        <DexExploreTokens />
      </DexLayout>
    ),
  },
  {
    path: '/defi/explore/tokens/:tokenAddress',
    element: (
      <DexLayout>
        <PageHead page="tokenDetail" />
        <TokenDetail />
      </DexLayout>
    ),
  },
  {
    path: '/defi/explore/pools',
    element: (
      <DexLayout>
        <PageHead page="dexExplorePools" />
        <DexExplorePools />
      </DexLayout>
    ),
  },
  {
    path: '/defi/explore/pools/:poolAddress',
    element: (
      <DexLayout>
        <PageHead page="dexPoolDetail" />
        <PoolDetail />
      </DexLayout>
    ),
  },
  {
    path: '/defi/explore/transactions',
    element: (
      <DexLayout>
        <PageHead page="dexExploreTransactions" />
        <DexExploreTransactions />
      </DexLayout>
    ),
  },

  // Legacy DEX Routes (for backward compatibility)
  { path: '/swap', element: <Navigate to="/defi/swap" replace /> },
  { path: '/pool', element: <PageHead page="dexPool" canonicalPath="/defi/pool"><Pool /></PageHead> },
  { path: '/explore', element: <PageHead page="dexExplore"><Explore /></PageHead> },
  { path: '/explore/tokens/:id', element: <PageHead page="tokenDetail"><TokenDetail /></PageHead> },
  { path: '/explore/pools/:id', element: <PageHead page="dexPoolDetail"><PoolDetail /></PageHead> },
  {
    path: '/pool/add-tokens',
    element: <PageHead page="dexAddTokens" canonicalPath="/defi/pool/add-tokens"><AddTokens /></PageHead>,
  },

  { path: '/terms', element: <PageHead page="terms"><Terms /></PageHead> },
  { path: '/privacy', element: <PageHead page="privacy"><Privacy /></PageHead> },
  { path: '/faq', element: <PageHead page="faq"><FAQ /></PageHead> },
  { path: '/branding', element: <PageHead page="branding"><Branding /></PageHead> },
  { path: '/get-ae', element: <BuyAe /> },
  { path: '/buy-ae', element: <Navigate to="/get-ae" replace /> },
  { path: '/whitepaper', element: <PageHead page="whitepaper"><Whitepaper /></PageHead> },
  ...devRoutes,
  {
    path: '*',
    element: <NotFound />,
  },
];
