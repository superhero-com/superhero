import React from 'react';
import { AddressChip } from '@/components/AddressChip';
import { PriceDto } from '@/api/generated';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import { toAe } from '@aeternity/aepp-sdk';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import LivePriceFormatter from '../../shared/components/LivePriceFormatter';
import { Decimal } from '../../../libs/decimal';

interface TokenSummaryProps {
  token: TokenDto;
  className?: string;
}

const TokenSummary = ({
  token,
  className = '',
}: TokenSummaryProps) => {
  const getShortenValue = (value: string | number): string => Decimal.from(toAe(value)).shorten();

  const formatLongDate = (dateString: string): string => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={`${className} p-0 bg-transparent border-0 rounded-none shadow-none backdrop-blur-none sm:p-6 sm:bg-white/[0.02] sm:border sm:border-white/10 sm:rounded-[24px] sm:shadow-[0_4px_20px_rgba(0,0,0,0.1)] sm:backdrop-blur-[20px]`}
    >
      {/* Header */}
      <div className="mb-6 hidden sm:block">
        <h3 className="text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
          Token Information
        </h3>
      </div>

      {/* Token Name */}
      <div className="mb-6">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
          <div className="text-xs text-white/60 font-medium mb-2">
            Token Name
          </div>
          <div className="text-lg font-bold text-white font-mono tracking-tight">
            {token.symbol || token.name || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Price and Market Cap */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-[10px]">
          <div className="text-xs text-white/60 font-medium mb-2">Price</div>
          <PriceDataFormatter
            className="text-xs sm:text-base"
            watchPrice={!!token.sale_address}
            priceData={token.price_data as PriceDto}
          />
        </div>
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-[10px]">
          <div className="text-xs text-white/60 font-medium mb-2">
            Market Cap
          </div>
          <PriceDataFormatter
            watchKey={token.sale_address}
            bignumber
            priceData={token.market_cap_data}
            className="text-xs sm:text-base"
          />
        </div>
      </div>

      {/* DAO Balance and Total Supply */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {token.dao_balance && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">
              DAO Balance
            </div>
            <LivePriceFormatter
              aePrice={Decimal.from(toAe(token.dao_balance))}
              watchKey={token.sale_address}
              className="text-xs sm:text-base"
            />
          </div>
        )}
        {token.total_supply && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">
              Total Supply
            </div>
            <div className="text-lg font-bold text-white text-center">
              {getShortenValue(token.total_supply)}
            </div>
            <div className="text-sm text-white/60 text-center mt-1">tokens</div>
          </div>
        )}
      </div>

      {/* Creation Date */}
      {token.created_at && (
        <div className="mb-6">
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
            <div className="text-xs text-white/60 font-medium mb-2">
              Creation Date
            </div>
            <div className="text-lg font-bold text-white">
              {formatLongDate(token.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* Contract Addresses */}
      <div className="flex flex-col gap-3 mb-6">
        {(token.address || token.creator_address) && (
          <div className="flex items-center gap-2 justify-between bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium">
              Contract Address:
            </div>
            <AddressChip address={token.address} linkToExplorer />
          </div>
        )}
        {token.sale_address && (
          <div className="flex items-center gap-2 justify-between bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium">
              Sale Address:
            </div>
            <AddressChip address={token.sale_address} linkToExplorer />
          </div>
        )}
        {token.creator_address && (
          <div className="flex items-center gap-2 justify-between bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium">
              Created By:
            </div>
            <AddressAvatarWithChainName address={token.creator_address} />
          </div>
        )}
      </div>

      {/* Description */}
      <div className="text-sm text-white/60 leading-relaxed mb-6 bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
        This token uses a bonding curve: buying mints new tokens at a higher
        price; selling burns tokens and returns AE along the curve. A portion of
        trades feeds the token&apos;s DAO treasury for proposals and payouts.
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {token.sale_address && (
          <a
            href={`/trends/dao/${encodeURIComponent(token.sale_address)}`}
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Open DAO
          </a>
        )}
        <div className="flex gap-3 ">
          <a
            href="/trends/invite"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white border border-white/10 bg-white/[0.05] no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            Invite & Earn
          </a>
          <a
            href={`https://aescan.io/contracts/${encodeURIComponent(
            (token.sale_address || token.address || '') as string,
            )}?type=call-transactions`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white border border-white/10 bg-white/[0.05] no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            View on æScan ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default TokenSummary;
