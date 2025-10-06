import { useMemo } from "react";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { PriceDataFormatter } from "@/features/shared/components";
import { AddressChip } from "../../../components/AddressChip";
import { TokenLineChart } from "./TokenLineChart";
import MobileCard from "../../../components/MobileCard";

type PriceMovementTimeframe = '1D' | '7D' | '30D';

interface TokenMobileCardProps {
    token: TokenDto;
    useCollectionRank?: boolean;
    showCollectionColumn?: boolean;
    rank: number;
}

// Helper function to parse collection name
function parseCollectionName(collection: string): string {
    // For now, just return the collection string as is
    // In the Vue version, this was used to extract collection names
    return collection || 'default';
}

// Component for token label
function TokenLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-2 py-1 bg-white/[0.08] text-white/80 rounded-full text-xs font-medium backdrop-blur-[10px]">
            {children}
        </span>
    );
}

export default function TokenMobileCard({
    token,
    useCollectionRank = false,
    showCollectionColumn = false,
    rank,
}: TokenMobileCardProps) {
    const tokenAddress = useMemo(() => {
        return token.address;
    }, [token.address]);

    const collectionRank = useCollectionRank ? (token as any).collection_rank : rank;

    return (
        <MobileCard
            clickable
            variant="filled"
            padding="medium"
            className="mb-3 relative overflow-hidden bg-white/[0.02] border border-white/10 backdrop-blur-[20px] hover:bg-white/[0.05] transition-all duration-300"
        >
            {/* Top row: Rank, Name, Chart */}
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-start gap-1 flex-1 min-w-0">
                    {/* Rank */}
                    <div className="text-white/50 text-sm font-bold w-8 text-center flex-shrink-0">
                        #{collectionRank}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-lg leading-tight mb-1">
                            #{token.symbol || token.name}
                        </div>

                        {/* Collection label if enabled */}
                        {showCollectionColumn && token.collection && (
                            <div className="mb-2">
                                <TokenLabel>
                                    {parseCollectionName(token.collection)}
                                </TokenLabel>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart - compact version for mobile */}

            </div>

            {/* Middle row: Price and Market Cap */}
            <div className="grid grid-cols-2 gap-4 mb-1">
                <div>
                    <div className="text-white/60 text-xs font-medium mb-1">Price</div>
                    <PriceDataFormatter
                        priceData={token.price_data}
                        rowOnSm={false}
                    />
                </div>
                <div>
                    <div className="text-white/60 text-xs font-medium mb-1">Market Cap</div>
                    <PriceDataFormatter
                        bignumber
                        priceData={token.market_cap_data}
                        rowOnSm={false}
                    />
                </div>
            </div>

            {tokenAddress && (
                <div className="pt-2 border-t border-white/10">
                    <TokenLineChart
                        saleAddress={token.sale_address || tokenAddress}
                        height={48}
                        hideTimeframe={true}
                    />
                </div>
            )}

            {/* Link that covers whole card */}
            <a
                href={`/trending/tokens/${encodeURIComponent(token.name || token.address)}`}
                className="absolute inset-0 z-10"
                aria-label={`View details for ${token.name || token.symbol}`}
            />
        </MobileCard>
    );
}
