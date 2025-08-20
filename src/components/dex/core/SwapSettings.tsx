import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store/store';
import { setSlippage } from '../../../store/slices/dexSlice';

interface SwapSettingsProps {
  show: boolean;
  onToggle: () => void;
}

export default function SwapSettings({ show, onToggle }: SwapSettingsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const slippagePct = useSelector((s: RootState) => s.dex.slippagePct);
  const deadlineMins = useSelector((s: RootState) => s.dex.deadlineMins);

  if (!show) return null;

  return (
    <div style={{ 
      padding: '12px', 
      background: '#1a1a23', 
      borderRadius: 8, 
      border: '1px solid #3a3a4a',
      marginTop: '8px'
    }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Slippage tolerance:</label>
          <input
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={slippagePct}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 50) {
                dispatch(setSlippage(value));
              }
            }}
            style={{ 
              width: 60, 
              padding: '4px 8px', 
              borderRadius: 6, 
              background: '#14141c', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              fontSize: 12
            }}
          />
          <span style={{ fontSize: 12, opacity: 0.85 }}>%</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Transaction deadline:</label>
          <input
            type="number"
            min="1"
            max="60"
            step="1"
            value={deadlineMins}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 1 && value <= 60) {
                // Note: This would need to be added to the dex slice
                // dispatch(setDeadline(value));
              }
            }}
            style={{ 
              width: 60, 
              padding: '4px 8px', 
              borderRadius: 6, 
              background: '#14141c', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              fontSize: 12
            }}
          />
          <span style={{ fontSize: 12, opacity: 0.85 }}>minutes</span>
        </div>
      </div>
    </div>
  );
}
