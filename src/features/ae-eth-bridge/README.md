# AE-ETH Bridge Feature

This feature implements the AE-ETH bridge functionality, allowing users to bridge tokens between Aeternity and Ethereum networks.

## Structure

```
src/features/ae-eth-bridge/
├── constants.ts          # Bridge configuration, network settings, and asset definitions
├── types.ts             # TypeScript types and interfaces
├── deployment.json      # Contract ABIs and deployment info
├── hooks/
│   └── useBridge.ts     # Hook for managing bridge state
├── services/
│   ├── aeternity.ts     # Aeternity blockchain utilities
│   └── ethereum.ts      # Ethereum blockchain utilities
├── utils/
│   ├── getTxUrl.ts      # Helper to generate explorer URLs
│   ├── addTokenToEthereumWallet.ts  # Helper to add tokens to MetaMask
│   └── logger.ts        # Logging utility
└── views/
    └── AeEthBridge.tsx  # Main bridge UI component
```

## Features Implemented

✅ **Bi-directional bridging** - Bridge assets from Aeternity to Ethereum and vice versa
✅ **Multiple token support** - Support for ETH, WAE, USDT, USDC, BNB, and more
✅ **Allowance management** - Automatic handling of token allowances
✅ **Transaction tracking** - View transactions on block explorers
✅ **Balance checks** - Validates bridge contract has sufficient funds
✅ **Rate limiting** - 12-hour cooldown between bridge transactions from Aeternity
✅ **TailwindCSS & shadcn/ui** - Modern, accessible UI components
✅ **Toast notifications** - User-friendly transaction feedback
✅ **Success dialog** - Detailed transaction summary after bridging

## Usage

```tsx
import { AeEthBridge } from '@/features/ae-eth-bridge';

function App() {
  return <AeEthBridge />;
}
```

## TODO / Improvements Needed

1. **Ethereum Wallet Connection**
   - Currently uses `window.ethereum` directly
   - Consider integrating with a proper wallet connection library (e.g., RainbowKit, ConnectKit, or @web3modal/ethers)

2. **Balance Display**
   - Show user's current token balances for selected asset
   - Fetch and display balances from both networks

3. **Bridge Contract Status**
   - Implement `isBridgeContractEnabled` check
   - Implement `hasOperatorEnoughBalance` check
   - Show real-time bridge health status

4. **Network Switching**
   - Add network switcher for mainnet/testnet
   - Automatically prompt users to switch to the correct network

5. **Gas Estimation**
   - Show estimated gas fees before transaction
   - Allow users to adjust gas settings

6. **Transaction History**
   - Show user's previous bridge transactions
   - Track pending transactions

7. **Error Handling**
   - Better error messages for common scenarios
   - Retry mechanism for failed transactions

8. **Loading States**
   - Show skeleton loaders while fetching data
   - Better loading indicators during transactions

9. **Input Validation**
   - Min/max amount validation
   - Real-time balance checking
   - Better error states for invalid inputs

10. **Testing**
    - Add unit tests for utilities and hooks
    - Add integration tests for bridge logic
    - Test edge cases and error scenarios

## Key Dependencies

- `@aeternity/aepp-sdk` - For Aeternity blockchain interactions
- `ethers` - For Ethereum blockchain interactions
- `bignumber.js` - For precise decimal calculations
- `react-router-dom` - For navigation
- `@radix-ui/*` - For accessible UI primitives (shadcn/ui)

## Notes

- The bridge uses mainnet by default (configurable in `constants.ts`)
- There's a 12-hour cooldown between bridge transactions from Aeternity
- MetaMask or another Ethereum wallet is required for Ethereum transactions
- Superhero Wallet is required for Aeternity transactions


