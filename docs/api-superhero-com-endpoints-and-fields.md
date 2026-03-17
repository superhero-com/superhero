# api.superhero.com Backend — Endpoints and Response Fields Used

This document lists every endpoint used against the **api.superhero.com** backend (via `CONFIG.SUPERHERO_API_URL` / `OpenAPI.BASE`) and the **exact response fields** consumed by the app.

---

## 1. SuperheroApi (src/api/backend.ts)

All methods use the same base URL; only the path and query params vary.

### 1.1 `GET /api/posts/popular`

**Query:** `window`, `page`, `limit`

**Used in:** `FeedList.tsx` (infinite feed)

**Response fields used:**
- `items` (array of posts)
  - `id`
- `meta`
  - `currentPage`
  - `totalPages`
  - `totalItems`
  - `itemCount`

---

### 1.2 `GET /api/tips/posts/{postId}/summary`

**Used in:** `usePostTipSummary.ts`, `PostDetail.tsx`, `PostTipButton.tsx`, `TipModal.tsx`

**Response fields used:**
- `totalTips` (string, used as number)

---

### 1.3 `GET /api/factory`

**Used in:** Referenced in backend comment; `AppService.getFactory()` in generated code also hits `/api/factory`.

**Response fields used:** Active community factory schema (address, collections, rules) — exact field usage not traced in this scan; see `getFactory()` callers.

---

### 1.4 `GET /api/trending-tags`

**Query:** `order_by`, `order_direction`, `limit`, `page`, `search`

**Used in:** `LeftRail.tsx`, `TrendingPillsCarousel.tsx`, `TrendCloudVisx.tsx`, `RepositoriesList.tsx`

**Response fields used:**
- `items` (array)
  - `tag` or `name`
  - `score` or `value`
  - `source` or `platform`

---

### 1.5 `GET /api/topics/name/{name}`

**Used in:** `TokenTopicFeed.tsx`, `TokenTopicComposer.tsx`

**Response fields used:**
- `posts` (array)
- `post_count` (number)

---

### 1.6 `GET /api/tokens`

**Query:** `order_by`, `order_direction`, `collection`, `limit`, `page`, `search`, `owner_address`, `creator_address`, `factory_address`

**Used in:** `UserProfile.tsx`, `AccountFeed.tsx`, `FeedList.tsx`, `CreateTokenView.tsx`, `AccountDetails.tsx`, `PostHashtagLink.tsx`

**Response fields used:**
- `items` (array of token objects)
  - `sale_address` or `address`
  - `token_name` or `name`
  - `created_at`
  - `tx_hash`
  - `creator_address`
  - (and full token payload when used as `TokenDto` from generated types elsewhere)

---

### 1.7 `GET /api/tokens/{address}`

**Used in:** Via `TokensService.findByAddress()` (generated) and token detail views.

**Response fields used:** See generated `TokenDto`: `id`, `network_id`, `factory_address`, `sale_address`, `creator_address`, `owner_address`, `beneficiary_address`, `bonding_curve_address`, `collection`, `metaInfo`, `address`, `name`, `symbol`, `decimals`, `rank`, `holders_count`, `price`, `price_data`, `sell_price`, `sell_price_data`, `market_cap`, `market_cap_data`, `total_supply`, `dao_balance`, `created_at`, `tx_type`, `volume`, `amount`, `unit_price`, `create_tx_hash`.  
SEO (Netlify edge): `symbol`, `name`, `metaInfo.description`, `logo_url` / `image_url` / `logo`, `address` / `sale_address`.

---

### 1.8 `GET /api/tokens/{address}/performance`

**Used in:** `MobileAppHeader.tsx`, `PostHashtagLink.tsx`

**Response fields used:**
- `past_7d.current_change_percent`

---

### 1.9 `GET /api/tokens/{address}/holders`

**Used in:** Via `TokensService.listTokenHolders()` — `TokenTopicFeed.tsx`, `WalletOverviewCard.tsx`, `UserProfile.tsx` (count), etc.

**Response fields used:** `items`, `meta` (pagination). Item shape from `TokenHolderDto` as used in UI (balance, address, etc.).

---

### 1.10 `GET /api/transactions`

**Query:** `token_address`, `limit`, `page`

**Used in:** Via backend method `listTokenTransactions()`; generated `TransactionsService` also has this path.

**Response fields used:** Paginated list of transactions (items + meta as used by consumers).

---

### 1.11 `GET /api/tokens/{address}/score`

**Used in:** `SuperheroApi.getTokenScore()` — trace usages for exact fields.

---

### 1.12 `GET /api/tokens/{address}/rankings`

**Query:** `limit`, `page`

**Used in:** `TokenRanking.tsx`

**Response fields used:**
- `items` (array)
  - `sale_address`
  - `rank`
- (ranking list for display)

---

### 1.13 `GET /api/accounts/{address}/tokens`

**Query:** `order_by`, `order_direction`, `limit`, `page`, `search`

**Used in:** `AccountTokensService.listTokenHolders()` / list account tokens — `UserProfile.tsx`, `WalletOverviewCard.tsx`, `TokenSaleDetails.tsx`, etc.

**Response fields used:** `items`, `meta`. Item fields follow token/holder shape used in each view (e.g. balance, token address).

---

### 1.14 `GET /api/analytics/daily-created-tokens-count`

**Query:** `start_date`, `end_date`

**Used in:** Generated `AnalyticsService`.

---

### 1.15 `GET /api/analytics/daily-trade-volume`

**Query:** `start_date`, `end_date`, `token_address`, `account_address`

**Used in:** Generated `AnalyticsService`.

---

### 1.16 `GET /api/analytics/daily-unique-active-users`

**Query:** `start_date`, `end_date`, `token_address`

**Used in:** Generated `AnalyticsService`.

---

### 1.17 `GET /api/tokens/{address}/history`

**Query:** `interval`, `convertTo`, `limit`, `page`

**Used in:** Charts and token history (e.g. `TransactionHistoricalService`, token detail).

---

### 1.18 `GET /api/accounts/{address}/portfolio/history`

**Query:** `startDate`, `endDate`, `interval`, `convertTo`, `include` (e.g. `pnl-range`)

**Used in:** `AccountPortfolio.tsx`, `usePortfolioValue.ts`

**Response fields used:** Array of snapshots; each snapshot:
- `timestamp`
- `total_value_ae`
- `ae_balance`
- `tokens_value_ae`
- `total_value_usd`
- `total_pnl` (when `include=pnl-range`)
  - `percentage`
  - `invested` (`ae`, `usd`)
  - `current_value` (`ae`, `usd`)
  - `gain` (`ae`, `usd`)
  - `range` (`from`, `to`)

---

### 1.19 `GET /api/accounts`

**Query:** `order_by`, `order_direction`, `limit`, `page`

**Used in:** `Accounts.tsx` (Trendminer)

**Response fields used:**
- `items` (list of account rows)
- `meta.currentPage`
- `meta.totalPages`

---

### 1.20 `GET /api/accounts/{address}`

**Used in:** `UserProfile.tsx` (AccountsService.getAccount), Netlify edge SEO

**Response fields used:**
- `bio`
- `chain_name`  
SEO: `chain_name`, `bio` for meta title/description.

---

### 1.21 `GET /api/invitations`

**Query:** `order_by`, `order_direction`, `limit`, `page`

**Used in:** Generated `InvitationsService`.

---

### 1.22 `GET /api/analytics/total-market-cap`

**Used in:** Generated `AnalyticsService`.

---

### 1.23 `GET /api/analytics/total-created-tokens`

**Used in:** Generated `AnalyticsService`.

---

### 1.24 `GET /api/analytics/daily-market-cap-sum`

**Query:** `start_date`, `end_date`, `token_sale_addresses`

**Used in:** Generated `AnalyticsService`.

---

### 1.25 `GET /api/coins/aeternity/rates`

**Used in:** `AePricePollingProvider.tsx`, `useCurrencies.ts`

**Response fields used:** Object of currency code → number (rate). Keys normalized to lowercase; only finite numbers used (e.g. `usd`, `eur`, `cny`).

---

### 1.26 `GET /api/coins/aeternity/market-data`

**Query:** `currency`

**Used in:** Backend method exists; trace for exact consumers.

---

### 1.27 `GET /api/posts`

**Query:** `limit`, `page`, `order_by`, `order_direction`, `search`, `account_address`, `topics`

**Used in:** `FeedList.tsx`, `UserProfile.tsx`, `fetchPosts()`, generated `PostsService`.  
Server/Netlify: search by `search`, `limit`, `page`; use `items[0].id` then fetch post by id.

**Response fields used:** `items`, `meta` (pagination). Post items: `id`, `content`, `media`, `created_at`, `updated_at`, `total_comments`, `sender_address`, `slug` (SEO).

---

### 1.28 `GET /api/profile/{address}`

**Query:** `includeOnChain`

**Used in:** `UserProfile.tsx`, `AddressAvatarWithChainName.tsx`, `useProfile.ts`  
**Note:** Currently stubbed in backend.ts (`return Promise.resolve(null)`). When enabled, types expect:

**Response fields used (from types):**
- `address`
- `profile`
  - `fullname`, `bio`, `avatarurl`, `username`, `x_username`, `chain_name`, `display_source`, `chain_expires_at`
- `public_name`

---

### 1.29 `GET /api/profile`

**Query:** `addresses`, `includeOnChain`

**Used in:** `getProfilesByAddresses()` — batch profile fetch.

---

### 1.30 `GET /api/profile/feed`

**Note:** Stubbed in backend (`return Promise.resolve({ items: [], data: [] })`). When ready: `items` / `data` as `ProfileAggregate[]`.

---

### 1.31 `POST /api/profile/x/attestation`

**Body:** `{ address, accessToken }` or `{ address, code, code_verifier, redirect_uri }`

**Used in:** `useProfile.ts`, `ProfileXCallback.tsx`

**Response fields used (XAttestationResponse):** `signer`, `address`, `x_username`, `nonce`, `expiry`, `message`, `signature_hex`, `signature_base64`

---

### 1.32 `POST /api/profile/{address}/challenge`

**Body:** ProfileEditablePayload

**Used in:** Legacy profile update (deprecated).

**Response fields used:** `challenge`, `payload_hash`, `expires_at`, `ttl_seconds`

---

### 1.33 `PATCH /api/profile/{address}`

**Body:** ProfileEditablePayload + challenge + signature

**Used in:** Legacy profile update (deprecated).

**Response fields used:** ProfileUpdateResponse (address, fullname, bio, nostrkey, avatarurl, username, x_username, chain_name, sol_name, created_at, updated_at)

---

## 2. Direct fetchJson (same base URL)

### 2.1 `GET /api/analytics/past-24-hours`

**Used in:** `LeftRail.tsx`

**Response fields used:** Entire response stored as `marketStats` (any); no specific field list in code.

---

### 2.2 `GET /api/accounts/leaderboard`

**Query:** `window`, `sortBy`, `sortDir`, `page`, `limit`, `points`

**Used in:** `src/features/trending/api/leaderboard.ts` (`fetchLeaderboard`)

**Response fields used:**
- `items` (array of LeaderboardItem)
  - `address`
  - `chain_name`
  - `aum_usd`, `pnl_usd`, `roi_pct`, `mdd_pct`
  - `buy_count`, `sell_count`
  - `created_tokens_count`, `owned_trends_count`
  - `portfolio_value_usd_sparkline`
- `meta`
  - `page`, `limit`, `totalItems`, `totalPages`, `window`, `sortBy`, `sortDir`

---

## 3. OpenAPI-generated services (OpenAPI.BASE = api.superhero.com)

These hit the same backend; only the path is listed. Response shapes follow generated DTOs; fields actually used are those referenced in components (see TokenDto, PostDto, etc. and their usages).

| Service | Method / Path | Response fields (key ones) |
|--------|----------------|----------------------------|
| **AccountsService** | GET /api/accounts | items, meta |
| **AccountsService** | GET /api/accounts/{address} | bio, chain_name (and full account DTO) |
| **AccountTokensService** | GET /api/accounts/{address}/tokens | items, meta |
| **TokensService** | GET /api/tokens | items, meta (TokenDto[]) |
| **TokensService** | GET /api/tokens/{address} | TokenDto (see 1.7) |
| **TokensService** | GET /api/tokens/{address}/holders | items, meta |
| **TokensService** | GET /api/tokens/{address}/rankings | items, meta |
| **TokensService** | GET /api/tokens/{address}/score | score payload |
| **TokensService** | GET /api/tokens/{address}/performance | past_7d.current_change_percent |
| **PostsService** | GET /api/posts | items, meta (PostDto[]) |
| **PostsService** | GET /api/posts/{id} | id, content, media, created_at, updated_at, total_comments, sender_address, slug |
| **PostsService** | GET /api/posts/{id}/comments | comments list |
| **TipsService** | GET /api/tips/posts/{postId}/summary | totalTips |
| **TipsService** | GET /api/tips/accounts/{address}/summary | (trace as needed) |
| **TopicsService** | GET /api/topics/name/{name} | posts, post_count |
| **TrendingTagsService** | GET /api/trending-tags | items (tag, score, etc.) |
| **AnalyticsService** | GET /api/analytics/daily-created-tokens-count | (analytics DTOs) |
| **AnalyticsService** | GET /api/analytics/total-market-cap | (value) |
| **AnalyticsService** | GET /api/analytics/total-created-tokens | (value) |
| **AnalyticsService** | GET /api/analytics/daily-trade-volume | (analytics DTOs) |
| **AnalyticsService** | GET /api/analytics/daily-unique-active-users | (analytics DTOs) |
| **AnalyticsService** | GET /api/analytics/total-unique-users | (value) |
| **AnalyticsService** | GET /api/analytics/daily-market-cap-sum | (analytics DTOs) |
| **AnalyticsService** | GET /api/analytics/past-24-hours | (raw object in LeftRail) |
| **AnalyticsService** | GET /api/analytics/preview | (trace as needed) |
| **TransactionHistoricalService** | GET /api/tokens/{address}/transactions | (transaction list) |
| **TransactionHistoricalService** | GET /api/tokens/{address}/history | (history data) |
| **TransactionHistoricalService** | GET /api/tokens/preview/{address} | (preview) |
| **TransactionsService** | GET /api/transactions | (transaction list) |
| **TransactionsService** | GET /api/transactions/by-hash | (single tx) |
| **InvitationsService** | GET /api/invitations | (invitations list) |
| **AppService** | GET /api/stats | (trace as needed) |
| **AppService** | GET /api/contracts | (trace as needed) |
| **AppService** | GET /api/factory | (factory schema) |
| **AffiliationsService** | GET/POST /api/affiliations/* | (affiliation endpoints) |
| **DebugFailedTransactionsService** | GET /api/debug/failed-transactions | (debug) |
| **DexService** | /api/dex/tokens, /api/dex/transactions, etc. | (DEX-specific; same base URL) |
| **DexPairService** | /api/dex/pairs/* | (pair data) |
| **BullBoardService** | /api/bull-board/* | (admin/board) |

---

## 4. Server / Netlify (api.superhero.com)

Used for SEO only; same base URL.

- **GET /api/posts/{id}** — Post by id or slug. Fields: `content`, `media`, `created_at`, `updated_at`, `total_comments`, `sender_address`, `slug`.
- **GET /api/posts?search=...&limit=1&page=1** — `items[0].id` then fetch post by id.
- **GET /api/accounts/{address}** — `chain_name`, `bio` for meta.
- **GET /api/tokens/{address}** — `symbol`, `name`, `metaInfo.description`, `logo_url`/`image_url`/`logo`, `address`/`sale_address` for token SEO.

---

## 5. Not api.superhero.com

- **Chain names:** `configs.networks.ae_mainnet.superheroBackendUrl` → `https://superhero-backend-mainnet.prd.service.aepps.com/cache/chainNames` (different host).
- **GIPHY:** `api.giphy.com` (GifSelectorDialog).
- **Invitations middleware:** `activeNetwork.middlewareUrl` (middleware), not api.superhero.com.

---

## 6. Unused or effectively unused endpoints

The following endpoints are **defined** (in `backend.ts` or generated services) but **never called** from application code. They may still be part of the OpenAPI spec or kept for future use.

### Never called (SuperheroApi or generated client)

| Endpoint | Defined in | Note |
|----------|------------|------|
| `GET /api/tokens/{address}/score` | `SuperheroApi.getTokenScore`, `TokensService.getTokenScore` | No callers |
| `GET /api/coins/aeternity/market-data` | `SuperheroApi.getMarketData` | No callers; rates come from `getCurrencyRates()` |
| `GET /api/invitations` | `SuperheroApi.listInvitations`, `InvitationsService` | No callers |
| `GET /api/profile` (batch, `?addresses=...`) | `SuperheroApi.getProfilesByAddresses` | No callers |
| `POST /api/profile/{address}/challenge` | `SuperheroApi.issueProfileChallenge` | Deprecated; no callers |
| `PATCH /api/profile/{address}` | `SuperheroApi.updateProfile` | Deprecated; no callers |
| `fetchPosts(limit)` helper | `backend.ts` (calls `listPosts`) | Exported but never imported; app uses `PostsService.listAll` |
| `GET /api/transactions` via **SuperheroApi** | `SuperheroApi.listTokenTransactions` | No callers; app uses `TransactionsService.listTransactions` |
| `GET /api/analytics/daily-created-tokens-count` | `SuperheroApi`, `AnalyticsService.listDailyCreatedTokensCount` | No callers; 24h stats from `getPast24HoursAnalytics()` |
| `GET /api/analytics/daily-trade-volume` | `SuperheroApi.listDailyTradeVolume` | Only **AnalyticsService.dailyTradeVolume** is used |
| `GET /api/analytics/daily-unique-active-users` | `SuperheroApi`, `AnalyticsService.listDailyUniqueActiveUsers` | No callers |
| `GET /api/analytics/total-market-cap` | `SuperheroApi`, `AnalyticsService.getTotalMarketCap` | No callers; data from past-24-hours |
| `GET /api/analytics/total-created-tokens` | `SuperheroApi`, `AnalyticsService.getTotalCreatedTokens` | No callers; data from past-24-hours |
| `GET /api/analytics/daily-market-cap-sum` | `SuperheroApi`, `AnalyticsService.listDailyMarketCapSum` | No callers |
| `GET /api/analytics/total-unique-users` | `AnalyticsService.totalUniqueUsers` | No callers |
| `GET /api/analytics` | `AnalyticsService.getAnalyticsData` | No callers |
| `GET /api/analytics/preview` | `AnalyticsService.analyticControllerRoot` | No callers |
| `GET /api/stats` | `AppService.getStats` | No callers |
| `GET /api/contracts` | `AppService.getContracts` | No callers |
| `GET /api/tips/accounts/{address}/summary` | `TipsService` | No callers (only post tip summary is used) |
| `GET /api/bull-board`, `GET /api/bull-board/{path}` | `BullBoardService` | No callers |
| `GET/POST /api/affiliations/*` | `AffiliationsService` | No callers |
| `GET /api/debug/failed-transactions` | `DebugFailedTransactionsService` | No callers |

### Used via generated service only (SuperheroApi wrapper unused)

- **`GET /api/factory`** — App uses `AppService.getFactory()` only; `SuperheroApi.getFactory()` is never called.

---

## Summary table (SuperheroApi + direct fetchJson)

*Endpoints marked in §6 as unused are defined but not called from the app.*

| Endpoint | Main response fields used |
|----------|---------------------------|
| GET /api/posts/popular | items[].id, meta (currentPage, totalPages, totalItems, itemCount) |
| GET /api/tips/posts/{id}/summary | totalTips |
| GET /api/factory | (factory schema) |
| GET /api/trending-tags | items[].tag|name, score|value, source|platform |
| GET /api/topics/name/{name} | posts, post_count |
| GET /api/tokens | items[].sale_address, address, token_name, name, created_at, tx_hash, creator_address |
| GET /api/tokens/{address} | Full TokenDto; SEO: symbol, name, metaInfo.description, logo_url/image_url/logo |
| GET /api/tokens/{address}/performance | past_7d.current_change_percent |
| GET /api/tokens/{address}/holders | items, meta |
| GET /api/transactions | items, meta |
| GET /api/tokens/{address}/score | (unused — see §6) |
| GET /api/tokens/{address}/rankings | items[].sale_address, rank |
| GET /api/accounts/{address}/tokens | items, meta |
| GET /api/accounts/{address}/portfolio/history | [].timestamp, total_value_ae, total_value_usd, total_pnl.* |
| GET /api/accounts | items, meta.currentPage, meta.totalPages |
| GET /api/accounts/{address} | bio, chain_name |
| GET /api/coins/aeternity/rates | All keys (currency → rate, lowercase) |
| GET /api/posts | items, meta; item: id, content, media, created_at, etc. |
| GET /api/profile/{address} | (stubbed) address, profile.*, public_name |
| POST /api/profile/x/attestation | signer, address, x_username, nonce, expiry, message, signature_hex, signature_base64 |
| GET /api/analytics/past-24-hours | (whole object as marketStats) |
| GET /api/accounts/leaderboard | items[].address, chain_name, aum_usd, pnl_usd, roi_pct, mdd_pct, buy_count, sell_count, created_tokens_count, owned_trends_count, portfolio_value_usd_sparkline; meta.* |
