import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AddressChip } from "../components/AddressChip";
import AeButton from "../components/AeButton";
import { TokenChip } from "../components/TokenChip";
import { TransactionCard } from "../features/dex/components/TransactionCard";
import { TokenPricePerformance } from "../features/dex/components";
import { useAeSdk } from "../hooks";
import { Decimal } from "../libs/decimal";
import {
  getPairsByTokenUsd,
  getTokenWithUsd,
} from "../libs/dexBackend";
import { PriceDataFormatter } from "@/features/shared/components";
import { useQuery } from "@tanstack/react-query";
import { DexService } from "@/api/generated";
import { DataTable, DataTableResponse } from "../features/shared/components/DataTable/DataTable";

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  malformed: boolean;
  noContract: boolean;
  listed: boolean;
  priceAe: string;
  priceUsd: string;
  tvlAe: string;
  tvlUsd: string;
  totalReserve: string;
  pairs: number;
  volumeUsdDay: string | null;
  volumeUsdWeek: string | null;
  volumeUsdMonth: string | null;
  volumeUsdYear: string;
  volumeUsdAll: string;
  priceChangeDay: string;
  priceChangeWeek: string;
  priceChangeMonth: string;
  priceChangeYear: string;
}

interface PairData {
  address: string;
  token0: string;
  token1: string;
  synchronized: boolean;
  transactions: number;
  tvlUsd: string;
  volumeUsdDay: string | null;
  volumeUsdWeek: string | null;
  volumeUsdMonth: string | null;
  volumeUsdYear: string;
  volumeUsdAll: string;
}

// Wrapper function to convert API response to DataTable format
// Fetches transactions from all pairs containing the token
const fetchTokenTransactions = async (params: any, pairsUsd: PairData[], tokenAddress?: string): Promise<DataTableResponse<any>> => {
  if (!tokenAddress || !pairsUsd || pairsUsd.length === 0) {
    return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 } };
  }

  // Fetch all transactions without pair filter to get all transactions involving this token
  // The backend will return all transactions, and we can filter on the client if needed
  const response = await DexService.listAllPairTransactions({
    ...params,
    orderBy: 'created_at',
    orderDirection: 'DESC',
    tokenAddress,
  });

  return response as unknown as DataTableResponse<any>;
};

export default function TokenDetail() {
  const { activeNetwork } = useAeSdk();
  const { tokenAddress } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [tokenMetaData, setTokenMetaData] = useState<any | null>(null);
  const [pairsUsd, setPairsUsd] = useState<PairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pools" | "transactions">("pools");
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d">(
    "24h"
  );

  const { data: tokenDetails } = useQuery({
    queryKey: ["DexService.getDexTokenSummary", tokenAddress],
    queryFn: () => DexService.getDexTokenByAddress({ address: tokenAddress }),
    enabled: !!tokenAddress,
  })


  async function getTokenMetaData(_tokenAddress: string) {
    const result = await fetch(
      `${activeNetwork.middlewareUrl}/v3/aex9/${_tokenAddress}`
    );
    const data = await result.json();
    return data;
  }


  useEffect(() => {
    (async () => {
      if (!tokenAddress) return;
      setLoading(true);
      setError(null);

      try {
        const [t, pUsd, metaData] = await Promise.all([
          getTokenWithUsd(tokenAddress),
          getPairsByTokenUsd(tokenAddress),
          getTokenMetaData(tokenAddress),
        ]);

        setToken(t);
        setPairsUsd(pUsd || []);
        setTokenMetaData(metaData);
      } catch (e: any) {
        setError(e.message || "Failed to load token data");
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenAddress]);

  const totalSupply = useMemo(() => {
    if (!tokenMetaData) return Decimal.ZERO;
    return Decimal.from(tokenMetaData?.event_supply).div(
      10 ** tokenMetaData?.decimals
    );
  }, [tokenMetaData]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-5 flex justify-center items-center min-h-[400px]">
        <div className="text-center text-white/60 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-[3px] border-white/10 border-t-purple-400 rounded-full animate-spin"></div>
          Loading token details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto md:p-5 flex flex-col gap-6 md:gap-8 min-h-screen">
        <div className="text-center p-10 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        <div className="flex flex-col gap-6">
          {/* Token Detail Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold text-white m-0 mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                {token ? `${token.symbol} / ${token.name}` : "Loading token…"}
              </h1>
              <p className="text-sm text-white/60 m-0 leading-relaxed">
                Token details and statistics
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <AeButton
                onClick={() =>
                  navigate(`/defi/swap?from=AE&to=${tokenAddress}`)
                }
                variant="secondary-dark"
                size="medium"
              >
                Swap
              </AeButton>
              <AeButton
                onClick={() =>
                  navigate(`/defi/pool?from=AE&to=${tokenAddress}`)
                }
                variant="secondary-dark"
                size="medium"
              >
                Add Liquidity
              </AeButton>
            </div>

            {/* Token Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Price Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-400/10 to-white/5 border border-red-400/20 backdrop-blur-xl relative overflow-hidden">
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                  💰 Price
                </div>
                <div className="text-2xl font-extrabold text-white mb-1 font-mono">
                  ${Decimal.from(token?.priceUsd || 0).prettify()}
                </div>
                {token?.priceChangeDay && (
                  <div
                    className={`text-xs font-semibold flex items-center gap-1 ${Number(token.priceChangeDay) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                      }`}
                  >
                    {Number(token.priceChangeDay) >= 0 ? "📈" : "📉"}
                    {Number(token.priceChangeDay) >= 0 ? "+" : ""}
                    {Number(token.priceChangeDay).toFixed(2)}% (24h)
                  </div>
                )}
              </div>

              {/* TVL Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, rgba(0, 255, 127, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
                  border: "1px solid rgba(0, 255, 127, 0.2)",
                  backdropFilter: "blur(10px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🏦 Total Value Locked
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--success-color)",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  ${Decimal.from(token?.tvlUsd || 0).prettify(2)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  Across {token?.pairs || 0} pool{token?.pairs !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Volume Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
                  border: "1px solid rgba(138, 43, 226, 0.2)",
                  backdropFilter: "blur(10px)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  📊 Volume (24h)
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--accent-color)",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  ${Decimal.from(token?.volumeUsdDay || 0).prettify()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  24h trading volume
                </div>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Locked Tokens */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--light-font-color)",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🔒 Locked
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 2,
                  }}
                >
                  {Decimal.from(token?.totalReserve || 0).prettify(2)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  {token?.symbol} tokens
                </div>
              </div>

              {/* Total Supply */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--light-font-color)",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  🪙 Total Supply
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 2,
                  }}
                >
                  {totalSupply.prettify()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  {token?.symbol} tokens
                </div>
              </div>

              {/* Market Cap (VFD) */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--light-font-color)",
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  💎 Market Cap
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 2,
                  }}
                >
                  ${totalSupply.mul(token?.priceUsd || 0).prettify()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  Fully diluted value
                </div>
              </div>
            </div>
          </div>

          {/* Price Performance Chart Card */}
          <div
            className="genz-card"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(20px)",
              borderRadius: 24,
              padding: 24,
              boxShadow: "var(--glass-shadow)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--standard-font-color)",
                  margin: 0,
                }}
              >
                Price Performance
              </h3>
            </div>

            <div style={{ marginTop: 8 }}>
              <TokenPricePerformance
                availableGraphTypes={[
                  { type: "Price", text: "Price" },
                  { type: "Volume", text: "Volume" },
                  { type: "TVL", text: "Total Value Locked" },
                  { type: "Fees", text: "Fees" },
                ]}
                initialChart={{ type: "Price", text: "Price" }}
                initialTimeFrame="1Y"
                tokenId={tokenAddress}
                className="token-detail-chart"
              />
            </div>
          </div>
        </div>

        {/* Second Row - Tabbed Card */}
        <div
          className="genz-card"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "var(--glass-shadow)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Tab Headers */}
          <div
            style={{
              display: "flex",
              marginBottom: 24,
              borderBottom: "1px solid var(--glass-border)",
            }}
          >
            <button
              onClick={() => setActiveTab("pools")}
              style={{
                padding: "12px 24px",
                background:
                  activeTab === "pools"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                border: "none",
                borderBottom:
                  activeTab === "pools"
                    ? "2px solid var(--accent-color)"
                    : "2px solid transparent",
                color:
                  activeTab === "pools"
                    ? "var(--standard-font-color)"
                    : "var(--light-font-color)",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
                borderRadius: "8px 8px 0 0",
              }}
            >
              Pools ({pairsUsd.length})
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              style={{
                padding: "12px 24px",
                background:
                  activeTab === "transactions"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "transparent",
                border: "none",
                borderBottom:
                  activeTab === "transactions"
                    ? "2px solid var(--accent-color)"
                    : "2px solid transparent",
                color:
                  activeTab === "transactions"
                    ? "var(--standard-font-color)"
                    : "var(--light-font-color)",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
                borderRadius: "8px 8px 0 0",
              }}
            >
              Transactions
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "pools" && (
            <div>
              {pairsUsd.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: 16,
                    border: "1px solid var(--glass-border)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      marginBottom: 16,
                      opacity: 0.3,
                    }}
                  >
                    🏊‍♂️
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "var(--standard-font-color)",
                    }}
                  >
                    No liquidity pools found
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--light-font-color)",
                      lineHeight: 1.5,
                    }}
                  >
                    This token doesn't have any active liquidity pools yet
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {pairsUsd.map((pair) => (
                    <div
                      key={pair.address}
                      style={{
                        padding: 20,
                        borderRadius: 16,
                        background:
                          "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                        border: "1px solid var(--glass-border)",
                        backdropFilter: "blur(10px)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onClick={() =>
                        navigate(`/dex/explore/pools/${pair.address}`)
                      }
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)";
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow =
                          "0 12px 40px rgba(0, 0, 0, 0.3)";
                        e.currentTarget.style.borderColor =
                          "rgba(255, 255, 255, 0.2)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor =
                          "var(--glass-border)";
                      }}
                    >
                      {/* Status Indicator */}
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: pair.synchronized
                              ? "var(--success-color)"
                              : "var(--error-color)",
                            boxShadow: pair.synchronized
                              ? "0 0 8px rgba(0, 255, 127, 0.4)"
                              : "0 0 8px rgba(255, 107, 107, 0.4)",
                          }}
                        ></div>
                        <span
                          style={{
                            fontSize: 10,
                            color: pair.synchronized
                              ? "var(--success-color)"
                              : "var(--error-color)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {pair.synchronized ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Pool Header */}
                      <div
                        style={{
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "var(--standard-font-color)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <TokenChip address={pair.token0} />
                            <span
                              style={{
                                fontSize: 18,
                                color: "var(--light-font-color)",
                              }}
                            >
                              /
                            </span>
                            <TokenChip address={pair.token1} />
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--light-font-color)",
                            fontFamily: "monospace",
                            opacity: 0.7,
                          }}
                        >
                          <AddressChip address={pair.address} />
                        </div>
                      </div>

                      {/* Pool Stats Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 16,
                          marginBottom: 16,
                        }}
                      >
                        {/* TVL */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-400/10 to-white/5 border border-blue-400/20 backdrop-blur-xl relative overflow-hidden">
                          <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                            💰 TVL
                          </div>
                          <div className="text-2xl font-extrabold text-blue-400 mb-1 font-mono">
                            ${Decimal.from(pair.tvlUsd).prettify(2)}
                          </div>
                          {/* <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--success-color)',
                          fontFamily: 'monospace'
                        }}>
                          ${Decimal.from(pair.tvlUsd).prettify(2)}
                        </div> */}
                        </div>

                        {/* Volume (24h) */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-400/10 to-white/5 border border-blue-400/20 backdrop-blur-xl relative overflow-hidden">
                          <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
                            📊 Volume (24h)
                            <select
                              value={selectedPeriod}
                              onChange={(e) =>
                                setSelectedPeriod(
                                  e.target.value as "24h" | "7d" | "30d"
                                )
                              }
                              className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
                              style={{ colorScheme: "dark" }}
                            >
                              <option
                                value="24h"
                                style={{ backgroundColor: "#1a1a1a" }}
                              >
                                24h
                              </option>
                              <option
                                value="7d"
                                style={{ backgroundColor: "#1a1a1a" }}
                              >
                                7d
                              </option>
                              <option
                                value="30d"
                                style={{ backgroundColor: "#1a1a1a" }}
                              >
                                30d
                              </option>
                            </select>
                          </div>
                          <div className="text-2xl font-extrabold text-purple-400 mb-1 font-mono">
                            $
                            {pair.volumeUsdDay
                              ? Decimal.from(pair.volumeUsdDay).prettify(2)
                              : "0"}
                          </div>
                        </div>
                      </div>

                      {/* Additional Stats Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 12,
                          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--light-font-color)",
                              fontWeight: 600,
                            }}
                          >
                            🔄 {pair.transactions.toLocaleString()} txs
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--light-font-color)",
                              fontWeight: 600,
                            }}
                          >
                            📈 All-time: $
                            {Decimal.from(pair.volumeUsdAll).prettify()}
                          </span>
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background:
                            "linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%)",
                          pointerEvents: "none",
                          opacity: 0,
                          transition: "opacity 0.3s ease",
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "transactions" && (
            <div>
              <DataTable
                queryFn={(params) => fetchTokenTransactions(params, pairsUsd, tokenAddress)}
                renderRow={({ item, index }) => (
                  <TransactionCard
                    key={item.tx_hash || index}
                    transaction={item}
                  />
                )}
                initialParams={{
                  orderBy: 'created_at',
                  orderDirection: 'DESC',
                }}
                itemsPerPage={10}
                emptyMessage="No transactions found for this token. Trading activity will appear here."
                className="space-y-4"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
