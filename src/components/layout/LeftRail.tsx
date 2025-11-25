import React from "react";
import { useAeSdk, useWalletConnect } from "../../hooks";
import SwapForm from "../dex/core/SwapForm";
import AeButton from "../AeButton";
import { IconWallet } from "../../icons";

export default function LeftRail() {
  const { activeAccount } = useAeSdk();
  const { connectWallet } = useWalletConnect();

  return (
    <div className="grid gap-4 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-to-pink-500/80">
      
      {/* Connect Wallet Card - Only show if not connected */}
      {!activeAccount && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[24px] p-6 text-center shadow-lg backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 transform group-hover:scale-110 transition-transform duration-300">
              <IconWallet className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              Connect Wallet
            </h3>
            
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Access your assets and start trading on Superhero.
            </p>
            
            <AeButton
              variant="primary"
              onClick={connectWallet}
              className="w-full py-3 font-bold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              Connect Now
            </AeButton>
          </div>
        </div>
      )}

      {/* Swap Widget */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[24px] overflow-hidden shadow-lg backdrop-blur-md">
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
      </div>
    </div>
  );
}
