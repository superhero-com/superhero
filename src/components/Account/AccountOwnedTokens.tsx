import { PriceDto } from '@/api/generated/models/PriceDto';
import { AccountTokensService } from '@/api/generated/services/AccountTokensService';
import {
  DataTable,
  DataTableResponse,
} from '@/features/shared/components/DataTable/DataTable';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import { Decimal } from '@/libs/decimal';
import { useState } from 'react';

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
    'ASC' | 'DESC'
  >('DESC');

  const fetchOwnedTokens = async (params: any) => {
    const response = (await AccountTokensService.listTokenHolders({
      ...params,
    })) as unknown as Promise<{ items: any[]; meta?: any }>;
    return response as unknown as DataTableResponse<any>;
  };

  function calculateTotalValue(balance: string, price: PriceDto): PriceDto {
    const balanceInDecimal = Decimal.from(balance);
    return Object.entries(price).reduce((acc, [key, value]) => {
      acc[key as keyof PriceDto] = Number(Decimal.from(value).mul(balanceInDecimal).toString());
      return acc;
    }, {} as PriceDto);
  }

  return (
    <div className="mt-3">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b border-white/10 text-[11px] font-semibold text-white/60 uppercase tracking-wide">
          <div>Token</div>
          <div>Price</div>
          <button
            className="text-left hover:opacity-80"
            onClick={() => setOwnedOrderDirection(
              ownedOrderDirection === 'DESC' ? 'ASC' : 'DESC',
            )}
            title="Sort by balance"
          >
            Balance
            {' '}
            {ownedOrderDirection === 'DESC' ? '↓' : '↑'}
          </button>
          <div>Total Value</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          <DataTable
            queryFn={fetchOwnedTokens}
            renderRow={({ item, index }) => {
              const token = item?.token || item;
              const tokenName = token?.name
                || token?.symbol
                || token?.address
                || `Token ${index + 1}`;
              const tokenHref = token?.name || token?.address
                ? `/trends/tokens/${encodeURIComponent(
                  token?.name || token?.address,
                )}`
                : undefined;
              const balance = item?.balance ?? item?.holder_balance ?? item?.amount;
              const balanceData = item?.balance_data;
              const priceData = token?.price_data;

              return (
                <div
                  key={`${token?.address || token?.name || index}`}
                  className="owned-token-row px-4 py-3 md:px-4 md:py-2.5 rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  {/* Compact mobile layout */}
                  <div className="md:hidden">
                    {/* Name on its own row */}
                    <div className="flex items-center min-w-0">
                      <span className="text-white/60 text-[.85em] mr-0.5 align-baseline font-semibold">#</span>
                      {tokenHref ? (
                        <a href={tokenHref} className="token-name text-sm font-bold hover:underline truncate">
                          <span className="bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent font-bold">{tokenName}</span>
                        </a>
                      ) : (
                        <div className="token-name text-sm font-bold truncate">
                          <span className="bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent font-bold">{tokenName}</span>
                        </div>
                      )}
                    </div>

                    {/* Two columns aligned: Price | Amount (with labels) */}
                    <div className="mt-1 grid grid-cols-2 gap-3 items-start">
                      <div>
                        <div className="text-white/60 text-xs font-medium mb-0.5">Price</div>
                        <div className="bg-gradient-to-r text-[12px] from-yellow-400 to-cyan-500 bg-clip-text text-transparent">
                          <PriceDataFormatter watchPrice={false} priceData={priceData} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 text-xs font-medium mb-0.5">Amount</div>
                        <div className="bg-gradient-to-r text-[12px] from-cyan-400 to-blue-500 bg-clip-text text-transparent font-medium">
                          {Decimal.from(balance).div(10 ** (token?.decimals || 18)).prettify()}
                        </div>
                        <div className="mt-0.5 w-full text-left md:text-right" style={{ display: 'flex', justifyContent: 'end' }}>
                          <PriceDataFormatter
                            bignumber
                            watchPrice={false}
                            className="text-[11px] text-white/70"
                            priceData={calculateTotalValue(balance, priceData)}
                            rowOnSm
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop grid layout */}
                  <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
                    <div className="flex items-center min-w-0">
                      <span className="text-white/60 text-[.85em] mr-0.5 align-baseline font-semibold">#</span>
                      {tokenHref ? (
                        <a
                          href={tokenHref}
                          className="token-name text-[15px] font-bold hover:underline truncate"
                        >
                          <span className="bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent font-bold">{tokenName}</span>
                        </a>
                      ) : (
                        <div className="token-name text-[15px] font-bold truncate">
                          <span className="bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent font-bold">{tokenName}</span>
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
                      <div className="bg-gradient-to-r text-sm from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        <PriceDataFormatter
                          bignumber
                          watchPrice={false}
                          priceData={calculateTotalValue(balance, priceData)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
            initialParams={{
              address,
              orderBy: 'balance',
              orderDirection: ownedOrderDirection,
              enabled: !!address && tab === 'owned',
              staleTime: 60_000,
            }}
            itemsPerPage={10}
            emptyMessage="This user doesn't own any Trendminer tokens yet."
            className="space-y-2 md:space-y-1"
          />
        </div>
        <style>
          {`
                .owned-token-row:hover .token-name {
                  background: linear-gradient(to right, #fb923c, #fbbf24);
                  -webkit-background-clip: text;
                  background-clip: text;
                }
                .owned-token-row:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 6px 18px rgba(17, 97, 254, 0.12);
                }
                .owned-token-row:active {
                  transform: translateY(0);
                }
              `}
        </style>
      </div>
    </div>
  );
}
