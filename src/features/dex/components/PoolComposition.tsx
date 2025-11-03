import { PairDto } from "@/api/generated";
import { TokenChip } from "@/components/TokenChip";
import { Decimal } from "@/libs/decimal";

interface PoolCompositionProps {
  pairData?: PairDto;
}

export function PoolComposition({ pairData }: PoolCompositionProps) {
  // Calculate ratios from reserves
  const ratio1 = pairData?.reserve1 && pairData?.reserve0 && Decimal.from(pairData.reserve0).gt(0)
    ? Decimal.from(pairData.reserve1).div(pairData.reserve0)
    : Decimal.ZERO;
  
  const ratio0 = pairData?.reserve0 && pairData?.reserve1 && Decimal.from(pairData.reserve1).gt(0)
    ? Decimal.from(pairData.reserve0).div(pairData.reserve1)
    : Decimal.ZERO;

  return (
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
            <TokenChip token={pairData?.token0} />
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
            {Decimal.fromBigNumberString(pairData?.reserve0?.toString() || "0").prettify()}
            <span className="text-xs text-white/60">
              {" "}
              {pairData?.token0?.symbol || "Token"}
            </span>
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
          {pairData?.address && (
            <div
              style={{
                fontSize: 12,
                color: "var(--light-font-color)",
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              1 {pairData?.token0?.symbol || "Token"} ={" "}
              {ratio1.prettify()}{" "}
              {pairData?.token1?.symbol || "Token"}
              <br />1 {pairData?.token1?.symbol || "Token"} ={" "}
              {ratio0.prettify()}{" "}
              {pairData?.token0?.symbol || "Token"}
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
            <TokenChip token={pairData?.token1} />
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
            {Decimal.fromBigNumberString(pairData?.reserve1?.toString() || "0").prettify()}
            <span className="text-xs text-white/60">
              {" "}
              {pairData?.token1?.symbol || "Token"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
