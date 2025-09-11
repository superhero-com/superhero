import React from 'react';

import { useDex } from '../../hooks';

export default function DexSettings() {
  const { slippagePct: slippage, deadlineMins: deadline, setSlippage, setDeadline } = useDex();
  
  return (
    <div className="grid gap-2 border border-white/20 p-3 rounded-lg bg-[#1a1a23]">
      <div className="flex gap-2 items-center">
        <label htmlFor="dex-slippage" className="text-sm text-white">Slippage %</label>
        <input
          id="dex-slippage"
          type="number"
          min={0}
          max={50}
          step={0.1}
          value={slippage}
          onChange={(e) => setSlippage(Math.min(50, Math.max(0, Number(e.target.value || 0))))}
          className="w-[100px] py-1.5 px-2 rounded-lg bg-[#111] text-white border border-white/20 text-sm focus:outline-none focus:border-[#4ecdc4]"
        />
      </div>
      <div className="flex gap-2 items-center">
        <label htmlFor="dex-deadline" className="text-sm text-white">Deadline (min)</label>
        <input
          id="dex-deadline"
          type="number"
          min={1}
          max={60}
          step={1}
          value={deadline}
          onChange={(e) => setDeadline(Math.min(60, Math.max(1, Number(e.target.value || 10))))}
          className="w-[100px] py-1.5 px-2 rounded-lg bg-[#111] text-white border border-white/20 text-sm focus:outline-none focus:border-[#4ecdc4]"
        />
      </div>
    </div>
  );
}


