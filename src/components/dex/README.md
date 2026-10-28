# DEX Components

Swap UI pieces, hooks and helpers used by the DEX pages. There is no barrel file:
import each module by its path.

## Directory Structure

```
src/components/dex/
├── DexTabs.tsx                 # Swap / Pool / Explore tabs
├── core/                       # Swap form and its parts
│   ├── SwapForm.tsx            # Main swap interface
│   ├── SwapAmountField.tsx     # Amount input with its token selector
│   ├── TokenSelector.tsx       # Token picker with search and imported tokens
│   ├── SwapInlineSettings.tsx  # Slippage and deadline settings
│   ├── SlippageWarning.tsx     # Warning for a risky slippage setting
│   ├── SwapInfoDisplay.tsx     # Rate, minimum received, price impact and route
│   ├── SwapRouteInfo.tsx       # Route and reserves
│   └── SwapConfirmation.tsx    # Confirmation modal
├── supporting/
│   ├── RecentActivity.tsx      # Recent DEX transactions
│   └── recentActivityData.ts   # Status and amount helpers for RecentActivity
├── hooks/
│   ├── useTokenList.ts         # DEX token list, paged from the API
│   ├── useTokenSearch.ts       # Search DEX and on-chain AEX9 tokens
│   ├── useCustomTokens.ts      # Tokens the user imported
│   ├── useTokenBalances.ts     # Balances of the two selected tokens
│   ├── useSwapQuote.ts         # Quote fetching with debouncing
│   └── useSwapExecution.ts     # Swap execution and approvals
├── utils/
│   ├── tokenList.ts            # Actively-traded filter and list merging
│   └── slippage.ts             # Slippage warning thresholds
└── types/
    └── dex.ts                  # Shared DEX types
```

The AE ↔ WAE widget lives in `src/features/dex/WrapUnwrapWidget.tsx`.

## Usage

```tsx
import SwapForm from '@/components/dex/core/SwapForm';
import { useTokenList } from '@/components/dex/hooks/useTokenList';
```
