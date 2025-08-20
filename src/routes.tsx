import React, { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const FeedList = lazy(() => import('./views/FeedList'));
const Trending = lazy(() => import('./views/Trending'));
const TrendTokens = lazy(() => import('./views/Trendminer/TokenList'));
const TrendCloud = lazy(() => import('./views/Trendminer/TrendCloud'));
const TrendCloudVisx = lazy(() => import('./views/Trendminer/TrendCloudVisx'));
const TrendTokenDetails = lazy(() => import('./views/Trendminer/TokenDetails'));
const TrendInvite = lazy(() => import('./views/Trendminer/Invite'));
const TrendDao = lazy(() => import('./views/Trendminer/Dao'));
  const TrendDaos = lazy(() => import('./views/Trendminer/Daos'));
  const TrendAccounts = lazy(() => import('./views/Trendminer/Accounts'));
  const TrendAccountDetails = lazy(() => import('./views/Trendminer/AccountDetails'));
const TrendCreate = lazy(() => import('./views/Trendminer/CreateToken'));
const PostDetail = lazy(() => import('./views/PostDetail'));
const UserProfile = lazy(() => import('./views/UserProfile'));
const Landing = lazy(() => import('./views/Landing'));
const Conference = lazy(() => import('./views/Conference'));
const Governance = lazy(() => import('./views/Governance'));
const Terms = lazy(() => import('./views/Terms'));
const Privacy = lazy(() => import('./views/Privacy'));
const FAQ = lazy(() => import('./views/FAQ'));
  const TxQueue = lazy(() => import('./views/TxQueue'));
  const Swap = lazy(() => import('./views/Swap'));
  const Dex = lazy(() => import('./views/Dex'));
  const Pool = lazy(() => import('./views/Pool'));
  const PoolImport = lazy(() => import('./views/PoolImport'));
  const PoolAdd = lazy(() => import('./views/PoolAdd'));
  const PoolRemove = lazy(() => import('./views/PoolRemove'));
  const Explore = lazy(() => import('./views/Explore'));
  const TokenDetail = lazy(() => import('./views/TokenDetail'));
  const PoolDetail = lazy(() => import('./views/PoolDetail'));
  const AddTokens = lazy(() => import('./views/AddTokens'));
  const DeployPool = lazy(() => import('./views/DeployPool'));

export const routes: RouteObject[] = [
  { path: '/', element: <FeedList /> },
  { path: '/post/:postId', element: <PostDetail /> },
  { path: '/post/:postId/comment/:id', element: <PostDetail /> },
  { path: '/trending', element: <Trending /> },
  { path: '/trendminer', element: <TrendCloud /> },
  { path: '/trendminer/visx', element: <TrendCloudVisx /> },
  { path: '/trendminer/tokens', element: <TrendTokens /> },
  { path: '/trendminer/tokens/:tokenName', element: <TrendTokenDetails /> },
  { path: '/tx-queue/:id', element: <TxQueue /> },
  { path: '/trendminer/invite', element: <TrendInvite /> },
  { path: '/trendminer/dao/:saleAddress', element: <TrendDao /> },
  { path: '/trendminer/daos', element: <TrendDaos /> },
  { path: '/trendminer/accounts', element: <TrendAccounts /> },
  { path: '/trendminer/accounts/:address', element: <TrendAccountDetails /> },
  { path: '/trendminer/create', element: <TrendCreate /> },
  { path: '/users/:address', element: <UserProfile /> },
  { path: '/landing', element: <Landing /> },
  { path: '/meet/:room?', element: <Conference /> },
  { path: '/voting', element: <Governance /> },
  { path: '/voting/p/:id', element: <Governance /> },
  { path: '/voting/account', element: <Governance /> },
  { path: '/swap', element: <Swap /> },
  { path: '/dex', element: <Dex /> },
  { path: '/pool', element: <Pool /> },
  { path: '/pool/import', element: <PoolImport /> },
  { path: '/pool/add', element: <PoolAdd /> },
  { path: '/pool/remove/:id', element: <PoolRemove /> },
  { path: '/explore', element: <Explore /> },
  { path: '/explore/tokens/:id', element: <TokenDetail /> },
  { path: '/explore/pools/:id', element: <PoolDetail /> },
  { path: '/pool/add-tokens', element: <AddTokens /> },
  { path: '/pool/deploy', element: <DeployPool /> },
  { path: '/terms', element: <Terms /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/faq', element: <FAQ /> },
  { path: '*', element: <FeedList /> },
];


