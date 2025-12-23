import { PairDto } from "@/api/generated";
import { AddressChip } from "@/components/AddressChip";
import AeButton from "@/components/AeButton";
import { TokenChip } from "@/components/TokenChip";
import { useNavigate } from "react-router-dom";

interface PoolHeaderProps {
  pairData?: PairDto;
}

export function PoolHeader({ pairData }: PoolHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold m-0 mb-2 flex items-center gap-2">
          <TokenChip token={pairData?.token0} />
          <span className="text-2xl text-white/60">/</span>
          <TokenChip token={pairData?.token1} />
        </h1>
        <p className="text-sm text-white/60 mt-2 mb-0 leading-relaxed">
          Liquidity pool details and statistics
        </p>
        <div className="text-xs text-white/60 font-mono opacity-70 mt-1">
          <AddressChip address={pairData?.address || ""} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <AeButton
          onClick={() =>
            navigate(
              `/apps/swap?from=${pairData?.token0?.address}&to=${pairData?.token1?.address}`
            )
          }
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Swap
        </AeButton>
        <AeButton
          onClick={() =>
            navigate(
              `/apps/pool?from=${pairData?.token0?.address}&to=${pairData?.token1?.address}`
            )
          }
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Add Liquidity
        </AeButton>
        <AeButton
          onClick={() =>
            navigate(`/apps/explore/tokens/${pairData?.token0?.address}`)
          }
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          View {pairData?.token0?.symbol || "Token"}
        </AeButton>
        <AeButton
          onClick={() =>
            navigate(`/apps/explore/tokens/${pairData?.token1?.address}`)
          }
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          View {pairData?.token1?.symbol || "Token"}
        </AeButton>
      </div>
    </>
  );
}
