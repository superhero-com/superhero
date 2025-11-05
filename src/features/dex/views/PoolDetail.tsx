import { DexPairService } from "@/api/generated";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { PoolCandlestickChart } from "../components/charts/PoolCandlestickChart";
import {
  PoolHeader,
  PoolStatsOverview,
  PoolReserves,
  PoolComposition,
  PoolTransactions,
} from "../components/PoolDetail";

export default function PoolDetail() {
  const { poolAddress, id } = useParams();
  // Support both :poolAddress (new routes) and :id (legacy routes)
  const address = poolAddress || id;

  const { data: pairData } = useQuery({
    queryFn: () => DexPairService.getPairByAddress({ address: address! }),
    queryKey: ["DexPairService.getPairByAddress", address],
    enabled: !!address,
  });

  const { data: pairSummary } = useQuery({
    queryFn: () => DexPairService.getPairSummary({ address: address! }),
    queryKey: ["DexPairService.getPairSummary", address],
    enabled: !!address,
  });

  return (
    <div className="mx-auto md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 items-start">
        <div className="flex flex-col gap-6">
          {/* Pool Header Card */}
          <div className="flex flex-col gap-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            <PoolHeader pairData={pairData} />
            <PoolStatsOverview pairSummary={pairSummary} />
            <PoolReserves pairData={pairData} />
          </div>

          {/* Chart */}
          {pairData?.address && (
            <PoolCandlestickChart
              className="w-full"
              pairAddress={pairData.address}
              height={400}
            />
          )}

          {/* Pool Composition */}
          <PoolComposition pairData={pairData} />
        </div>
      </div>

      {/* Recent Transactions */}
      <PoolTransactions poolAddress={address} />
    </div>
  );
}
