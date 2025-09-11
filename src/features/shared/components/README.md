# Shared Components

This directory contains reusable components that can be used across different features of the application.

## Price Formatter Components

### FractionFormatter
A component for displaying fractional prices with proper formatting for large numbers.

**Props:**
- `fractionalPrice: FormattedFractionalPrice` - The formatted price object

### SymbolPriceFormatter
Displays prices with their symbol (e.g., AE) and includes trend indicators.

**Props:**
- `aePrice: Decimal` - The price in AE
- `symbol?: string` - The currency symbol (default: 'AE')
- `priceLoading?: boolean` - Whether the price is loading
- `hideSymbol?: boolean` - Whether to hide the symbol
- `priceJustIncreased?: boolean` - Whether price just increased
- `priceJustDecreased?: boolean` - Whether price just decreased

### FiatPriceFormatter
Displays prices in fiat currency with proper formatting.

**Props:**
- `fiatPrice: Decimal` - The price in fiat currency
- `currencySymbol?: string` - The currency symbol (default: '$')

### PriceFormatter
Main price formatter that combines AE and fiat prices with trend indicators.

**Props:**
- `aePrice: Decimal` - The price in AE
- `fiatPrice: Decimal` - The price in fiat currency
- `symbol?: string` - The currency symbol
- `watchPrice?: boolean` - Whether to watch for price changes
- `watchKey?: string` - Key for watching specific price updates
- `priceLoading?: boolean` - Whether the price is loading
- `hideFiatPrice?: boolean` - Whether to hide fiat price
- `hideSymbol?: boolean` - Whether to hide the symbol
- `row?: boolean` - Whether to display in row layout

### LivePriceFormatter
A live price formatter that automatically converts AE to fiat and watches for changes.

**Props:**
- `aePrice: Decimal` - The price in AE
- `fiatPrice?: Decimal` - Optional fiat price (will be calculated if not provided)
- `symbol?: string` - The currency symbol
- `watchPrice?: boolean` - Whether to watch for price changes
- `watchKey?: string` - Key for watching specific price updates
- `priceLoading?: boolean` - Whether the price is loading
- `hideFiatPrice?: boolean` - Whether to hide fiat price
- `hideSymbol?: boolean` - Whether to hide the symbol
- `row?: boolean` - Whether to display in row layout

## Usage

```tsx
import { LivePriceFormatter } from '../../features/shared/components';

// Basic usage
<LivePriceFormatter aePrice={Decimal.from(1.5)} />

// With custom options
<LivePriceFormatter 
  aePrice={Decimal.from(1.5)}
  watchKey="token-address"
  hideFiatPrice={false}
  row={true}
/>
```
