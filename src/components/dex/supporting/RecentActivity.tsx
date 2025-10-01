import React, { useEffect, useState, useRef } from "react";
import { RecentActivity as RecentActivityType } from "../types/dex";
import { CONFIG } from "../../../config";
import {
  useAccount,
  useRecentActivities,
  useMultipleTransactionStatus,
} from "../../../hooks";
import { TokenChip } from "@/components/TokenChip";

interface RecentActivityProps {
  recent?: RecentActivityType[]; // Optional prop for backwards compatibility
}

const activityTypeLabels: Record<RecentActivityType["type"], string> = {
  swap: "Swap",
  wrap: "Wrap",
  unwrap: "Unwrap",
  bridge: "ETH Bridge",
  add_liquidity: "Add Liquidity",
  remove_liquidity: "Remove Liquidity",
};

const activityTypeIcons: Record<RecentActivityType["type"], string> = {
  swap: "🔄",
  wrap: "📦",
  unwrap: "📤",
  bridge: "🌉",
  add_liquidity: "💧",
  remove_liquidity: "💧",
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatAmount(amount?: string): string {
  if (!amount) return "";
  const num = parseFloat(amount);
  if (isNaN(num)) return "";
  if (num < 0.01) return "< 0.01";
  if (num < 1) return num.toFixed(3);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

function TransactionStatus({
  hash,
  status,
}: {
  hash?: string;
  status?: RecentActivityType["status"];
}) {
  if (!hash || !status) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
        <span className="text-white/60">Pending</span>
      </div>
    );
  }

  if (status.failed) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
        <span className="text-red-400">Failed</span>
      </div>
    );
  }

  if (status.pending) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
        <span className="text-orange-400">Pending</span>
      </div>
    );
  }

  if (status.confirmed) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(76,175,80,0.4)]"></span>
        <span className="text-green-400">
          {status.confirmations && status.confirmations > 0
            ? `${status.confirmations} conf${
                status.confirmations === 1 ? "" : "s"
              }`
            : "Confirmed"}
        </span>
        {status.blockNumber && (
          <span className="text-white/60 opacity-80 ml-1 text-[9px]">
            #{status.blockNumber}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
      <span className="text-gray-400">Unknown</span>
    </div>
  );
}

export default function RecentActivity({
  recent: propRecent,
}: RecentActivityProps) {
  const { activeAccount } = useAccount();
  const {
    getActivitiesForAccount,
    updateActivityStatus,
    clearActivitiesForAccount,
  } = useRecentActivities();

  // Use prop activities if provided, otherwise get from hook for current account
  const activities =
    propRecent || (activeAccount ? getActivitiesForAccount(activeAccount) : []);

  // Extract transaction hashes for status fetching
  const txHashes = activities
    .filter((activity) => activity.hash)
    .map((activity) => activity.hash!)
    .slice(0, 10); // Only fetch status for first 10 activities

  // Fetch transaction statuses
  const { statuses: txStatuses } = useMultipleTransactionStatus(txHashes, {
    enabled: txHashes.length > 0,
  });

  // Keep track of last processed statuses to avoid unnecessary updates
  const lastProcessedStatusesRef = useRef<Record<string, any>>({});

  // Update stored activity statuses when new status data is available
  useEffect(() => {
    if (!activeAccount || !txStatuses || Object.keys(txStatuses).length === 0)
      return;

    // Check if statuses have actually changed
    const statusesChanged = Object.entries(txStatuses).some(
      ([txHash, status]) => {
        const lastStatus = lastProcessedStatusesRef.current[txHash];
        return (
          !lastStatus ||
          lastStatus.confirmed !== status.confirmed ||
          lastStatus.pending !== status.pending ||
          lastStatus.failed !== status.failed ||
          lastStatus.blockNumber !== status.blockNumber ||
          lastStatus.confirmations !== status.confirmations
        );
      }
    );

    if (!statusesChanged) return;

    // Update each activity's status in storage
    Object.entries(txStatuses).forEach(([txHash, status]) => {
      updateActivityStatus(activeAccount, txHash, status);
      // Track the processed status
      lastProcessedStatusesRef.current[txHash] = { ...status };
    });
  }, [txStatuses, activeAccount, updateActivityStatus]);

  const handleClearClick = () => {
    if (!activeAccount) return;

    clearActivitiesForAccount(activeAccount);
  };

  if (!activities.length) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
          <span className="text-base">📊</span>
          <span className="text-base font-bold text-white flex-1">
            Recent Activity
          </span>
        </div>
        <div className="text-center py-8 px-4 text-white/60">
          <div className="text-[32px] mb-3 opacity-60">🔍</div>
          <div className="text-sm font-semibold mb-1 text-white">
            No recent activities
          </div>
          <div className="text-xs opacity-80">
            Your DEX transactions will appear here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 backdrop-blur-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
        <span className="text-base">📊</span>
        <span className="text-base font-bold text-white flex-1">
          Recent Activity
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/60 bg-white/[0.05] py-0.5 px-2 rounded-xl border border-white/10">
            {activities.length}
          </span>
          {activities.length > 0 && (
            <button
              onClick={handleClearClick}
              className="flex items-center justify-center w-6 h-6 border-none bg-red-400/10 border border-red-400/20 rounded-md cursor-pointer text-xs transition-all duration-200 ease-out hover:bg-red-400/20 hover:border-red-400/40 hover:scale-105 active:scale-95"
              title="Clear all activities"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {activities.slice(0, 10).map((activity, i) => {
          const txStatus = activity.hash
            ? txStatuses[activity.hash]
            : undefined;

          return (
            <div
              key={`${activity.hash || i}-${activity.timestamp}`}
              className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 transition-all duration-200 ease-out hover:bg-white/[0.05] hover:border-white/15 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-base flex-shrink-0 w-6 text-center">
                    {activityTypeIcons[activity.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white mb-0.5">
                      {activityTypeLabels[activity.type]}
                    </div>
                    <div className="flex flex-row flex-wrap items-center text-[11px] text-white/60  gap-1.5 mb-1">
                      {activity.tokenIn && activity.tokenOut && (
                        <span>
                          <TokenChip address={activity.tokenIn} />
                          → <TokenChip address={activity.tokenOut} />
                        </span>
                      )}

                      <div className="flex-1 flex justify-between items-center gap-2 ">
                        {activity.amountIn && (
                          <span className="font-semibold text-[#4caf50]">
                            {formatAmount(activity.amountIn)}
                          </span>
                        )}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-[10px] text-white/60 font-medium whitespace-nowrap">
                            {formatTimeAgo(activity.timestamp)}
                          </div>
                          {activity.hash && CONFIG.EXPLORER_URL && (
                            <a
                              href={`${CONFIG.EXPLORER_URL.replace(
                                /\/$/,
                                ""
                              )}/transactions/${activity.hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center w-4 h-4 rounded-md bg-blue-400/10 border border-blue-400/20 no-underline transition-all duration-200 ease-out hover:bg-blue-400/20 hover:border-blue-400/40 hover:scale-110"
                              title="View on explorer"
                            >
                              <span className="text-[10px] text-[#8bc9ff]">
                                🔗
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Status */}
                    {/* <div className="mt-0.5">
                      <TransactionStatus
                        hash={activity.hash}
                        status={txStatus}
                      />
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {activities.length > 10 && (
          <div className="text-center py-2 mt-1">
            <div className="text-[11px] text-white/60 font-medium opacity-80">
              +{activities.length - 10} more activities
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
