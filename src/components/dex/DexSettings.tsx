import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { setDeadline, setSlippage } from '../../store/slices/dexSlice';

export default function DexSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const slippage = useSelector((s: RootState) => s.dex.slippagePct);
  const deadline = useSelector((s: RootState) => s.dex.deadlineMins);
  return (
    <div className="settings" style={{ display: 'grid', gap: 8, border: '1px solid #3a3a4a', padding: 12, borderRadius: 8, background: '#1a1a23' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label htmlFor="dex-slippage">Slippage %</label>
        <input
          id="dex-slippage"
          type="number"
          min={0}
          max={50}
          step={0.1}
          value={slippage}
          onChange={(e) => dispatch(setSlippage(Math.min(50, Math.max(0, Number(e.target.value) || 0))))}
          style={{ width: 100, padding: '6px 8px', borderRadius: 8, background: '#111', color: 'white', border: '1px solid #3a3a4a' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label htmlFor="dex-deadline">Deadline (min)</label>
        <input
          id="dex-deadline"
          type="number"
          min={1}
          max={60}
          step={1}
          value={deadline}
          onChange={(e) => dispatch(setDeadline(Math.min(60, Math.max(1, Number(e.target.value) || 10))))}
          style={{ width: 100, padding: '6px 8px', borderRadius: 8, background: '#111', color: 'white', border: '1px solid #3a3a4a' }}
        />
      </div>
    </div>
  );
}


