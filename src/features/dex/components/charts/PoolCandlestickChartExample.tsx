import React from 'react';
import PoolCandlestickChart from './PoolCandlestickChart';

// TODO: remove
export default function PoolCandlestickChartExample() {
  // Example pair address - replace with actual pair address
  const examplePairAddress = 'ct_2AfnEfCSPx4AEoq5g8QCgaAd6fwzBECzQtHKZh2aEwxhMYfWHe';

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Pool Candlestick Chart Example</h2>
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2 text-white">Default Configuration</h3>
        <PoolCandlestickChart
          pairAddress={examplePairAddress}
          height={400}
        />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2 text-white">Compact Version</h3>
        <PoolCandlestickChart
          pairAddress={examplePairAddress}
          height={300}
          className="max-w-4xl"
        />
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2 text-white">Large Version</h3>
        <PoolCandlestickChart
          pairAddress={examplePairAddress}
          height={600}
        />
      </div>
    </div>
  );
}
