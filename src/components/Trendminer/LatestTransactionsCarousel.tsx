import React, { useEffect, useRef, useState, useCallback } from "react";
import AddressChip from "../AddressChip";
import {
  useLatestTransactions,
} from "@/hooks/useLatestTransactions";

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
                className="mr-2 flex-shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden opacity-60 animate-pulse"
                style={{ minWidth: "200px", width: "200px" }}
              >
                <div className="p-3 sm:p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="px-2 py-1 rounded bg-gray-400/20 text-transparent text-[9px]">
                      LOADING
                    </div>
                    <div className="text-[10px] text-transparent bg-gray-400/20 rounded">
                      ••••••
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-[11px] text-transparent bg-gray-400/20 rounded">
                        Loading token...
                      </div>
                    </div>
                    <div className="text-[14px] text-transparent bg-gray-400/20 rounded">
                      •••
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
  function getTransactionType(
    type: string
  ): "BOUGHT" | "SOLD" | "CREATED" | "TX" {
    switch (type) {
      case "sell":
        return "SOLD";
      case "buy":
        return "BOUGHT";
      case "create_community":
        return "CREATED";
      default:
        return "TX";
    }
  }

  function getTransactionColor(type: string): {
    color: string;
    bg: string;
    border: string;
  } {
    switch (type) {
      case "sell":
        return {
          color: "#ef4444", // error/red
          bg: "rgba(239,68,68,0.15)",
          border: "rgba(239,68,68,0.35)",
        };
      case "buy":
        return {
          color: "#22c55e", // success/green
          bg: "rgba(34,197,94,0.15)",
          border: "rgba(34,197,94,0.35)",
        };
      case "create_community":
        return {
          color: "#f59e0b", // warning/orange
          bg: "rgba(245,158,11,0.15)",
          border: "rgba(245,158,11,0.35)",
        };
      default:
        return {
          color: "#6b7280",
          bg: "rgba(107,114,128,0.15)",
          border: "rgba(107,114,128,0.35)",
        };
    }
  }

  function normalizeType(tx: any): {
    label: "BOUGHT" | "SOLD" | "CREATED" | "TX";
    color: string;
    bg: string;
    border: string;
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
    const colors = getTransactionColor(txType);

    return {
      label,
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
        className="mr-2 flex-shrink-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden transition-all duration-200 hover:bg-white/8 hover:border-white/20 hover:scale-[1.02] cursor-pointer"
        style={{ minWidth: "200px", width: "200px" }}
        onClick={() => {
          if (saleAddress) {
            window.location.href = `/trendminer/tokens/${encodeURIComponent(
              tokenName
            )}`;
          }
        }}
      >
        <div className="p-3 sm:p-2">
          {/* Header with type chip and address */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
              style={{
                color: type.color,
                backgroundColor: type.bg,
                borderColor: type.border,
                border: `1px solid ${type.border}`,
              }}
            >
              {type.label}
            </div>
            {saleAddress && <AddressChip address={saleAddress} />}
          </div>

          {/* Token info and volume */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white/90 truncate">
                {tokenName}
              </div>
            </div>
            {Number(volume) > 0 && (
              <div className="text-[14px] font-bold text-blue-400 whitespace-nowrap">
                {Number(volume).toLocaleString()}
              </div>
            )}
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
