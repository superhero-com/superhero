import { TokensService } from "@/api/generated/services/TokensService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import TokenListTable from "@/features/trending/components/TokenListTable";

interface AccountCreatedTokenProps {
  address: string;
  tab: string;
}

export default function AccountCreatedToken({
  address,
  tab,
}: AccountCreatedTokenProps) {
  // Token list sorting state shared by Owned/Created
  const [orderBy, setOrderBy] = useState<
    "market_cap" | "name" | "price" | "created_at" | "holders_count"
  >("market_cap");
  const [orderDirection, setOrderDirection] = useState<"ASC" | "DESC">("DESC");
  // Created tokens
  const { data: createdTokensResp, isFetching: loadingCreated } = useQuery({
    queryKey: [
      "TokensService.listAll",
      "created",
      address,
      orderBy,
      orderDirection,
    ],
    queryFn: () =>
      TokensService.listAll({
        creatorAddress: address,
        orderBy,
        orderDirection,
        limit: 100,
        page: 1,
      }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!address && tab === "created",
    staleTime: 60_000,
  });
  return (
    <div className="mt-4">
      {!loadingCreated && (createdTokensResp?.items?.length ?? 0) === 0 && (
        <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="text-4xl mb-3 opacity-30">✨</div>
          <div className="text-white font-semibold mb-1">No created tokens</div>
          <div className="text-white/60 text-sm">
            This user hasn't created any Trendminer tokens yet.
          </div>
        </div>
      )}
      <TokenListTable
        pages={
          createdTokensResp
            ? [{ items: (createdTokensResp.items || []) as any[] }]
            : [{ items: [] }]
        }
        loading={loadingCreated}
        showCollectionColumn={false}
        orderBy={orderBy as any}
        orderDirection={orderDirection}
        onSort={(key) => {
          if (key === "newest") {
            setOrderBy("created_at");
            setOrderDirection("DESC");
          } else if (key === "oldest") {
            setOrderBy("created_at");
            setOrderDirection("ASC");
          } else if (key === orderBy) {
            setOrderDirection(orderDirection === "DESC" ? "ASC" : "DESC");
          } else {
            setOrderBy(key as any);
            setOrderDirection("DESC");
          }
        }}
      />
    </div>
  );
}
