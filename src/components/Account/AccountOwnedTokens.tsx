import { AccountTokensService } from "@/api/generated/services/AccountTokensService";
import {
  DataTable,
  DataTableResponse,
} from "@/features/shared/components/DataTable/DataTable";
import PriceDataFormatter from "@/features/shared/components/PriceDataFormatter";
import { Decimal } from "@/libs/decimal";
import { useState } from "react";

interface AccountOwnedTokensProps {
  address: string;
  tab: string;
}

export default function AccountOwnedTokens({
  address,
  tab,
}: AccountOwnedTokensProps) {
  // Owned tokens with balances (account tokens endpoint)
  const [ownedOrderDirection, setOwnedOrderDirection] = useState<
    "ASC" | "DESC"
  >("DESC");

  const fetchOwnedTokens = async (params: any) => {
    const response = (await AccountTokensService.listTokenHolders({
      ...params,
    })) as unknown as Promise<{ items: any[]; meta?: any }>;
    return response as unknown as DataTableResponse<any>;
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wide">
          <div>Token</div>
          <div>Price</div>
          <button
            className="text-left hover:opacity-80"
            onClick={() =>
              setOwnedOrderDirection(
                ownedOrderDirection === "DESC" ? "ASC" : "DESC"
              )
            }
            title="Sort by balance"
          >
            Balance {ownedOrderDirection === "DESC" ? "↓" : "↑"}
          </button>
          <div>Total Value</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          <DataTable
            queryFn={fetchOwnedTokens}
            renderRow={({ item, index }) => {
              const token = item?.token || item;
              const tokenName =
                token?.name ||
                token?.symbol ||
                token?.address ||
                `Token ${index + 1}`;
              const tokenHref =
                token?.name || token?.address
                  ? `/trending/tokens/${encodeURIComponent(
                      token?.name || token?.address
                    )}`
                  : undefined;
              const balance =
                item?.balance ?? item?.holder_balance ?? item?.amount;
              const balanceData = item?.balance_data;
              const priceData = token?.price_data;

              return (
                <div
                  key={`${token?.address || token?.name || index}`}
                  className="owned-token-row grid grid-cols-1 md:grid-cols-4 gap-4 px-6 py-4 rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  <div className="flex items-center min-w-0">
                    {tokenHref ? (
                      <a
                        href={tokenHref}
                        className="token-name text-md font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent hover:underline truncate"
                      >
                        <span className="text-white/60 !text-white/60 text-[.85em] mr-0.5 align-baseline">#</span>
                        <span>{tokenName}</span>
                      </a>
                    ) : (
                      <div className="token-name text-md font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent truncate">
                        <span className="text-white/60 !text-white/60 text-[.85em] mr-0.5 align-baseline">#</span>
                        <span>{tokenName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <div className="bg-gradient-to-r text-sm from-yellow-400 to-cyan-500 bg-clip-text text-transparent">
                      <PriceDataFormatter
                        watchPrice={false}
                        priceData={priceData}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="bg-gradient-to-r text-sm from-cyan-400 to-blue-500 bg-clip-text text-transparent font-medium">
                      {Decimal.from(balance)
                        .div(10 ** (token?.decimals || 18))
                        .prettify()}
                    </div>
                  </div>

                  <div className="flex items-center">
                    {balanceData ? (
                      <div className="bg-gradient-to-r text-sm from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        <PriceDataFormatter
                          watchPrice={false}
                          priceData={balanceData}
                        />
                      </div>
                    ) : (
                      <span className="text-white/60">-</span>
                    )}
                  </div>
                </div>
              );
            }}
            initialParams={{
              address: address,
              orderBy: "balance",
              orderDirection: ownedOrderDirection,
              enabled: !!address && tab === "owned",
              staleTime: 60_000,
            }}
            itemsPerPage={10}
            emptyMessage="This user doesn't own any Trendminer tokens yet."
            className="space-y-4"
          />
        </div>
        <style>{`
                .owned-token-row:hover .token-name {
                  background: linear-gradient(to right, #fb923c, #fbbf24);
                  -webkit-background-clip: text;
                  background-clip: text;
                }
                .owned-token-row:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 25px rgba(17, 97, 254, 0.15);
                }
                .owned-token-row:active {
                  transform: translateY(0);
                }
              `}</style>
      </div>
    </div>
  );
}
