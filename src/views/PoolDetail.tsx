import { DexService } from "@/api/generated";
import { PriceDataFormatter } from "@/features/shared/components";
import { Decimal } from "@/libs/decimal";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AddressChip } from "../components/AddressChip";
import AeButton from "../components/AeButton";
import { TokenChip } from "../components/TokenChip";
import { PoolCandlestickChart } from "../features/dex/components/charts/PoolCandlestickChart";
import { TransactionCard } from "../features/dex/components/TransactionCard";
import { DataTable, DataTableResponse } from "../features/shared/components/DataTable/DataTable";
import { useAeSdk } from "../hooks";
import {
  getPairDetails,
  getTokenWithUsd,
} from "../libs/dexBackend";

// Pool-specific data interface (modified from TokenData)
interface PoolData {
  address: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    malformed: boolean;
    noContract: boolean;
    listed: boolean;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    malformed: boolean;
    noContract: boolean;
    listed: boolean;
  };
  synchronized: boolean;
  liquidityInfo: {
    totalSupply: string;
    reserve0: string;
    reserve1: string;
    height: number;
  };
}

// Wrapper function to convert API response to DataTable format
const fetchTransactions = async (params: any, pairAddress?: string): Promise<DataTableResponse<any>> => {
  if (!pairAddress) {
    return { items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 0, currentPage: 1 } };
  }

  const response = await DexService.listAllPairTransactions({
    ...params,
    pairAddress,
    orderBy: 'created_at',
    orderDirection: 'DESC',
  });

  return response as unknown as DataTableResponse<any>;
};

export default function PoolDetail() {
  const { activeNetwork } = useAeSdk();
  const { poolAddress } = useParams(); // Changed from tokenAddress to poolAddress
  const navigate = useNavigate();

  const { data: pairSummary } = useQuery({
    queryFn: () => DexService.getPairSummary({ address: poolAddress }),
    queryKey: ["DexService.getPairSummary", poolAddress],
    enabled: !!poolAddress,
  })

  // Pool-specific state (modified from token state)
  const [pool, setPool] = useState<PoolData | null>(null); // Changed from token to pool
  const [token0Data, setToken0Data] = useState<any | null>(null); // New: token0 metadata
  const [token1Data, setToken1Data] = useState<any | null>(null); // New: token1 metadata
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"24h" | "7d" | "30d">("24h");

  // Load pool data (modified from TokenDetail's useEffect)
  useEffect(() => {
    (async () => {
      if (!poolAddress) return;
      setLoading(true);
      setError(null);

      try {
        // Get pool details
        const poolData = await getPairDetails(poolAddress);

        if (!poolData) {
          throw new Error("Pool not found");
        }

        setPool(poolData);

        // Get token data for both tokens in the pool
        const [token0Info, token1Info] = await Promise.all([
          getTokenWithUsd(poolData.token0.address),
          getTokenWithUsd(poolData.token1.address),
        ]);

        setToken0Data(token0Info);
        setToken1Data(token1Info);
      } catch (e: any) {
        setError(e.message || "Failed to load pool data");
      } finally {
        setLoading(false);
      }
    })();
  }, [poolAddress]);

  // Utility functions (same as TokenDetail)
  const formatNumber = (num: number | string | undefined, decimals = 2) => {
    const n = Number(num || 0);
    if (n === 0) return "0";
    if (n < 0.01) return "< 0.01";
    if (n < 1000) return n.toFixed(decimals);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
    return `${(n / 1000000000).toFixed(1)}B`;
  };

  const formatTokenAmount = (
    amount: string | number | undefined,
    decimals = 18
  ) => {
    const n = Number(amount || 0);
    if (n === 0) return "0";
    const units = n / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  // Pool-specific computed values (updated for new structure)
  const poolStats = useMemo(() => {
    if (!pool || !pool.liquidityInfo) return null;

    const reserve0 = Number(pool.liquidityInfo.reserve0) / 1e18;
    const reserve1 = Number(pool.liquidityInfo.reserve1) / 1e18;
    const token0Price = token0Data?.priceUsd ? Number(token0Data.priceUsd) : 0;
    const token1Price = token1Data?.priceUsd ? Number(token1Data.priceUsd) : 0;

    const ratio0to1 = reserve1 > 0 ? reserve0 / reserve1 : 0;
    const ratio1to0 = reserve0 > 0 ? reserve1 / reserve0 : 0;

    return {
      reserve0,
      reserve1,
      token0Price,
      token1Price,
      ratio0to1,
      ratio1to0,
      totalLiquidity: reserve0 * token0Price + reserve1 * token1Price,
    };
  }, [pool, token0Data, token1Data]);

  // Error state (modified from TokenDetail)
  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto p-5">
        <div className="text-center p-10 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-xl">
          {error}
        </div>
      </div>
    );
  }

  // Main render (modified from TokenDetail)
  return (
    <div className="mx-auto md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 items-start">
        <div className="flex flex-col gap-6">
          {/* Pool Detail Card (modified from Token Detail Card) */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Header (modified for pools) */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold m-0 mb-2 flex items-center gap-2">
                <TokenChip address={pool?.token0?.address || "AE"} />
                <span className="text-2xl text-white/60">/</span>
                <TokenChip address={pool?.token1?.address || "AE"} />
              </h1>
              <p className="text-sm text-white/60 mt-2 mb-0 leading-relaxed">
                Liquidity pool details and statistics
              </p>
              <div className="text-xs text-white/60 font-mono opacity-70 mt-1">
                <AddressChip address={pool?.address || ""} />
              </div>
            </div>

            {/* Action Buttons (modified for pools) */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <AeButton
                onClick={() =>
                  navigate(
                    `/defi/swap?from=${pool?.token0?.address}&to=${pool?.token1?.address}`
                  )
                }
                variant="secondary-dark"
                size="medium"
              >
                Swap
              </AeButton>
              <AeButton
                onClick={() =>
                  navigate(
                    `/defi/pool?from=${pool?.token0?.address}&to=${pool?.token1?.address}`
                  )
                }
                variant="secondary-dark"
                size="medium"
              >
                Add Liquidity
              </AeButton>
              <AeButton
                onClick={() =>
                  navigate(`/defi/explore/tokens/${pool?.token0?.address}`)
                }
                variant="secondary-dark"
                size="medium"
              >
                View {pool?.token0?.symbol || "Token"}
              </AeButton>
              <AeButton
                onClick={() =>
                  navigate(`/defi/explore/tokens/${pool?.token1?.address}`)
                }
                variant="secondary-dark"
                size="medium"
              >
                View {pool?.token1?.symbol || "Token"}
              </AeButton>
            </div>

            {/* Pool Stats Overview (modified from Token Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Total Volume Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-400/10 to-white/5 border border-blue-400/20 backdrop-blur-xl relative overflow-hidden">
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                  📈 Total Volume
                </div>
                <div className="text-2xl font-extrabold text-blue-400 mb-1 font-mono">
                  <PriceDataFormatter priceData={pairSummary?.total_volume} bignumber />
                </div>
                <div className="text-xs text-white/60 font-medium">
                  All-time trading volume
                </div>
              </div>

              {/* Volume Card with Dropdown */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/10 to-white/5 border border-purple-600/20 backdrop-blur-xl relative overflow-hidden">
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">📊 Volume</span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as "24h" | "7d" | "30d")}
                    className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="24h" style={{ backgroundColor: '#1a1a1a' }}>24h</option>
                    <option value="7d" style={{ backgroundColor: '#1a1a1a' }}>7d</option>
                    <option value="30d" style={{ backgroundColor: '#1a1a1a' }}>30d</option>
                  </select>
                </div>
                <div className="text-2xl font-extrabold text-purple-400 mb-1 font-mono">
                  <PriceDataFormatter priceData={pairSummary?.change?.[selectedPeriod]?.volume} bignumber />
                </div>
                <div className="text-xs text-white/60 font-medium">
                  {selectedPeriod === "24h" ? "Last 24 hours" : selectedPeriod === "7d" ? "Last 7 days" : "Last 30 days"}
                </div>
              </div>

              {/* Price Change Card with Dropdown */}
              <div
                className={`p-5 rounded-2xl backdrop-blur-xl relative overflow-hidden ${Number(pairSummary?.change?.[selectedPeriod]?.price_change?.percentage) >= 0
                  ? "bg-gradient-to-br from-green-400/10 to-white/5 border border-green-400/20"
                  : "bg-gradient-to-br from-red-400/10 to-white/5 border border-red-400/20"
                  }`}
              >
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5">📊 Price Change</span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as "24h" | "7d" | "30d")}
                    className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="24h" style={{ backgroundColor: '#1a1a1a' }}>24h</option>
                    <option value="7d" style={{ backgroundColor: '#1a1a1a' }}>7d</option>
                    <option value="30d" style={{ backgroundColor: '#1a1a1a' }}>30d</option>
                  </select>
                </div>
                <div
                  className={`text-2xl font-extrabold mb-1 font-mono ${Number(pairSummary?.change?.[selectedPeriod]?.price_change?.percentage) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                    }`}
                >
                  {Number(pairSummary?.change?.[selectedPeriod]?.price_change?.percentage) >= 0 ? "+" : ""}
                  {Number(pairSummary?.change?.[selectedPeriod]?.price_change?.percentage || 0).toFixed(2)}%
                </div>
                <div className="text-xs text-white/60 font-medium">
                  ${Number(pairSummary?.change?.[selectedPeriod]?.price_change?.value || 0).toFixed(6)}
                </div>
              </div>
            </div>

            {/* Pool Reserves (new for pools) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Token 0 Reserve */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="text-[10px] text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1">
                  🪙 {pool?.token0?.symbol || "Token"} Reserve
                </div>
                <div className="text-lg font-bold text-white mb-0.5">
                  {Decimal.fromBigNumberString(pool?.liquidityInfo?.reserve0?.toString() || "0").prettify()}
                </div>
              </div>

              {/* Token 1 Reserve */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div className="text-[10px] text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1">
                  🪙 {pool?.token1?.symbol || "Token"} Reserve
                </div>
                <div className="text-lg font-bold text-white mb-0.5">
                  {Decimal.fromBigNumberString(pool?.liquidityInfo?.reserve1?.toString() || "0").prettify()}
                </div>
              </div>

              {/* LP Token Supply */}
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
                  🎫 LP Token Supply
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 2,
                  }}
                >
                  {Decimal.fromBigNumberString(pool?.liquidityInfo?.totalSupply?.toString() || "0").prettify()}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--light-font-color)",
                    fontWeight: 500,
                  }}
                >
                  LP tokens in circulation
                </div>
              </div>
            </div>
          </div>

          {pool?.address && (
            <PoolCandlestickChart
              className="w-full"
              pairAddress={pool.address} height={400} />
          )}

          {/* Pool Composition */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-white m-0 mb-4">
              Pool Composition
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
              {/* Token 0 Info */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--standard-font-color)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <TokenChip address={pool?.token0?.address || "AE"} />
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  {Decimal.fromBigNumberString(pool?.liquidityInfo?.reserve0?.toString() || "0").prettify()}
                  <span className="text-xs text-white/60"> {pool?.token0?.symbol || "Token"}</span>
                </div>
              </div>

              {/* Ratio Display */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    color: "var(--accent-color)",
                    fontWeight: 700,
                  }}
                >
                  ⚖️
                </div>
                {poolStats && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--light-font-color)",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    1 {pool?.token0?.symbol || "Token"} ={" "}
                    {poolStats.ratio0to1.toFixed(6)}{" "}
                    {pool?.token1?.symbol || "Token"}
                    <br />1 {pool?.token1?.symbol || "Token"} ={" "}
                    {poolStats.ratio1to0.toFixed(6)}{" "}
                    {pool?.token0?.symbol || "Token"}
                  </div>
                )}
              </div>

              {/* Token 1 Info */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--standard-font-color)",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <TokenChip address={pool?.token1?.address || "AE"} />
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--standard-font-color)",
                    marginBottom: 4,
                    fontFamily: "monospace",
                  }}
                >
                  {Decimal.fromBigNumberString(pool?.liquidityInfo?.reserve1?.toString() || "0").prettify()}
                  <span className="text-xs text-white/60"> {pool?.token1?.symbol || "Token"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <h3 className="text-lg font-semibold text-white m-0 mb-6">
          Recent Transactions
        </h3>
        <DataTable
          queryFn={(params) => fetchTransactions(params, poolAddress)}
          renderRow={({ item, index }) => (
            <TransactionCard
              key={item.tx_hash || index}
              transaction={item}
            />
          )}
          initialParams={{
            orderBy: 'created_at',
            orderDirection: 'DESC',
            pairAddress: poolAddress,
          }}
          itemsPerPage={10}
          emptyMessage="No transactions found for this pool. Trading activity will appear here."
          className="space-y-4"
        />
      </div>
    </div>
  );
}
