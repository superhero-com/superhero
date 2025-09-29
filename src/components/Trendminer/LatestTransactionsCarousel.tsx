import React, { useEffect, useRef, useState, useCallback } from "react";
import AddressChip from "../AddressChip";
import {
  useLatestTransactions,
} from "@/hooks/useLatestTransactions";
import { TX_FUNCTIONS } from "@/utils/constants";
import { Decimal } from "@/libs/decimal";
import { AddressAvatarWithChainName } from "@/@components/Address/AddressAvatarWithChainName";
import { Avatar } from "../ui/avatar";
import AddressAvatar from "../AddressAvatar";

export default function LatestTransactionsCarousel() {
  const { latestTransactions } = useLatestTransactions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(4); // Number of items visible at once
  const [gapSize, setGapSize] = useState(8); // Gap size in pixels
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);


  // Responsive breakpoints - aligned with Vue component
  const updateItemsToShow = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1680) setItemsToShow(7); // Match Vue: 7 items
    else if (width >= 1280) setItemsToShow(5);
    else if (width >= 900) setItemsToShow(4);
    else if (width >= 700) setItemsToShow(3);
    else setItemsToShow(2);

    // Set gap size based on screen size
    if (width >= 640) setGapSize(8);
    else setGapSize(4);
  }, []);

  // Simple continuous autoplay - aligned with Vue component behavior
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (!isHovered && latestTransactions.length > itemsToShow) {
      autoplayRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const maxIndex = latestTransactions.length - itemsToShow;
          return prev >= maxIndex ? 0 : prev + 1;
        });
      }, 2000); // Match Vue's 2000ms autoplay
    }
  }, [isHovered, latestTransactions.length, itemsToShow]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  // Data fetching is now handled by useLatestTransactions hook

  // Handle responsive breakpoints
  useEffect(() => {
    updateItemsToShow();
    const handleResize = () => updateItemsToShow();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateItemsToShow]);

  // Handle autoplay
  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  // Reset current index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [latestTransactions.length]);

  if (!latestTransactions.length) {
    // Show loading state with improved styling
    return (
      <div className="w-full overflow-hidden mb-4">
        <div className="relative w-full">
          <div className="flex">
            {[...Array(itemsToShow)].map((_, i) => (
              <div
                key={i}
                className="mr-2 flex-shrink-0 border border-white/10 rounded-[20px] overflow-hidden opacity-60 animate-pulse shadow-lg"
                style={{
                  minWidth: "200px",
                  width: "200px",
                  background: "linear-gradient(135deg, rgba(107,114,128,0.08), rgba(75,85,99,0.12))"
                }}
              >
                <div className="p-2">
                  {/* Address Avatar & Address - First Row */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-400/20 rounded-full"></div>
                      <div className="text-[12px] text-transparent bg-gray-400/20 rounded">
                        ak_••••••••••••••••
                      </div>
                    </div>
                  </div>

                  {/* Token Name - Second Row */}
                  <div className="mb-2">
                    <div className="text-[16px] sm:text-[15px] text-transparent bg-gray-400/20 rounded">
                      Loading token name...
                    </div>
                  </div>
                  
                  {/* Transaction Type and Volume - Third Row */}
                  <div className="flex flex-row-reverse items-center justify-between gap-2">
                    <div className="text-[13px] text-transparent bg-gray-400/20 rounded">
                      •••
                    </div>
                    <div className="px-2.5 py-1 rounded-md bg-gray-400/20 text-transparent text-[9px]">
                      LOADING
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Transaction type mapping aligned with Vue component
  function getTransactionType(type: string) {
    switch (type) {
      case TX_FUNCTIONS.sell:
        return 'sold';
      case TX_FUNCTIONS.buy:
        return 'bought';
      case TX_FUNCTIONS.create_community:
        return 'created';
      default:
        return '';
    }
  }

  function getTransactionColor(type: string) {
    switch (type) {
      case TX_FUNCTIONS.sell:
        return 'error';
      case TX_FUNCTIONS.buy:
        return 'success';
      case TX_FUNCTIONS.create_community:
        return 'warning';
      default:
        return '';
    }
  }

  function getColorValues(colorType: string): {
    color: string;
    bg: string;
    border: string;
    cardBg: string;
    textGradient: string;
  } {
    switch (colorType) {
      case 'error':
        return {
          color: "#ef4444", // error/red
          bg: "rgba(239,68,68,0.15)",
          border: "rgba(239,68,68,0.35)",
          cardBg: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.12))",
          textGradient: "bg-gradient-to-r from-red-400 via-red-500 to-red-600",
        };
      case 'success':
        return {
          color: "#22c55e", // success/green
          bg: "rgba(34,197,94,0.15)",
          border: "rgba(34,197,94,0.35)",
          cardBg: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(21,128,61,0.12))",
          textGradient: "bg-gradient-to-r from-green-400 via-green-500 to-emerald-600",
        };
      case 'warning':
        return {
          color: "#f59e0b", // warning/orange
          bg: "rgba(245,158,11,0.15)",
          border: "rgba(245,158,11,0.35)",
          cardBg: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.12))",
          textGradient: "bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-600",
        };
      default:
        return {
          color: "#6b7280",
          bg: "rgba(107,114,128,0.15)",
          border: "rgba(107,114,128,0.35)",
          cardBg: "linear-gradient(135deg, rgba(107,114,128,0.08), rgba(75,85,99,0.12))",
          textGradient: "bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600",
        };
    }
  }

  function normalizeType(tx: any): {
    label: string;
    color: string;
    bg: string;
    border: string;
    cardBg: string;
    textGradient: string;
  } {
    const txType = String(
      tx?.type ||
      tx?.tx_type ||
      tx?.txType ||
      tx?.action ||
      tx?.function ||
      tx?.fn ||
      ""
    ).toLowerCase();

    const label = getTransactionType(txType);
    const colorType = getTransactionColor(txType);
    const colors = getColorValues(colorType);

    return {
      label: label.toUpperCase() || 'TX',
      ...colors,
    };
  }

  const renderItem = (item: any, index: number) => {
    const type = normalizeType(item);
    const tokenName =
      item.token?.name ||
      item.token_name ||
      item.name ||
      item.symbol ||
      "Unknown";
    const saleAddress =
      item.token?.sale_address ||
      item.sale_address ||
      item.token_address ||
      item.address;
    const volume = item.volume || item.amount?.ae || "0";

    return (
      <div
        key={`${saleAddress || "item"}-${index}`}
        className="mr-2 flex-shrink-0 border border-white/10 rounded-[8px] overflow-hidden transition-all duration-300 hover:border-white/25 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-xl"
        style={{
          minWidth: "200px",
          background: type.cardBg,

        }}
        onClick={() => {
          if (saleAddress) {
            window.location.href = `/trendminer/tokens/${encodeURIComponent(
              tokenName
            )}`;
          }
        }}
      >
        <div className="p-2">
          {/* Address Avatar & Address - First Row */}
          <div className="mb-2">
            <div className="flex flex-row-reverse items-center gap-2">
              <div className="flex flex-row-reverse items-center gap-2 text-[12px] font-medium text-white/80">
                <AddressAvatar address={item.address} size={20} />
                <span className="truncate">{`${item.address.slice(0, 7)}...${item.address.slice(-4)}`}</span>
              </div>
              <div
                className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide whitespace-nowrap shadow-sm"
                style={{
                  color: type.color,
                  backgroundColor: type.bg,
                  borderColor: type.border,
                  border: `1px solid ${type.border}`,
                }}
              >
                {type.label}
              </div>
            </div>
          </div>
          {/* Token Name - Second Row */}


          {/* Transaction Type and Volume - Third Row */}
          <div className="flex flex-row-reverse items-center justify-between gap-2">
            {Number(volume) > 0 && (
              <div className={`text-[13px] font-bold ${type.textGradient} bg-clip-text text-transparent whitespace-nowrap`}>
                {Decimal.from(volume).shorten()}
              </div>
            )}
            <div className={`text-[16px] sm:text-[15px] font-bold ${type.textGradient} bg-clip-text text-transparent truncate`}>
              {tokenName}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-hidden mb-4">
      <div className="relative w-full">
        <div
          ref={containerRef}
          className="flex transition-transform duration-1000 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (200 + gapSize)}px)`,
            width: `${latestTransactions.length * (200 + gapSize)}px`,
            direction: "rtl", // Match Vue component RTL direction
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {latestTransactions.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}
