import React from 'react';
import { WrapUnwrapWidget } from '../WrapUnwrapWidget';
import './DexViews.scss';

export default function DexWrap() {
  return (
    <div className="dex-wrap-container">
      {/* Main Content */}
      <div className="dex-wrap-content">
        <WrapUnwrapWidget />
      </div>
    </div>
  );
}
