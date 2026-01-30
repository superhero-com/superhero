import { TX_FUNCTIONS } from "@/utils/constants";
import { formatLongDate } from "@/utils/common";
import PriceDataFormatter from "@/features/shared/components/PriceDataFormatter";
import AddressChip from "../AddressChip";
import { formatVolume } from "@/utils/common";
import { useState } from "react";
import { useAddressByChainName } from "@/hooks/useChainName";
import { useQuery } from "@tanstack/react-query";
import { TransactionsService } from "@/api/generated/services/TransactionsService";
import { useActiveChain } from "@/hooks/useActiveChain";
import { SolanaApi } from "@/chains/solana/backend";
import { mapSolanaTradeToTransaction } from "@/chains/solana/utils/tokenMapping";
import {
  DataTable,
  DataTableResponse,
} from "@/features/shared/components/DataTable/DataTable";
import Spinner from "@/components/Spinner";

interface AccountTradesProps {
  address: string;
  tab: string;
}

export default function AccountTrades({ address, tab }: AccountTradesProps) {
  const isChainName = address?.endsWith(".chain");
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? address : undefined
  );
  const { selectedChain } = useActiveChain();
  const effectiveAddress =
    isChainName && resolvedAddress ? resolvedAddress : (address as string);

  const fetchTransactions = async (params: any) => {
    if (selectedChain === 'solana') {
      const response = await SolanaApi.listBclTrades({
        accountAddress: effectiveAddress,
        limit: params.limit,
        page: params.page,
        includes: 'token',
      });
      const items = (response?.items || []).map((trade: any) => ({
        id: trade.signature,
        ...mapSolanaTradeToTransaction(trade),
      }));
      return {
        items,
        meta: response?.meta || { totalItems: items.length, totalPages: 1, currentPage: 1 },
      } as unknown as DataTableResponse<any>;
    }
    const response = (await TransactionsService.listTransactions({
      ...params,
    })) as unknown as Promise<{ items: any[]; meta?: any }>;
    return response as unknown as DataTableResponse<any>;
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Table header */}
      <div
        className={`hidden md:grid md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_2fr] gap-2 px-4 py-2 border border-white/10 rounded-2xl bg-white/[0.02] text-[10px] font-semibold text-white/60 uppercase tracking-wide`}
      >
        <div>Token</div>
        <div>Type</div>
        <div>Volume</div>
        <div>Price</div>
        {/* <div>Total Price</div> */}
        <div>Date</div>
        <div>Transaction</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <DataTable
          queryFn={fetchTransactions}
          renderRow={({ item: transaction, index }) => {
            const txType = (transaction?.tx_type || "").toLowerCase();
            const color = ((): "green" | "red" | "yellow" | "primary" => {
              switch (txType) {
                case TX_FUNCTIONS.buy:
                  return "green";
                case TX_FUNCTIONS.sell:
                  return "red";
                case TX_FUNCTIONS.create_community:
                  return "yellow";
                default:
                  return "primary";
              }
            })();
            const chipStyles = ((): {
              textColor: string;
              chipBg: string;
              borderColor: string;
            } => {
              switch (color) {
                case "green":
                  return {
                    textColor: "text-green-400",
                    chipBg: "bg-green-500/20",
                    borderColor: "border-green-500/30",
                  };
                case "red":
                  return {
                    textColor: "text-red-400",
                    chipBg: "bg-red-500/20",
                    borderColor: "border-red-500/30",
                  };
                case "yellow":
                  return {
                    textColor: "text-yellow-400",
                    chipBg: "bg-yellow-500/20",
                    borderColor: "border-yellow-500/30",
                  };
                default:
                  return {
                    textColor: "text-white",
                    chipBg: "bg-white/[0.05]",
                    borderColor: "border-white/10",
                  };
              }
            })();

            const token = transaction?.token;
            const tokenName = token?.name || transaction?.token_name || "Token";
            const tokenHref =
              token?.name || token?.address
                ? `/trends/tokens/${encodeURIComponent(
                    token?.name || token?.address
                  )}`
                : undefined;

            return (
              <div
                key={transaction.id}
                className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_2fr] gap-2 px-3 py-2 bg-white/[0.01]`}
              >
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Token:
                  </div>
                  {tokenHref ? (
                    <a
                      href={tokenHref}
                      className="text-white hover:underline truncate text-sm"
                      title={tokenName}
                    >
                      {tokenName}
                    </a>
                  ) : (
                    <div
                      className="text-white truncate text-sm"
                      title={tokenName}
                    >
                      {tokenName}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Type:
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${chipStyles.textColor} ${chipStyles.chipBg} border ${chipStyles.borderColor}`}
                  >
                    {transaction?.tx_type === TX_FUNCTIONS.create_community
                      ? "CREATED"
                      : (transaction?.tx_type || "TRADE")
                          .toString()
                          .toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Volume:
                  </div>
                  <div className="text-white font-medium text-xs">
                    {formatVolume(transaction?.volume)}
                  </div>
                </div>

                <div className="flex items-center text-xs">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Unit Price:
                  </div>
                  <div className="flex md:flex-col flex-row  ga-4">
                    <PriceDataFormatter
                      watchPrice={false}
                      priceData={transaction?.amount}
                      hideFiatPrice
                    />
                    <div className="flex flex-row items-center ml-4 md:ml-0">
                      <div>@&nbsp;</div>
                      <PriceDataFormatter
                        watchPrice={false}
                        priceData={transaction?.unit_price}
                        hideFiatPrice
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Date:
                  </div>
                  <div className="text-white/70 text-xs">
                    {formatLongDate(transaction?.created_at)}
                  </div>
                </div>

                <div className="flex items-center text-xs">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Tx:
                  </div>
                  <AddressChip address={transaction?.tx_hash} linkToExplorer />
                </div>
              </div>
            );
          }}
          itemsPerPage={10}
          initialParams={{
            accountAddress: effectiveAddress,
            includes: "token",
            enabled: !!effectiveAddress && tab === "transactions",
            staleTime: 30_000,
            refetchInterval: 60_000,
          }}
          emptyMessage="No transactions found matching your."
          className="space-y-4 mb-4"
          errorComponent={(error) => (
            <div className="text-center py-12">
              <div className="text-red-400 text-lg mb-2">⚠️</div>
              <div className="text-red-400 text-sm">
                Failed to load transactions
              </div>
            </div>
          )}
          loadingComponent={
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6" />
            </div>
          }
        />
      </div>
    </div>
  );
}
