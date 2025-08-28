import React from 'react';
import './DexViews.scss';
import { EthBridgeWidget } from '../../bridge';

// For now, we'll use the existing Swap component as a placeholder for the bridge
// This can be replaced with a proper ETH bridge component later
export default function DexBridge() {
  return (
    <div className="dex-bridge-container">
      {/* Main Content */}
      <EthBridgeWidget />
    </div>
  );
}
