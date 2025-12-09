import React from "react";
import { useAeSdk } from "../../hooks";
import SwapForm from "../dex/core/SwapForm";
import { BuyAeWidget } from "../../features/ae-eth-buy";
import { GlassSurface } from "../ui/GlassSurface";

export default function RightRail() {
  return (
    <div className="grid gap-3 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-to-pink-500/80">
      {/* Swap Widget */}
      <GlassSurface className="overflow-hidden" interactive>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⇄</span>
            <h3 className="text-base font-bold text-white">Swap</h3>
          </div>
          <a 
            href="/defi/swap" 
            className="text-xs text-white/40 hover:text-white transition-colors"
            title="Open in full screen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
        <div className="p-4">
          <SwapForm embedded />
        </div>
      </GlassSurface>

      {/* Buy AE with ETH widget */}
      <GlassSurface className="p-4" interactive>
        <BuyAeWidget embedded={true} />
      </GlassSurface>
    </div>
  );
}
