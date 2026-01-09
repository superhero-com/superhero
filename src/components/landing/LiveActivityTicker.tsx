import React from "react";
import { useLatestTransactions } from "@/hooks/useLatestTransactions";
import { useSectionTheme } from "../layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";

/**
 * LiveActivityTicker - Swiss Minimal Design
 * - Clean, no rounded corners
 * - 1px borders
 * - Minimal color palette
 */

const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getActionText = (type: string): string => {
  switch (type) {
    case "create":
    case "token_create":
      return "CREATED";
    case "buy":
    case "token_buy":
      return "BOUGHT";
    case "sell":
    case "token_sell":
      return "SOLD";
    default:
      return "TRADED";
  }
};

const getActionColor = (type: string): string => {
  switch (type) {
    case "create":
    case "token_create":
      return "#EF4444"; // Swiss Red for create
    case "buy":
    case "token_buy":
      return "#22C55E"; // Green for buy
    case "sell":
    case "token_sell":
      return "#F87171"; // Lighter red for sell
    default:
      return "#78716C"; // Warm neutral gray
  }
};

export default function LiveActivityTicker() {
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { latestTransactions } = useLatestTransactions();

  // Swiss colors - Red accent with black background
  const textPrimary = '#FFFFFF'; // Always white on black bg
  const textSecondary = '#A8A29E'; // Always light gray on black bg
  const borderColor = isDark ? '#292524' : '#27272A';
  const bgColor = '#000000'; // Black background
  const accent = '#EF4444'; // Swiss Red

  if (!latestTransactions || latestTransactions.length === 0) {
    return (
      <section 
        className="p-4 mb-6"
        style={{ 
          background: bgColor,
          borderTop: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-1.5 h-1.5 animate-pulse"
            style={{ background: textSecondary }}
          />
          <span 
            className="text-xs uppercase tracking-wider"
            style={{ color: textSecondary }}
          >
            Loading activity...
          </span>
        </div>
      </section>
    );
  }

  // Duplicate items for seamless marquee loop
  const tickerItems = [...latestTransactions.slice(0, 15), ...latestTransactions.slice(0, 15)];

  return (
    <section 
      className="py-3 px-4 mb-6 overflow-hidden"
      style={{ 
        background: bgColor,
        borderTop: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Live Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <div 
              className="w-1.5 h-1.5 animate-pulse"
              style={{ backgroundColor: accent }}
            />
          </div>
          <span 
            className="font-medium text-[10px] uppercase tracking-widest"
            style={{ color: accent }}
          >
            Live
          </span>
        </div>

        {/* Divider */}
        <div 
          className="w-px h-4"
          style={{ background: borderColor }}
        />

        {/* Ticker */}
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute top-0 left-0 whitespace-nowrap animate-marquee hover:animation-pause flex items-center h-full">
            {tickerItems.map((tx, index) => (
              <span key={`${tx.tx_hash}-${index}`} className="inline-flex items-center mx-4 text-xs">
                <Link 
                  to={`/users/${tx.account}`} 
                  className="font-medium no-underline no-gradient-text transition-colors"
                  style={{ color: textSecondary }}
                  onMouseOver={(e) => e.currentTarget.style.color = textPrimary}
                  onMouseOut={(e) => e.currentTarget.style.color = textSecondary}
                >
                  {formatAddress(tx.account)}
                </Link>
                <span 
                  className="mx-2 font-semibold text-[10px] uppercase tracking-wider"
                  style={{ color: getActionColor(tx.tx_type) }}
                >
                  {getActionText(tx.tx_type)}
                </span>
                {tx.token && (
                  <Link 
                    to={`/trends/tokens/${tx.token.name}`} 
                    className="font-semibold no-underline no-gradient-text transition-colors"
                    style={{ color: textPrimary }}
                    onMouseOver={(e) => e.currentTarget.style.color = accent}
                    onMouseOut={(e) => e.currentTarget.style.color = textPrimary}
                  >
                    #{tx.token.name}
                  </Link>
                )}
                <span 
                  className="mx-4 text-[10px]"
                  style={{ color: borderColor }}
                >
                  —
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
