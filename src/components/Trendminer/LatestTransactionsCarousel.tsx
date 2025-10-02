import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  useLatestTransactions,
} from "@/hooks/useLatestTransactions";
import { TX_FUNCTIONS } from "@/utils/constants";
import { Decimal } from "@/libs/decimal";
import AddressAvatar from "../AddressAvatar";
import './LatestTransactionsCarousel.scss';

export default function LatestTransactionsCarousel() {
  const { latestTransactions } = useLatestTransactions();
  const [itemsToShow, setItemsToShow] = useState(4); // Number of items visible at once for loading state
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();


  // Responsive breakpoints for loading state and screen width tracking
  const updateResponsiveValues = useCallback(() => {
    const width = window.innerWidth;
    
    if (width >= 1680) setItemsToShow(7);
    else if (width >= 1280) setItemsToShow(5);
    else if (width >= 900) setItemsToShow(4);
    else if (width >= 700) setItemsToShow(3);
    else setItemsToShow(2);
  }, []);

  // Data fetching is now handled by useLatestTransactions hook

  // Smooth scrolling animation
  const startScrolling = useCallback(() => {
    if (!latestTransactions.length || isHovered) return;
    
    const scroll = () => {
      setScrollPosition(prev => {
        const cardWidth = 208; // 200px card + 8px gap
        const totalWidth = latestTransactions.length * cardWidth;
        const newPosition = prev + 1.5; // Adjust speed here (pixels per frame)
        
        console.log('newPosition', newPosition);
        console.log('totalWidth', totalWidth);
        const stopAt = totalWidth - (cardWidth * 7);
        // Stop scrolling when we reach the end
        if (newPosition >= stopAt) {
          return stopAt; // Stop at the end
        }
        return newPosition;
      });
      
      // Continue animation only if we haven't reached the end and not hovered
      const cardWidth = 208;
      const totalWidth = latestTransactions.length * cardWidth;
      const currentPosition = scrollPosition;
      
      if (!isHovered && currentPosition < totalWidth) {
        animationRef.current = requestAnimationFrame(scroll);
      }
    };
    
    animationRef.current = requestAnimationFrame(scroll);
  }, [latestTransactions.length, isHovered, scrollPosition]);

  const stopScrolling = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  // Handle responsive breakpoints for loading state and screen width
  useEffect(() => {
    updateResponsiveValues();
    const handleResize = () => updateResponsiveValues();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateResponsiveValues]);

  // Handle scrolling animation
  useEffect(() => {
    startScrolling();
    return () => stopScrolling();
  }, [startScrolling, stopScrolling]);

  // Reset scroll position when transactions change
  useEffect(() => {
    setScrollPosition(0);
  }, [latestTransactions.length]);

  if (!latestTransactions.length) {
    // Show loading state with improved styling
    return (
      <div className="latest-transactions-carousel">
        <div className="transactions-carousel-container">
          <div className="transactions-loading">
            {[...Array(itemsToShow)].map((_, i) => (
              <div key={i} className="transaction-skeleton">
                <div className="skeleton-content">
                  {/* Address Avatar & Address - First Row */}
                  <div className="skeleton-address-row">
                    <div className="skeleton-address-content">
                      <div className="skeleton-avatar"></div>
                      <div className="skeleton-address">
                        ak_••••••••••••••••
                      </div>
                    </div>
                  </div>

                  {/* Token Name - Second Row */}
                  <div className="skeleton-token-name">
                    Loading token name...
                  </div>
                  
                  {/* Transaction Type and Volume - Third Row */}
                  <div className="skeleton-details-row">
                    <div className="skeleton-volume">
                      •••
                    </div>
                    <div className="skeleton-badge">
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
        className="transaction-card"
        style={{
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
        <div className="transaction-card-content">
          {/* Address Avatar & Address - First Row */}
          <div className="transaction-address-row">
            <div className="transaction-address-content">
              <div className="transaction-address-info">
                <AddressAvatar address={item.address} size={20} />
                <span>{`${item.address.slice(0, 7)}...${item.address.slice(-4)}`}</span>
              </div>
              <div
                className="transaction-type-badge"
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

          {/* Transaction Type and Volume - Third Row */}
          <div className="transaction-details-row">
            {Number(volume) > 0 && (
              <div className={`transaction-volume ${type.textGradient} bg-clip-text text-transparent`}>
                {Decimal.from(volume).shorten()}
              </div>
            )}
            <div className={`transaction-token-name ${type.textGradient} bg-clip-text text-transparent`}>
              {tokenName}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Use transactions directly without duplication since we want it to stop at the end
  const transactions = latestTransactions;

  return (
    <div className="latest-transactions-carousel">
      <div className="transactions-carousel-container">
        <div
          ref={containerRef}
          className="transactions-carousel-track-smooth"
          style={{
            transform: `translateX(-${scrollPosition}px)`,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {transactions.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}
