import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import { Separator } from "@/components/ui/separator";
import CopyText from "@/components/ui/CopyText";

import { useAeSdk } from "@/hooks/useAeSdk";
import { useAccountBalances } from "@/hooks/useAccountBalances";
import { AccountTokensService } from "@/api/generated/services/AccountTokensService";

type Currency = "usd" | "eur" | "cny";

type WalletOverviewCardProps = {
  selectedCurrency?: Currency;
  prices?: Record<string, number> | null;
  className?: string;
};

export default function WalletOverviewCard({
  selectedCurrency = "usd",
  prices = null,
  className,
}: WalletOverviewCardProps) {
  const navigate = useNavigate();
  const { activeAccount, currentBlockHeight } = useAeSdk();
  const { decimalBalance } = useAccountBalances(activeAccount);

  // Persisted expand/collapse state
  const [open, setOpen] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("walletCard.open") === "1"
      : false
  );
  useEffect(() => {
    try {
      localStorage.setItem("walletCard.open", open ? "1" : "0");
    } catch {}
  }, [open]);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const balanceAe = useMemo(() => Number(decimalBalance?.toString() || 0), [
    decimalBalance,
  ]);

  const aeFiat = useMemo(() => {
    if (!prices || prices[selectedCurrency] == null) return null;
    return balanceAe * Number(prices[selectedCurrency]);
  }, [prices, selectedCurrency, balanceAe]);

  // Top 3 holdings by balance from backend (fallbacks handled by caller later if needed)
  const { data: topHoldingsResp } = useQuery({
    queryKey: [
      "AccountTokensService.listTokenHolders-top3",
      activeAccount,
    ],
    queryFn: () =>
      AccountTokensService.listTokenHolders({
        address: activeAccount,
        orderBy: "balance" as any,
        orderDirection: "DESC" as any,
        limit: 3,
      }) as unknown as Promise<{ items: any[] }>,
    enabled: !!activeAccount,
    staleTime: 60_000,
  });

  const topHoldings = useMemo(() => topHoldingsResp?.items ?? [], [
    topHoldingsResp,
  ]);

  if (!activeAccount) {
    return (
      <div
        className={
          "grid gap-2 " +
          (className || "")
        }
      >
        <div className="py-1">
          <div className="text-[13px] text-[var(--light-font-color)] uppercase tracking-wide mb-1">
            AE Price
          </div>
          <div className="text-2xl font-extrabold text-[var(--standard-font-color)]">
            {prices?.[selectedCurrency]
              ? formatPrice(prices[selectedCurrency], selectedCurrency)
              : "-"}
          </div>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-white/5">
          <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
            Node Connection
          </span>
          <span
            className={`text-[12px] font-semibold ${
              isOnline
                ? "text-[var(--neon-green)]"
                : "text-[var(--neon-pink)]"
            }`}
          >
            {isOnline ? "🟢 Connected" : "🔴 Offline"}
          </span>
        </div>
        {currentBlockHeight != null && (
          <div className="flex justify-between items-center py-2">
            <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
              Block
            </span>
            <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
              #{Number(currentBlockHeight).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }

  const short = `${activeAccount.slice(0, 6)}...${activeAccount.slice(-4)}`;

  return (
    <div className={"grid gap-2 " + (className || "")}>
      {/* Summary Row */}
      <div className="py-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">👛</span>
            <h4 className="m-0 text-white text-base font-bold">Your Wallet</h4>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => navigate(`/users/${activeAccount}`)}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 text-[var(--light-font-color)]"
            >
              VIEW PROFILE
            </button>
            <button
              type="button"
              aria-label={open ? "Collapse wallet" : "Expand wallet"}
              aria-expanded={open}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 text-[var(--light-font-color)]"
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            >
              {open ? "▲" : "▼"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AddressAvatarWithChainName
            isHoverEnabled={false}
            address={activeAccount}
            size={36}
            overlaySize={18}
            showBalance={false}
            showAddressAndChainName={false}
            showPrimaryOnly={false}
            hideFallbackName={true}
            contentClassName="px-0 pb-0"
          />

          <div className="min-w-0">
            <div className="font-semibold text-[var(--standard-font-color)] leading-tight">
              {short}
            </div>
            <div className="text-[11px] text-[var(--light-font-color)]">
              {balanceAe.toLocaleString(undefined, { maximumFractionDigits: 6 })} AE
              {aeFiat != null && (
                <>
                  {" "}
                  <span className="opacity-70">·</span>{" "}
                  <span>
                    ≈ {formatPrice(aeFiat, selectedCurrency)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`text-[12px] font-semibold ${
                isOnline
                  ? "text-[var(--neon-green)]"
                  : "text-[var(--neon-pink)]"
              }`}
              title={isOnline ? "Connected" : "Offline"}
              role="status"
              aria-live="polite"
            >
              {isOnline ? "●" : "○"}
            </span>
            {currentBlockHeight != null && (
              <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                #{Number(currentBlockHeight).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {open && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <CopyText value={activeAccount} className="flex-1 min-w-[220px]" />
          </div>

          <Separator className="my-3" />

          <div className="grid gap-2">
            <div className="text-xs text-white/70 font-medium">Top Holdings</div>
            {topHoldings.length === 0 ? (
              <div className="text-xs text-white/60">
                No holdings found. Explore trending tokens to get started.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {topHoldings.map((it: any, idx: number) => {
                  const label = getTokenLabelSafe(it);
                  const balanceLabel = getBalanceLabelSafe(it);
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="truncate text-white/80" title={label}>
                        {label}
                      </div>
                      <div className="text-white font-mono">
                        {balanceLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPrice(value: number, currency: string): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  });
  try {
    return formatter.format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatCompact(value: number): string {
  try {
    // Use Intl compact notation when available
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return String(value);
  }
}

function getTokenLabelSafe(item: any): string {
  try {
    const token = item?.token || {};
    const label =
      item?.token_symbol ||
      item?.symbol ||
      token?.symbol ||
      item?.token_name ||
      item?.name ||
      token?.name ||
      item?.address ||
      token?.address;
    if (typeof label === "string") return label;
    return "Token";
  } catch {
    return "Token";
  }
}

function getBalanceLabelSafe(item: any): string {
  const raw = item?.balance ?? item?.amount ?? item?.token_balance;
  if (raw == null) return "—";
  const n = Number(raw);
  if (!isFinite(n)) return "—";
  return formatCompact(n);
}


