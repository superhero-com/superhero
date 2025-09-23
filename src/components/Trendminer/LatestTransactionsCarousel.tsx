import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { TrendminerApi } from "../../api/backend";
import WebSocketClient from "../../libs/WebSocketClient";
import MobileCard from "../MobileCard";

export default function LatestTransactionsCarousel() {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMovingForward, setIsMovingForward] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(4); // Number of items visible at once
  const [gapSize, setGapSize] = useState(8); // Gap size in pixels (gap-2 = 8px, gap-1 = 4px)
  const nameCacheRef = useRef<Map<string, string>>(new Map());
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function resolveTokenName(
    address: string
  ): Promise<string | undefined> {
    if (!address) return undefined;
    const cache = nameCacheRef.current;
    if (cache.has(address)) return cache.get(address);
    try {
      const tok = await TrendminerApi.getToken(address);
      const name = tok?.name || tok?.symbol;
      if (name) cache.set(address, name);
      return name;
    } catch {
      return undefined;
    }
  }

  async function enrichNames(list: any[]): Promise<any[]> {
    const unknowns = Array.from(
      new Set(
        list
          .map((it) => ({
            addr: it.sale_address || it.token_address,
            has: !!(it.token_name || it.name || it.symbol),
          }))
          .filter((x) => x.addr && !x.has)
          .map((x) => x.addr as string)
      )
    );
    await Promise.all(
      unknowns.slice(0, 12).map((addr) => resolveTokenName(addr))
    );
    return list.map((it) => {
      if (it.token_name || it.name || it.symbol) return it;
      const addr = it.sale_address || it.token_address;
      const cached = addr ? nameCacheRef.current.get(addr) : undefined;
      return cached ? { ...it, token_name: cached } : it;
    });
  }

  // Responsive breakpoints
  const updateItemsToShow = useCallback(() => {
    const width = window.innerWidth;
    if (width >= 1680) setItemsToShow(6);
    else if (width >= 1280) setItemsToShow(5);
    else if (width >= 900) setItemsToShow(4);
    else if (width >= 700) setItemsToShow(3);
    else setItemsToShow(2);

    // Set gap size based on screen size (sm: gap-1 = 4px, default: gap-2 = 8px)
    if (width >= 640) setGapSize(8); // gap-2
    else setGapSize(4); // gap-1
  }, []);

  // Pendulum autoplay - shows multiple items, pauses when last item is visible
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (!isHovered && !isPaused && items.length > itemsToShow) {
      autoplayRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          // Maximum index where last item is still visible
          const maxIndex = Math.max(0, items.length - 1 - itemsToShow);

          if (isMovingForward) {
            console.log("isMovingForward", prev, maxIndex, itemsToShow);
            if (prev >= maxIndex - 1) {
              // Last item is now visible, pause and prepare to go backward
              console.log(
                "Last item is now visible, pause and prepare to go backward"
              );
              setIsPaused(true);
              setTimeout(() => {
                setIsMovingForward(false);
                setIsPaused(false);
              }, 2000); // Pause for 2 seconds when last item appears
              return prev;
            }
            return prev + 1;
          } else {
            if (prev <= 0) {
              // Back to beginning, pause and prepare to go forward
              setIsPaused(true);
              setTimeout(() => {
                setIsMovingForward(true);
                setIsPaused(false);
              }, 2000); // Pause for 2 seconds at the beginning
              return prev;
            }
            return prev - 1;
          }
        });
      }, 2000);
    }
  }, [isHovered, isPaused, items.length, itemsToShow, isMovingForward]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const [txResp, createdResp] = await Promise.all([
          TrendminerApi.fetchJson("/api/transactions?limit=10"),
          TrendminerApi.fetchJson(
            "/api/tokens?order_by=created_at&order_direction=DESC&limit=6"
          ),
        ]);
        const txItems = txResp?.items ?? txResp ?? [];
        const createdItems = (createdResp?.items ?? createdResp ?? []).map(
          (t: any) => ({
            sale_address: t.sale_address || t.address,
            token_name: t.name,
            type: "CREATED",
            created_at: t.created_at,
          })
        );
        let list = [...createdItems, ...txItems].slice(0, 16);
        list = await enrichNames(list);
        if (!cancel) setItems(list);
      } catch {}
    }
    load();
    const t = window.setInterval(load, 30000);
    const unsub1 = WebSocketClient.subscribe("TokenTransaction", (tx) => {
      const sale = tx?.sale_address || tx?.token_address;
      if (sale && !tx?.token_name) {
        resolveTokenName(sale).then((nm) => {
          if (nm)
            setItems((prev) =>
              [{ ...tx, token_name: nm }, ...prev].slice(0, 16)
            );
          else setItems((prev) => [tx, ...prev].slice(0, 16));
        });
      } else {
        setItems((prev) => [tx, ...prev].slice(0, 16));
      }
    });
    const unsub2 = WebSocketClient.subscribe("TokenCreated", (payload) => {
      const item = {
        sale_address: payload?.sale_address || payload?.address,
        token_name: payload?.name,
        type: "CREATED",
        created_at: payload?.created_at || Date.now(),
      };
      setItems((prev) => [item, ...prev].slice(0, 16));
    });
    return () => {
      cancel = true;
      window.clearInterval(t);
      unsub1();
      unsub2();
    };
  }, []);

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
    setIsMovingForward(true);
    setIsPaused(false);
  }, [items.length]);

  if (!items.length) {
    // Show loading state with responsive loading placeholders
    return (
      <div className="w-full my-1 overflow-hidden sm:my-0.75">
        <div className="relative w-full">
          <div className="flex gap-1 py-2 sm:gap-0.5">
            {[...Array(itemsToShow)].map((_, i) => (
              <div
                key={i}
                className="inline-flex items-center px-3 py-2 bg-black/5 border border-black/10 rounded-xl flex-shrink-0 transition-all duration-200 min-w-fit opacity-60 pointer-events-none sm:px-2.5 sm:py-1.5"
                style={{ width: `200px` }}
              >
                <div className="flex flex-col gap-1 sm:gap-0.75 w-full">
                  <div className="flex justify-between items-center gap-2 sm:gap-1.5">
                    <div className="px-1.5 py-0.75 rounded border text-[10px] font-bold uppercase tracking-wide border-gray-400 text-gray-400 bg-gray-400/10 whitespace-nowrap sm:px-1 sm:py-0.5 sm:text-[9px] animate-pulse">
                      CREATED
                    </div>
                    <div className="text-[10px] text-[var(--light-font-color)] opacity-70 whitespace-nowrap sm:text-[9px] animate-pulse">
                      --:--:--
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-1.5 sm:gap-1">
                    <span className="text-xs font-semibold text-[var(--primary-color)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap sm:text-[11px] animate-pulse">
                      Loading...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function normalizeType(tx: any): {
    label: "BUY" | "SELL" | "CREATED" | "TX";
    color: string;
    bg: string;
    border: string;
  } {
    const raw = String(
      tx?.type ||
        tx?.tx_type ||
        tx?.txType ||
        tx?.action ||
        tx?.function ||
        tx?.fn ||
        tx?.tx?.function ||
        ""
    ).toLowerCase();
    if (raw.includes("buy"))
      return {
        label: "BUY",
        color: "#1e7d2d",
        bg: "rgba(113,217,69,0.15)",
        border: "rgba(113,217,69,0.35)",
      };
    if (raw.includes("sell"))
      return {
        label: "SELL",
        color: "#b91c1c",
        bg: "rgba(239,68,68,0.15)",
        border: "rgba(239,68,68,0.35)",
      };
    if (raw.includes("create"))
      return {
        label: "CREATED",
        color: "#0b63c7",
        bg: "rgba(59,130,246,0.15)",
        border: "rgba(59,130,246,0.35)",
      };
    return {
      label: "TX",
      color: "#3b3b3b",
      bg: "rgba(0,0,0,0.06)",
      border: "rgba(0,0,0,0.12)",
    };
  }

  const renderItem = (item: any, index: number) => {
    const type = normalizeType(item);
    const tokenName = item.token_name || item.name || item.symbol || "Unknown";
    const time = item.created_at
      ? new Date(item.created_at).toLocaleTimeString()
      : "";

    return (
      <div
        key={`${item.sale_address || item.token_address || "item"}-${index}`}
        className="inline-flex items-center justify-between px-3 py-2 bg-black/5 border border-black/10 rounded-xl flex-shrink-0 transition-all duration-200 hover:bg-black/8 hover:border-black/15 hover:-translate-y-0.25 active:translate-y-0 sm:px-2.5 sm:py-1.5 sm:min-h-10"
        style={{ minWidth: "200px", flexShrink: 0 }}
      >
        <div className="flex flex-col gap-1 sm:gap-0.75 w-full">
          <div className="flex justify-between items-center gap-2 sm:gap-1.5">
            <div
              className="px-1.5 py-0.75 rounded border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap sm:px-1 sm:py-0.5 sm:text-[9px]"
              style={{
                color: type.color,
                backgroundColor: type.bg,
                borderColor: type.border,
              }}
            >
              {type.label}
            </div>
            <div className="text-[10px] text-[var(--light-font-color)] opacity-70 whitespace-nowrap sm:text-[9px]">
              {time}
            </div>
          </div>

          <div className="flex justify-between items-center gap-1.5 sm:gap-1">
            <span className="text-xs font-semibold text-[var(--primary-color)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap sm:text-[11px]">
              #{tokenName}
            </span>
            {item.amount && (
              <span className="text-[10px] font-medium text-blue-500 whitespace-nowrap sm:text-[9px]">
                {Number(item.amount).toLocaleString()} AE
              </span>
            )}
          </div>

          {item.sale_address && (
            <a
              href={`/trendminer/tokens/${encodeURIComponent(tokenName)}`}
              className="text-[10px] text-blue-500 no-underline font-medium transition-all duration-200 self-start whitespace-nowrap hover:text-blue-400 hover:underline sm:text-[9px] sm:p-1 sm:min-h-6 sm:flex sm:items-center"
            >
              View Token →
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full my-1 overflow-hidden sm:my-0.75">
      <div className="relative w-full">
        <div
          ref={containerRef}
          className="flex gap-2 py-2 transition-transform duration-1000 ease-in-out sm:gap-1"
          style={{
            transform: `translateX(-${currentIndex * (200 + gapSize)}px)`,
            width: `${items.length * (200 + gapSize) - gapSize}px`,
            direction: "ltr",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}
