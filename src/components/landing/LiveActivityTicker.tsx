import React from "react";
import { useLatestTransactions } from "@/hooks/useLatestTransactions";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getActionText = (type: string): string => {
  switch (type) {
    case "create":
    case "token_create":
      return "created";
    case "buy":
    case "token_buy":
      return "bought";
    case "sell":
    case "token_sell":
      return "sold";
    default:
      return "traded";
  }
};

const getActionColor = (type: string, isDark: boolean): string => {
  switch (type) {
    case "create":
    case "token_create":
      return "#8B5CF6"; // Purple
    case "buy":
    case "token_buy":
      return "#10B981"; // Green
    case "sell":
    case "token_sell":
      return "#F87171"; // Red
    default:
      return isDark ? "#94A3B8" : "#6B7280"; // Gray
  }
};

export default function LiveActivityTicker() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { latestTransactions } = useLatestTransactions();

  if (!latestTransactions || latestTransactions.length === 0) {
    return (
      <section className={`rounded-xl border p-3 mb-6 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
          <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Loading activity...</span>
        </div>
      </section>
    );
  }

  // Duplicate items for seamless marquee loop
  const tickerItems = [...latestTransactions.slice(0, 15), ...latestTransactions.slice(0, 15)];

  return (
    <section className={`rounded-xl border p-3 mb-6 overflow-hidden ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/80 border-gray-100'}`}>
      <div className="flex items-center gap-4">
        {/* Live Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <div 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: colors.primary }}
            />
            <div 
              className="absolute w-3 h-3 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
          <span className={`font-medium text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Live
          </span>
        </div>

        {/* Ticker */}
        <div className="relative flex-1 overflow-hidden h-6">
          <div className="absolute top-0 left-0 whitespace-nowrap animate-marquee hover:animation-pause flex items-center h-full">
            {tickerItems.map((tx, index) => (
              <span key={`${tx.tx_hash}-${index}`} className="inline-flex items-center mx-3 text-xs">
                <Link 
                  to={`/users/${tx.account}`} 
                  className={`font-medium no-underline ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {formatAddress(tx.account)}
                </Link>
                <span 
                  className="mx-1.5 font-medium"
                  style={{ color: getActionColor(tx.tx_type, isDark) }}
                >
                  {getActionText(tx.tx_type)}
                </span>
                {tx.token && (
                  <Link 
                    to={`/trends/tokens/${tx.token.name}`} 
                    className="font-semibold no-underline hover:opacity-80"
                    style={{ color: colors.primary }}
                  >
                    #{tx.token.name}
                  </Link>
                )}
                <span className={`mx-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
