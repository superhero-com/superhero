/* eslint-disable */
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenChip } from '@/components/TokenChip';
import { RecentActivity as RecentActivityType } from '../types/dex';
import { CONFIG } from '../../../config';
import {
  useAccount,
  useRecentActivities,
  useTransactionStatus,
} from '../../../hooks';

interface RecentActivityProps {
  recent?: RecentActivityType[]; // Optional prop for backwards compatibility
}

const activityTypeLabelKeys: Record<RecentActivityType['type'], string> = {
  swap: 'activity.swap',
  wrap: 'activity.wrap',
  unwrap: 'activity.unwrap',
  bridge: 'activity.bridge',
  add_liquidity: 'activity.addLiquidity',
  remove_liquidity: 'activity.removeLiquidity',
};

const activityTypeIcons: Record<RecentActivityType['type'], string> = {
  swap: '🔄',
  wrap: '📦',
  unwrap: '📤',
  bridge: '🌉',
  add_liquidity: '💧',
  remove_liquidity: '💧',
};

function formatTimeAgo(timestamp: number, t: (key: string, opts?: { count?: number }) => string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('activity.justNow');
  if (minutes < 60) return t('activity.minutesAgo', { count: minutes });
  if (hours < 24) return t('activity.hoursAgo', { count: hours });
  if (days < 7) return t('activity.daysAgo', { count: days });
  return new Date(timestamp).toLocaleDateString();
}

function formatAmount(amount?: string): string {
  if (!amount) return '';
  const num = parseFloat(amount);
  if (isNaN(num)) return '';
  if (num < 0.01) return '< 0.01';
  if (num < 1) return num.toFixed(3);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

const TransactionStatus = ({
  hash,
  status,
}: {
  hash?: string;
  status?: RecentActivityType['status'];
}) => {
  const { t } = useTranslation('dex');
  if (!hash || !status) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-white/60">{t('activity.pending')}</span>
      </div>
    );
  }

  if (status.failed) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <span className="text-red-400">{t('activity.failed')}</span>
      </div>
    );
  }

  if (status.pending) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-orange-400">{t('activity.pending')}</span>
      </div>
    );
  }

  if (status.confirmed) {
    return (
      <div className="flex items-center gap-1 text-[10px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(76,175,80,0.4)]" />
        <span className="text-green-400">
          {status.confirmations && status.confirmations > 0
            ? t('activity.confirmations', { count: status.confirmations }) + (status.confirmations === 1 ? '' : 's')
            : t('activity.confirmed')}
        </span>
        {status.blockNumber && (
          <span className="text-white/60 opacity-80 ml-1 text-[9px]">
            #
            {status.blockNumber}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      <span className="text-gray-400">{t('activity.unknown')}</span>
    </div>
  );
};

const hasStatusChanged = (
  previous?: RecentActivityType['status'],
  next?: RecentActivityType['status'],
) => (
  !previous
  || !next
  || previous.confirmed !== next.confirmed
  || previous.pending !== next.pending
  || previous.failed !== next.failed
  || previous.blockNumber !== next.blockNumber
  || previous.confirmations !== next.confirmations
);

const RecentActivityItem = ({
  activity,
  index,
  t,
  activeAccount,
  updateActivityStatus,
}: {
  activity: RecentActivityType;
  index: number;
  t: (key: string, opts?: { count?: number }) => string;
  activeAccount?: string;
  updateActivityStatus: (
    account: string,
    txHash: string,
    status: RecentActivityType['status'],
  ) => void;
}) => {
  const { status: fetchedStatus } = useTransactionStatus(activity.hash, {
    enabled: Boolean(activeAccount && activity.hash),
  });
  const txStatus = fetchedStatus ?? activity.status;
  const lastProcessedStatusRef = useRef<RecentActivityType['status']>();

  useEffect(() => {
    if (!activeAccount || !activity.hash || !txStatus) return;
    if (!hasStatusChanged(lastProcessedStatusRef.current, txStatus)) return;

    updateActivityStatus(activeAccount, activity.hash, txStatus);
    lastProcessedStatusRef.current = { ...txStatus };
  }, [activeAccount, activity.hash, txStatus, updateActivityStatus]);

  return (
    <div
      key={`${activity.hash || index}-${activity.timestamp}`}
      className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 transition-all duration-200 ease-out hover:bg-white/[0.05] hover:border-white/15 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-base flex-shrink-0 w-6 text-center">
            {activityTypeIcons[activity.type]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white mb-0.5">
              {t(activityTypeLabelKeys[activity.type])}
            </div>
            <div className="flex flex-row flex-wrap items-center text-[11px] text-white/60  gap-1.5 mb-1">
              {activity.tokenIn && activity.tokenOut && (
                <span>
                  <TokenChip address={activity.tokenIn} />
                  →
                  {' '}
                  <TokenChip address={activity.tokenOut} />
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
                    {formatTimeAgo(activity.timestamp, t)}
                  </div>
                  {activity.hash && CONFIG.EXPLORER_URL && (
                    <a
                      href={`${CONFIG.EXPLORER_URL.replace(
                        /\/$/,
                        '',
                      )}/transactions/${activity.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center w-4 h-4 rounded-md bg-blue-400/10 border border-blue-400/20 no-underline transition-all duration-200 ease-out hover:bg-blue-400/20 hover:border-blue-400/40 hover:scale-110"
                      title={t('activity.viewOnExplorer')}
                    >
                      <span className="text-[10px] text-[#8bc9ff]">
                        🔗
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-0.5">
              <TransactionStatus
                hash={activity.hash}
                status={txStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RecentActivity({
  recent: propRecent,
}: RecentActivityProps) {
  const { t } = useTranslation('dex');
  const { activeAccount } = useAccount();
  const {
    getActivitiesForAccount,
    updateActivityStatus,
    clearActivitiesForAccount,
  } = useRecentActivities();

  // Use prop activities if provided, otherwise get from hook for current account
  const activities = propRecent || (activeAccount ? getActivitiesForAccount(activeAccount) : []);

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
            {t('activity.recentActivity')}
          </span>
        </div>
        <div className="text-center py-8 px-4 text-white/60">
          <div className="text-[32px] mb-3 opacity-60">🔍</div>
          <div className="text-sm font-semibold mb-1 text-white">
            {t('activity.noRecentActivities')}
          </div>
          <div className="text-xs opacity-80">
            {t('activity.defiTransactionsAppearHere')}
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
          {t('activity.recentActivity')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/60 bg-white/[0.05] py-0.5 px-2 rounded-xl border border-white/10">
            {activities.length}
          </span>
          {activities.length > 0 && (
            <button
              onClick={handleClearClick}
              className="flex items-center justify-center w-6 h-6 border-none bg-red-400/10 border border-red-400/20 rounded-md cursor-pointer text-xs transition-all duration-200 ease-out hover:bg-red-400/20 hover:border-red-400/40 hover:scale-105 active:scale-95"
              title={t('activity.clearAll')}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {activities.slice(0, 10).map((activity, i) => (
          <RecentActivityItem
            key={`${activity.hash || i}-${activity.timestamp}`}
            activity={activity}
            index={i}
            t={t}
            activeAccount={activeAccount}
            updateActivityStatus={updateActivityStatus}
          />
        ))}

        {activities.length > 10 && (
          <div className="text-center py-2 mt-1">
            <div className="text-[11px] text-white/60 font-medium opacity-80">
              +
              {activities.length - 10}
              {' '}
              {t('activity.moreActivities')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
