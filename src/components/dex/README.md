# DEX Component Refactoring

This directory contains the refactored DEX components, breaking down the original monolithic `Dex.tsx` (1335 lines) into focused, reusable components.

## Architecture

### Directory Structure

```
src/components/dex/
├── core/                    # Core swap functionality
│   ├── SwapForm.tsx        # Main swap interface
│   ├── TokenInput.tsx      # Token input with amount
│   ├── TokenSelector.tsx   # Token selection dropdown
│   ├── SwapSettings.tsx    # Slippage and deadline settings
│   ├── SwapRouteInfo.tsx   # Route display and reserves
│   └── SwapConfirmation.tsx # Confirmation modal
├── widgets/                 # Specialized functionality
│   ├── WrapUnwrapWidget.tsx # AE ↔ WAE conversion
│   ├── EthxitWidget.tsx    # aeETH → AE conversion
│   └── EthBridgeWidget.tsx # ETH → AE bridge + swap
├── supporting/              # Supporting components
│   └── RecentActivity.tsx  # Transaction history
├── hooks/                   # Custom hooks
│   ├── useTokenList.ts     # Token list management
│   ├── useTokenBalances.ts # Balance fetching
│   ├── useSwapQuote.ts     # Quote fetching with debouncing
│   └── useSwapExecution.ts # Swap execution and approvals
├── types/                   # TypeScript types
│   └── dex.ts              # All DEX-related types
└── index.ts                # Component exports
```

## Components

### Core Components

#### `SwapForm.tsx`
- Main swap interface orchestrating all swap functionality
- Manages token selection, amounts, and swap execution
- Integrates with all hooks and sub-components

#### `TokenInput.tsx`
- Combines token selector and amount input
- Handles amount validation and formatting
- Displays token balances

#### `TokenSelector.tsx`
- Enhanced token selection with search functionality
- Filters and excludes selected tokens
- Modal/dropdown interface

#### `SwapSettings.tsx`
- Slippage tolerance configuration
- Transaction deadline settings
- Price impact display

#### `SwapRouteInfo.tsx`
- Displays swap route information
- Shows reserves and liquidity data
- Route visualization

#### `SwapConfirmation.tsx`
- Confirmation modal with swap details
- Price impact warnings
- Transaction parameters display

### Widget Components

#### `WrapUnwrapWidget.tsx`
- AE ↔ WAE conversion interface
- Balance display and amount input
- Wrap/unwrap functionality

#### `EthxitWidget.tsx`
- aeETH → AE conversion
- Automated quoting
- Bridge information and hints

#### `EthBridgeWidget.tsx`
- ETH → AE bridge + swap flow
- Multi-step process handling
- Status tracking and error handling

### Supporting Components

#### `RecentActivity.tsx`
- Displays recent transactions
- Explorer links
- Transaction status

## Hooks

### `useTokenList.ts`
- Manages token list fetching and caching
- Handles deduplication and error fallbacks
- Provides loading states

### `useTokenBalances.ts`
- Fetches and manages token balances
- Real-time balance updates
- AE/WAE balance management

### `useSwapQuote.ts`
- Quote fetching with debouncing
- Route discovery and path building
- Price impact calculation
- Error handling

### `useSwapExecution.ts`
- Swap transaction execution
- Token approval handling
- Transaction status management
- Error handling and user feedback

## Types

### `dex.ts`
Contains all TypeScript interfaces:
- `Token` - Token information
- `SwapState` - Swap form state
- `SwapQuoteParams` - Quote parameters
- `SwapExecutionParams` - Execution parameters
- `RouteInfo` - Route information
- And more...

## Benefits of Refactoring

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Components can be used in different contexts
3. **Testability**: Smaller components are easier to test
4. **Performance**: Better code splitting and lazy loading
5. **Developer Experience**: Easier to understand and modify
6. **Type Safety**: Comprehensive TypeScript types

## Usage

### Basic Usage
```tsx
import { SwapForm, WrapUnwrapWidget } from '../components/dex';

function MyDexPage() {
  return (
    <div>
      <SwapForm />
      <WrapUnwrapWidget />
    </div>
  );
}
```

### Advanced Usage with Hooks
```tsx
import { useTokenList, useSwapQuote } from '../components/dex';

function CustomSwap() {
  const { tokens, loading } = useTokenList();
  const { quoteLoading, error, routeInfo } = useSwapQuote();
  
  // Custom implementation
}
```

## Migration Notes

- The original `Dex.tsx` has been preserved as `Dex.tsx`
- The new refactored version is `DexRefactored.tsx`
- All functionality has been preserved
- Components are backward compatible
- Hooks can be used independently

## Future Improvements

1. Add comprehensive unit tests
2. Implement error boundaries
3. Add loading skeletons
4. Improve accessibility
5. Add more widget components
6. Implement advanced routing features
