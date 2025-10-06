# Trendminer Feature

This feature contains all trending (wordcraft) related logic and components that have been migrated from Vue/Vuetify to React/Tailwind CSS.

## Components

### TokenTradeCard
- **Location**: `src/features/trending/components/TokenTradeCard.tsx`
- **Migrated from**: `external/wordcraft/src/components/Tokens/TokenTradeCard.vue`
- **Description**: A trading interface for buying/selling tokens with bonding curve mechanics

#### Features:
- Buy/Sell toggle interface
- Token amount input with real-time calculations
- Price impact display
- Slippage tolerance settings
- Transaction confirmation
- Success/error message handling
- Protocol DAO reward calculation

### TradeTokenInput
- **Location**: `src/features/trending/components/TradeTokenInput.tsx`
- **Migrated from**: `external/wordcraft/src/components/Forms/TradeTokenInput.vue`
- **Description**: Dual input component for token trading with swap functionality

#### Features:
- Dual asset input fields
- Toggle button to switch buy/sell direction
- Balance display and max button integration
- Insufficient balance warnings
- Focus management for input fields

### AssetInput
- **Location**: `src/features/trending/components/AssetInput.tsx`
- **Migrated from**: `external/wordcraft/src/components/Forms/AssetInput.vue`
- **Description**: Individual asset input field with balance and currency features

#### Features:
- Decimal number input with validation
- Token symbol display
- Balance display (AE or token balance)
- Max button for quick balance input
- Error message display
- Fiat price display for AE
- Focus and ref management

## Hooks

### useTokenTrade
- **Location**: `src/features/trending/hooks/useTokenTrade.ts`
- **Migrated from**: `external/wordcraft/src/composables/useTokenTrade.ts` and `external/wordcraft/src/stores/tokenTradeStore.ts`
- **Description**: Manages token trading state and business logic

#### Features:
- Token trade state management
- Price calculations and bonding curve integration
- Transaction handling
- Error management
- Form state management

## Types

### TokenDto, TokenTradeState, TradeCalculation
- **Location**: `src/features/trending/types/index.ts`
- **Description**: TypeScript interfaces for token trading functionality

## Migration Notes

The migration from Vue to React involved:

1. **Store → Hook conversion**: Vue Pinia store (`tokenTradeStore`) was converted to a React hook (`useTokenTrade`)
2. **Composable → Hook**: Vue composable (`useTokenTrade`) was merged into the React hook
3. **Template → JSX**: Vue template syntax was converted to React JSX
4. **Vuetify → Tailwind**: UI components were migrated from Vuetify to Tailwind CSS with shadcn/ui
5. **Reactivity**: Vue's reactive system was replaced with React's useState and useCallback

## Usage

```tsx
import { TokenTradeCard } from '../../features/trending';

function MyComponent() {
  const token = {
    sale_address: '0x...',
    symbol: 'TOKEN',
    // ... other token properties
  };

  return <TokenTradeCard token={token} onClose={() => {}} />;
}
```
