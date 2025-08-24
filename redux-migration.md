# Redux to React Hooks Migration Guide

## Overview
This document outlines the complete migration from Redux Toolkit to modern React custom hooks and Jotai for the Superhero project. The migration maintains all existing functionality while modernizing the state management architecture.

## Current Redux Architecture Analysis

### Redux Store Structure
The current Redux store consists of 7 slices:

1. **rootSlice** - Core application state
2. **aeternitySlice** - Blockchain SDK and wallet management
3. **backendSlice** - API data and backend interactions
4. **dexSlice** - DEX-specific state (slippage, liquidity, pool info)
5. **modalsSlice** - Modal management
6. **governanceSlice** - Governance voting and polls
7. **txQueueSlice** - Transaction queue management

### State Persistence
- Uses localStorage with key `'sh-react:state'`
- Persists: selectedCurrency, address, balance, tokenBalances, tokenPrices, cookiesConsent
- Cross-tab synchronization for address changes

### Async Actions
The Redux store uses createAsyncThunk for:
- Wallet initialization and scanning
- Balance refresh
- Backend API calls
- DEX operations
- Governance actions

## Migration Strategy

### 1. Replace Redux with Custom Hooks + Jotai

#### Core State Management
- **Local component state**: `useState` for component-specific state
- **Shared reactive state**: Jotai atoms for cross-component state
- **Async operations**: Custom hooks with React Query for data fetching
- **Persistence**: Custom localStorage hooks with Jotai persistence

#### Architecture Benefits
- **Reduced boilerplate**: No more actions, reducers, or store setup
- **Better TypeScript**: Direct type inference without store typing
- **Improved performance**: Component-level subscriptions instead of global store
- **Simpler testing**: Mock individual hooks instead of entire store
- **Modern patterns**: Leverages React 18+ features

### 2. State Migration Mapping

#### rootSlice → useWallet + useApp hooks
```typescript
// Before: Redux slice
const rootSlice = createSlice({
  name: 'root',
  initialState: { address: null, balance: 0, ... },
  reducers: { setAddress, updateBalance, ... }
});

// After: Custom hooks + Jotai atoms
const addressAtom = atom<string | null>(null);
const balanceAtom = atom<string | number>(0);

export const useWallet = () => {
  const [address, setAddress] = useAtom(addressAtom);
  const [balance, setBalance] = useAtom(balanceAtom);
  // ... hook logic
};
```

#### aeternitySlice → useAeternity hook
- SDK initialization and wallet scanning
- Blockchain operations
- Balance refresh
- Logout functionality

#### backendSlice → useBackend + React Query
- API calls converted to React Query
- Tips and comments management
- Stats and prices

#### dexSlice → useDex hook
- DEX settings (slippage, deadline)
- Liquidity positions
- Pool information

#### modalsSlice → useModal hook
- Modal state management
- Open/close functionality

#### governanceSlice → useGovernance hook + React Query
- Polls and voting
- Delegation management
- Comments

#### txQueueSlice → useTxQueue hook
- Transaction queue management

### 3. Component Migration

#### Files Using Redux (52 total)
All components using `useSelector` and `useDispatch` will be migrated to use the new custom hooks.

Key files:
- `src/App.tsx` - Main app setup
- `src/main.tsx` - Provider setup
- `src/components/layout/WalletCard.tsx` - Wallet UI
- `src/views/Governance.tsx` - Governance interface
- `src/components/dex/` - DEX components
- `src/views/Pool.tsx` - Pool management

### 4. Persistence Strategy

#### Before: Redux persist
```typescript
export function saveState(state: RootState) {
  const subset = {
    root: {
      selectedCurrency: state.root.selectedCurrency,
      address: state.root.address,
      // ...
    },
  };
  localStorage.setItem(KEY, JSON.stringify(subset));
}
```

#### After: Jotai persistence
```typescript
const persistedAddressAtom = atomWithStorage('wallet:address', null);
const persistedBalanceAtom = atomWithStorage('wallet:balance', 0);
```

### 5. Cross-tab Synchronization
- Replace Redux cross-tab sync with Jotai's built-in storage synchronization
- Maintain address change broadcasting

## Implementation Plan

### Phase 1: Setup New Architecture
1. Install Jotai
2. Create atoms for core state
3. Implement custom hooks
4. Setup persistence

### Phase 2: Migrate Core Features
1. Wallet management (useWallet)
2. Aeternity SDK (useAeternity)
3. Modal system (useModal)

### Phase 3: Migrate Complex Features
1. DEX functionality (useDex)
2. Backend API integration (useBackend + React Query)
3. Governance system (useGovernance)

### Phase 4: Component Migration
1. Update all components to use new hooks
2. Remove Redux imports
3. Update test files

### Phase 5: Cleanup
1. Remove Redux dependencies
2. Delete Redux files
3. Update build configuration

## Dependencies

### Add
- `jotai` - Atomic state management
- `jotai-devtools` - Development tools (optional)

### Remove
- `@reduxjs/toolkit`
- `react-redux`

### Keep
- `@tanstack/react-query` - Already used for API calls
- `zustand` - May be used for specific use cases

## Testing Strategy

### Unit Tests
- Test custom hooks in isolation
- Mock Jotai atoms for component tests
- Verify persistence behavior

### Integration Tests
- Test cross-component state sharing
- Verify async operations
- Test persistence and hydration

### Migration Verification
- Ensure all features work identically
- Performance comparison
- Bundle size analysis

## Risk Mitigation

### Backwards Compatibility
- Implement feature flags for gradual rollout
- Maintain Redux alongside new system during transition
- Comprehensive testing before removal

### Data Migration
- Migrate existing localStorage data to new format
- Handle missing or corrupted data gracefully
- Provide fallbacks for edge cases

## Success Criteria

1. **Functionality**: All existing features work identically
2. **Performance**: No performance regressions
3. **Bundle Size**: Reduced bundle size from removing Redux
4. **Developer Experience**: Improved DX with simpler state management
5. **Type Safety**: Better TypeScript integration
6. **Maintainability**: Cleaner, more modular code

## Post-Migration Benefits

1. **Reduced Complexity**: Simpler state management patterns
2. **Better Performance**: Granular subscriptions and updates
3. **Improved DX**: Less boilerplate, better TypeScript support
4. **Modern Architecture**: Leverages latest React patterns
5. **Easier Testing**: Component-level state testing
6. **Smaller Bundle**: Removal of Redux dependencies

## File Structure After Migration

```
src/
├── hooks/
│   ├── useWallet.ts
│   ├── useAeternity.ts
│   ├── useBackend.ts
│   ├── useDex.ts
│   ├── useModal.ts
│   ├── useGovernance.ts
│   └── useTxQueue.ts
├── atoms/
│   ├── walletAtoms.ts
│   ├── appAtoms.ts
│   ├── dexAtoms.ts
│   └── modalAtoms.ts
├── utils/
│   ├── storage.ts
│   └── persistence.ts
└── components/ (updated to use hooks)
```

This migration will modernize the codebase while maintaining all existing functionality and improving developer experience.
