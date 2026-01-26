import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SuperheroApi } from "../../api/backend";
import { useAeSdk } from "../../hooks";
import WebSocketClient from "../../libs/WebSocketClient";
import { formatCompactNumber } from "../../utils/number";

interface TrendingTag {
  tag: string;
  score: number;
  source?: string;
}

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
}

interface LiveTransaction {
  sale_address: string;
  token_name: string;
  type: string;
  created_at: string;
}

export default function LeftRail() {
  const { sdk, currentBlockHeight } = useAeSdk();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>(
    []
  );
  const [marketStats, setMarketStats] = useState<any>(null);
  const [topTokens, setTopTokens] = useState<TokenItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<
    Array<{ token: string; price: number; change: number }>
  >([]);
  // Removed local API status (moved to footer)

  // Timer, online status, and block height
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enhanced time formatting with emoji and block height
  const formatTime = (date: Date) => {
    const hour = date.getHours();
    let timeEmoji = "🌅";
    if (hour >= 6 && hour < 12) timeEmoji = "🌅";
    else if (hour >= 12 && hour < 17) timeEmoji = "☀️";
    else if (hour >= 17 && hour < 20) timeEmoji = "🌆";
    else timeEmoji = "🌙";

    const timeString = date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const dateString = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return { timeEmoji, timeString, dateString };
  };

  // Load trending data
  useEffect(() => {
    let cancelled = false;
    async function loadTrendingData() {
      try {
        const [tagsResp, tokensResp, statsResp] = await Promise.all([
          SuperheroApi.listTrendingTags({
            orderBy: "score",
            orderDirection: "DESC",
            limit: 10,
          }),
          SuperheroApi.listTokens({
            orderBy: "market_cap",
            orderDirection: "DESC",
            limit: 5,
          }),
          SuperheroApi.fetchJson("/api/analytics/past-24-hours"),
        ]);

        if (!cancelled) {
          try {
            const tags = Array.isArray(tagsResp?.items) ? tagsResp.items : [];
            const mappedTags = tags.map((it: any) => ({
              tag: it.tag ?? it.name ?? "",
              score: Number(it.score ?? it.value ?? 0),
              source: it.source || it.platform || undefined,
            }));
            setTrendingTags(mappedTags.filter((t) => t.tag));

            const tokens = tokensResp?.items ?? [];
            // Ensure token data is properly formatted
            const formattedTokens = tokens.map((token: any) => ({
              ...token,
              price: token.price ? Number(token.price) : null,
              market_cap: token.market_cap ? Number(token.market_cap) : 0,
              holders_count: token.holders_count
                ? Number(token.holders_count)
                : 0,
            }));
            setTopTokens(formattedTokens);

            setMarketStats(statsResp);
          } catch (parseError) {
            console.error("Failed to parse trending data:", parseError);
            // Set empty arrays as fallback
            setTrendingTags([]);
            setTopTokens([]);
            setMarketStats(null);
          }
        }
      } catch (error) {
        console.error("Failed to load trending data:", error);
        // Set empty arrays as fallback
        if (!cancelled) {
          setTrendingTags([]);
          setTopTokens([]);
          setMarketStats(null);
        }
      }
    }
    loadTrendingData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load live transactions
  useEffect(() => {
    let cancelled = false;
    async function loadLiveTransactions() {
      try {
        const [txResp, createdResp] = await Promise.all([
          SuperheroApi.fetchJson("/api/transactions?limit=5"),
          SuperheroApi.fetchJson(
            "/api/tokens?order_by=created_at&order_direction=DESC&limit=3"
          ),
        ]);

        if (!cancelled) {
          try {
            const txItems = txResp?.items ?? [];
            const createdItems = (createdResp?.items ?? []).map((t: any) => ({
              sale_address: t.sale_address || t.address || "",
              token_name: t.name || "Unknown Token",
              type: "CREATED",
              created_at: t.created_at || new Date().toISOString(),
            }));
            setLiveTransactions([...createdItems, ...txItems].slice(0, 8));
          } catch (parseError) {
            console.error("Failed to parse live transactions:", parseError);
            setLiveTransactions([]);
          }
        }
      } catch (error) {
        console.error("Failed to load live transactions:", error);
        if (!cancelled) {
          setLiveTransactions([]);
        }
      }
    }
    loadLiveTransactions();

    // WebSocket subscriptions for real-time updates
    const unsub1 = WebSocketClient.subscribeForTokenHistories("TokenTransaction", (tx) => {
      setLiveTransactions((prev) =>
        [
          {
            sale_address: tx?.sale_address || tx?.token_address || "",
            token_name: tx?.token_name || "Unknown",
            type: "TRADE",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    });

    const unsub2 = WebSocketClient.subscribeForTokenHistories("TokenCreated", (payload) => {
      setLiveTransactions((prev) =>
        [
          {
            sale_address: payload?.sale_address || payload?.address || "",
            token_name: payload?.name || "New Token",
            type: "CREATED",
            created_at: payload?.created_at || new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8)
      );
    });

    return () => {
      cancelled = true;
      unsub1();
      unsub2();
    };
  }, []);

  // API status moved to footer

  // Simulate price alerts (in real app, this would come from user preferences)
  useEffect(() => {
    const alerts = [
      { token: "AE", price: 0.15, change: 2.5 },
      { token: "SUPER", price: 0.08, change: -1.2 },
      { token: "MEME", price: 0.003, change: 15.7 },
    ];
    setPriceAlerts(alerts);
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "explore":
        navigate("/pool/add-tokens");
        break;
      case "bridge":
        navigate("/dex");
        break;
      case "nfts":
        navigate("/trends");
        break;
      case "trending":
        navigate("/trends");
        break;
      case "governance":
        navigate("/voting");
        break;
      case "meet":
        navigate("/meet");
        break;
      default:
        break;
    }
  };

  const handleTrendingTopic = (topic: string) => {
    navigate(`/trends?q=${encodeURIComponent(topic)}`);
  };

  const handleTokenClick = (token: TokenItem) => {
    navigate(`/trends/tokens/${token.name}`);
  };

  const formatMarketCap = (amount: number): string => {
    return `$${formatCompactNumber(amount, 0, 1)}`;
  };

  const enhancedTips = [
    {
      icon: "💎",
      color: "var(--neon-teal)",
      text: "Use hardware wallets for large amounts",
      expanded:
        "Hardware wallets like Ledger or Trezor provide the highest security for storing significant amounts of cryptocurrency.",
      category: "Security",
    },
    {
      icon: "🔒",
      color: "var(--neon-pink)",
      text: "Always verify contract addresses",
      expanded:
        "Double-check contract addresses before interacting. One wrong character can lead to permanent loss of funds.",
      category: "Security",
    },
    {
      icon: "⚡",
      color: "var(--neon-blue)",
      text: "Keep some AE for gas fees",
      expanded:
        "Always maintain a small balance of AE tokens to pay for transaction fees on the æternity network.",
      category: "Trading",
    },
    {
      icon: "🛡️",
      color: "var(--neon-yellow)",
      text: "Never share your private keys",
      expanded:
        "Your private keys are like the password to your bank account. Never share them with anyone, including support.",
      category: "Security",
    },
    {
      icon: "📱",
      color: "var(--neon-purple)",
      text: "Enable 2FA on exchanges",
      expanded:
        "Use two-factor authentication on all cryptocurrency exchanges to add an extra layer of security.",
      category: "Security",
    },
    {
      icon: "🚀",
      color: "var(--neon-green)",
      text: "Diversify your portfolio",
      expanded:
        "Don't put all your eggs in one basket. Spread your investments across different tokens and projects.",
      category: "Investment",
    },
  ];

  return (
      <div className="scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-[rgba(0,255,157,0.6)] scrollbar-thumb-via-pink-500/60 scrollbar-thumb-to-[rgba(0,255,157,0.6)] scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-via-pink-500/80 hover:scrollbar-thumb-to-[rgba(0,255,157,0.8)]">
      {/* Enhanced Quick Stats Dashboard */}
      <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[20px] rounded-[20px] p-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--neon-teal)] before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            📊
          </span>
          <h4 className="m-0 text-[var(--neon-teal)] text-base font-bold">
            Live Dashboard
          </h4>
          <div
            className={`ml-auto w-2 h-2 rounded-full ${
              isOnline
                ? "bg-[var(--neon-green)] animate-pulse"
                : "bg-[var(--neon-pink)]"
            }`}
          />
        </div>

        <div className="grid gap-2.5">
          <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-[10px]">
            <span className="text-xs text-[#b8c5d6]">Blockchain Status</span>
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                isOnline
                  ? "text-[var(--neon-green)]"
                  : "text-[var(--neon-pink)]"
              }`}
            >
              {isOnline ? "🟢 Connected" : "🔴 Offline"}
            </span>
          </div>

          {/* Enhanced Current Time Display */}
          <div className="p-4 bg-gradient-to-br from-teal-500/10 to-blue-500/5 rounded-2xl border border-teal-500/20 backdrop-blur-[15px] relative overflow-hidden">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/5 to-transparent animate-[shimmer_3s_infinite] z-0" />

            <div className="relative z-10">
              {/* Time Emoji and Label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-base text-[var(--neon-teal)] font-semibold uppercase tracking-wider">
                  Current Time
                </span>
                <span className="text-xl drop-shadow-[0_0_8px_rgba(78,205,196,0.5)]">
                  {formatTime(currentTime).timeEmoji}
                </span>
              </div>

              {/* Main Time Display */}
              <div className="text-center mb-1.5">
                <div className="text-lg text-white font-extrabold font-mono text-shadow-[0_0_10px_rgba(78,205,196,0.5)] tracking-wide">
                  {formatTime(currentTime).timeString}
                </div>
              </div>

              {/* Date Display */}
              <div className="text-center mb-2">
                <div className="text-[11px] text-[var(--neon-blue)] font-semibold uppercase tracking-wider">
                  {formatTime(currentTime).dateString}
                </div>
              </div>

              {/* Block Height (if available) */}
              {currentBlockHeight !== null && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
                  <span className="text-[10px] text-[var(--neon-green)] font-semibold font-mono">
                    Block #{currentBlockHeight.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {marketStats && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="py-2 px-3 bg-teal-500/10 rounded-lg border border-teal-500/20 text-center transition-all duration-300 hover:-translate-y-0.5">
                <div className="text-[10px] text-[var(--neon-teal)] font-semibold">
                  Market Cap
                </div>
                <div className="text-[11px] text-white font-bold">
                  {formatMarketCap(marketStats.total_market_cap_sum || 0)}
                </div>
              </div>
              <div className="py-2 px-3 bg-pink-500/10 rounded-lg border border-pink-500/20 text-center transition-all duration-300 hover:-translate-y-0.5">
                <div className="text-[10px] text-[var(--neon-pink)] font-semibold">
                  Total Tokens
                </div>
                <div className="text-[11px] text-white font-bold">
                  {marketStats.total_tokens || 0}
                </div>
              </div>
            </div>
          )}

          {/* Network Status moved to footer */}
        </div>
      </div>

      {/* Enhanced Quick Actions - moved to RightRail */}

      {/* Live Trending Topics */}
      <div className="genz-card" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <span style={{ fontSize: "18px" }}>🔥</span>
          <h4
            style={{ margin: 0, color: "var(--neon-yellow)", fontSize: "16px" }}
          >
            Live Trending
          </h4>
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--neon-teal)",
              fontSize: "16px",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              transition: "all 0.2s ease",
              marginLeft: "auto",
            }}
            onClick={() => navigate("/trends")}
            title="Explore all trends"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 157, 0.1)";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🔍
          </button>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--neon-pink)",
              animation: "pulse 1s infinite",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: "8px" }}>
          {trendingTags.slice(0, 6).map((tag, index) => (
            <div
              key={index}
              className="trending-topic"
              style={{
                padding: "8px 12px",
                background: `rgba(255,255,255,${0.03 + index * 0.02})`,
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.05)",
                fontSize: "11px",
                color: "#b8c5d6",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => handleTrendingTopic(tag.tag)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.transform =
                  "translateY(-2px) scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `rgba(255,255,255,${
                  0.03 + index * 0.02
                })`;
                e.currentTarget.style.color = "#b8c5d6";
                e.currentTarget.style.transform = "translateY(0) scale(1)";
              }}
              title={`Search for ${tag.tag} (Score: ${tag.score})`}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "6px",
                  fontSize: "8px",
                  color: "var(--neon-pink)",
                  fontWeight: "600",
                }}
              >
                #{index + 1}
              </span>
              {tag.tag}
            </div>
          ))}
        </div>
      </div>

      {/* Top Tokens - moved to RightRail */}

      {/* Live Activity Feed - moved to RightRail */}

      {/* Price Alerts - moved to RightRail */}

      {/* Enhanced Pro Tips */}
      <div className="genz-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            cursor: "pointer",
          }}
          onClick={() => setShowTips(!showTips)}
          title="Click to expand tips"
        >
          <span style={{ fontSize: "18px" }}>💡</span>
          <h4
            style={{ margin: 0, color: "var(--neon-purple)", fontSize: "16px" }}
          >
            Pro Tips
          </h4>
          <span
            style={{
              fontSize: "12px",
              color: "var(--neon-purple)",
              marginLeft: "auto",
              transition: "transform 0.3s ease",
              transform: showTips ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "#b8c5d6",
            lineHeight: "1.4",
            maxHeight: showTips ? "600px" : "80px",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
          }}
        >
          {enhancedTips.map((tip, index) => (
            <div key={index} style={{ marginBottom: "12px" }}>
              <div
                className="pro-tip"
                style={
                  {
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    transition: "background 0.2s ease",
                    "--tip-color": tip.color,
                  } as React.CSSProperties
                }
                onClick={() => {
                  // Show expanded tip in a toast or modal
                  alert(`${tip.icon} ${tip.category}: ${tip.expanded}`);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                title={`${tip.category}: Click for more details`}
              >
                <strong style={{ color: tip.color, fontSize: "14px" }}>
                  {tip.icon}
                </strong>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", fontWeight: "600" }}>
                    {tip.text}
                  </span>
                  <div
                    style={{
                      fontSize: "8px",
                      color: tip.color,
                      marginTop: "2px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {tip.category}
                  </div>
                </div>
              </div>
              {showTips && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    marginLeft: "26px",
                    marginTop: "6px",
                    fontStyle: "italic",
                    padding: "8px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {tip.expanded}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          
          @keyframes slideIn {
            from { 
              opacity: 0; 
              transform: translateX(-20px); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
          
          // Spinner styles removed - use Spinner component instead
        `,
        }}
      />
    </div>
  );
}
