import React from "react";
import { useNavigate } from "react-router-dom";
import { BuyAeWidget } from "../../ae-eth-buy";
import RecentActivity from "../../../components/dex/supporting/RecentActivity";
import { ShoppingCart, X } from "lucide-react";

//
export default function DexBridge() {
  const navigate = useNavigate();
  return (
    <div className="w-full pb-4 md:pb-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-normal sm:tracking-normal" style={{ background: 'none', backgroundImage: 'none', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset', letterSpacing: 'normal' }}>Buy AE</h1>
              <p className="text-xs text-white/60">Buy AE tokens with Ethereum</p>
            </div>
          </div>
          <div className="flex items-center h-[52px] justify-end">
            <button
              onClick={() => navigate('/apps')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer text-xs font-semibold text-white/80 hover:text-white"
              aria-label="More mini apps"
            >
              More mini apps
            </button>
          </div>
        </div>
      </div>
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl w-full max-w-full" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        {/* Browser Window Header */}
        <div 
          className="flex items-center justify-between border-b border-white/10 px-3 py-2"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">MINI APP</div>
          <button
            onClick={() => navigate('/apps')}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>
        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 w-full max-w-full overflow-x-hidden">
          <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))' }}>
            {/* Buy AE Widget */}
            <div className="min-w-0 w-full">
              <BuyAeWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
