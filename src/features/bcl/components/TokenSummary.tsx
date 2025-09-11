import React from 'react';
import { Decimal } from '../../../libs/decimal';
import LivePriceFormatter from '../../shared/components/LivePriceFormatter';

interface TokenSummaryProps {
  token: {
    name?: string;
    symbol?: string;
    price?: number | string;
    market_cap?: number | string;
    total_supply?: number | string;
    decimals?: number;
    holders_count?: number;
    address?: string;
    contract_address?: string;
    sale_address?: string;
    created_at?: string;
    dao_balance?: number | string;
  };
  holders?: any[];
  className?: string;
}

export default function TokenSummary({ token, holders, className = '' }: TokenSummaryProps) {
  const formatAe = (n: number): string => {
    if (!isFinite(n)) return '0 AE';
    const normalized = n >= 1e12 ? n / 1e18 : n;
    return `${normalized.toFixed(6)} AE`;
  };

  const formatTokenAmount = (aettos: number, decimals: number = 18, fractionDigits = 0): string => {
    if (!isFinite(aettos)) return '0';
    const units = aettos / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
  };

  const getShortenValue = (value: string | number): string => {
    const decimal = Decimal.from(value);
    return decimal.shorten();
  };

  const formatLongDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={`bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
          Token Information
        </h3>
      </div>

      {/* Token Name */}
      <div className="mb-6">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] text-center">
          <div className="text-xs text-white/60 font-medium mb-2">Token Name</div>
          <div className="text-lg font-bold text-white font-mono tracking-tight">
            {token.symbol || token.name || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Price and Market Cap */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
          <div className="text-xs text-white/60 font-medium mb-2">Price</div>
          <LivePriceFormatter
            aePrice={Decimal.from(token.price || 0)}
            watchKey={token.sale_address}
            className="justify-center"
          />
        </div>
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
          <div className="text-xs text-white/60 font-medium mb-2">Market Cap</div>
          <LivePriceFormatter
            aePrice={Decimal.from(token.market_cap || 0)}
            watchKey={token.sale_address}
            className="justify-center"
          />
        </div>
      </div>

      {/* DAO Balance and Total Supply */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {token.dao_balance && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">DAO Balance</div>
            <LivePriceFormatter
              aePrice={Decimal.from(token.dao_balance)}
              watchKey={token.sale_address}
              className="justify-center"
            />
          </div>
        )}
        {token.total_supply && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">Total Supply</div>
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
            <div className="text-xs text-white/60 font-medium mb-2">Creation Date</div>
            <div className="text-lg font-bold text-white">
              {formatLongDate(token.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* Contract Addresses */}
      <div className="flex flex-col gap-3 mb-6">
        {(token.address || token.contract_address) && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">Contract Address</div>
            <div className="font-mono text-sm text-white bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10">
              {(token.address || token.contract_address || '').slice(0, 8)}…{(token.address || token.contract_address || '').slice(-6)}
            </div>
          </div>
        )}
        {token.sale_address && (
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
            <div className="text-xs text-white/60 font-medium mb-2">Sale Address</div>
            <div className="font-mono text-sm text-white bg-white/[0.05] px-3 py-2 rounded-xl border border-white/10">
              {token.sale_address.slice(0, 8)}…{token.sale_address.slice(-6)}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="text-sm text-white/60 leading-relaxed mb-6 bg-white/[0.05] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px]">
        This token uses a bonding curve: buying mints new tokens at a higher price; selling burns tokens and returns AE along the curve.
        A portion of trades feeds the token's DAO treasury for proposals and payouts.
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {token.sale_address && (
          <a
            href={`/trendminer/dao/${encodeURIComponent(token.sale_address)}`}
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_8px_25px_rgba(147,51,234,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Open DAO
          </a>
        )}
        <a
          href="/trendminer/invite"
          className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white border border-white/10 bg-white/[0.05] no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          Invite & Earn
        </a>
        <a
          href={`https://aescan.io/contracts/${encodeURIComponent((token.sale_address || token.address || '') as string)}?type=call-transactions`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white border border-white/10 bg-white/[0.05] no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          View on æScan ↗
        </a>
      </div>
    </div>
  );
}
