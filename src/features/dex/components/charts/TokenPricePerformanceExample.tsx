import React from 'react';
import TokenPricePerformance from './TokenPricePerformance';

// Example usage of the TokenPricePerformance component
export default function TokenPricePerformanceExample() {
  const availableGraphTypes = [
    { type: 'Price', text: 'Price' },
    { type: 'Volume', text: 'Volume' },
    { type: 'TVL', text: 'Total Value Locked' },
    { type: 'Fees', text: 'Fees' },
  ];

  const initialChart = { type: 'Price', text: 'Price' };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Token Price Performance</h2>
      
      <TokenPricePerformance
        availableGraphTypes={availableGraphTypes}
        initialChart={initialChart}
        initialTimeFrame="1D"
        tokenId="ct_example_token_address"
        className="max-w-4xl"
      />
      
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Usage Example:</h3>
        <pre className="text-sm text-green-400 overflow-x-auto">
{`import { TokenPricePerformance } from '@/features/dex/components';

const chartTypes = [
  { type: 'Price', text: 'Price' },
  { type: 'Volume', text: 'Volume' },
  { type: 'TVL', text: 'Total Value Locked' },
];

<TokenPricePerformance
  availableGraphTypes={chartTypes}
  initialChart={{ type: 'Price', text: 'Price' }}
  initialTimeFrame="1D"
  tokenId="your_token_address"
/>`}
        </pre>
      </div>
    </div>
  );
}
