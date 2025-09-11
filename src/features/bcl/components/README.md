# BCL Components

This directory contains components specific to the Bonding Curve Liquidity (BCL) feature.

## TokenSummary

A comprehensive component for displaying token information including price, market cap, supply, and contract details.

### Features
- **Live Price Display**: Shows current token price with trend indicators
- **Market Cap**: Displays market capitalization with proper formatting
- **Token Supply**: Shows total supply with shortened notation for large numbers
- **Contract Information**: Displays contract and sale addresses
- **DAO Integration**: Shows DAO balance if available
- **Action Buttons**: Links to DAO, invite system, and blockchain explorer

### Props
```tsx
interface TokenSummaryProps {
  token: {
    name?: string;
    symbol?: string;
    price?: number | string;
    market_cap?: number | string;
    total_supply?: number | string;
    decimals?: number;
    holders_count?: number;
    address?: string;
    contract_address?: string;
    sale_address?: string;
    created_at?: string;
    dao_balance?: number | string;
  };
  holders?: any[];
  className?: string;
}
```

### Usage

```tsx
import { TokenSummary } from '../../features/bcl/components';

// Basic usage
<TokenSummary token={tokenData} />

// With holders data
<TokenSummary token={tokenData} holders={holdersList} />

// With custom styling
<TokenSummary 
  token={tokenData} 
  holders={holdersList}
  className="custom-class"
/>
```

### Design Features
- **Glassmorphism Styling**: Consistent with the app's design system
- **Responsive Layout**: Adapts to different screen sizes
- **Live Updates**: Prices update in real-time with visual indicators
- **Accessibility**: Proper contrast and readable typography
- **Interactive Elements**: Hover effects and smooth transitions

### Integration
The TokenSummary component integrates with:
- Live price formatters for real-time price updates
- Decimal library for precise number handling
- WebSocket connections for live data updates
- External services (æScan, DAO system)
