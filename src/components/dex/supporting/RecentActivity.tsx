import React from 'react';
import { RecentActivity as RecentActivityType } from '../types/dex';
import { CONFIG } from '../../../config';
import { useAccount, useRecentActivities } from '../../../hooks';
import './RecentActivity.scss';

interface RecentActivityProps {
  recent?: RecentActivityType[]; // Optional prop for backwards compatibility
}

const activityTypeLabels: Record<RecentActivityType['type'], string> = {
  swap: 'Swap',
  wrap: 'Wrap',
  unwrap: 'Unwrap',
  bridge: 'ETH Bridge',
  add_liquidity: 'Add Liquidity',
  remove_liquidity: 'Remove Liquidity',
};

const activityTypeIcons: Record<RecentActivityType['type'], string> = {
  swap: '🔄',
  wrap: '📦',
  unwrap: '📤',
  bridge: '🌉',
  add_liquidity: '💧',
  remove_liquidity: '💧',
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
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

export default function RecentActivity({ recent: propRecent }: RecentActivityProps) {
  const { activeAccount } = useAccount();
  const { getActivitiesForAccount } = useRecentActivities();
  
  // Use prop activities if provided, otherwise get from hook for current account
  const activities = propRecent || (activeAccount ? getActivitiesForAccount(activeAccount) : []);
  
  if (!activities.length) {
    return (
      <div className="recent-activity-container">
        <div className="recent-activity-header">
          <span className="recent-activity-icon">📊</span>
          <span className="recent-activity-title">Recent Activity</span>
        </div>
        <div className="recent-activity-empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">No recent activities</div>
          <div className="empty-subtext">Your DEX transactions will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity-container">
      <div className="recent-activity-header">
        <span className="recent-activity-icon">📊</span>
        <span className="recent-activity-title">Recent Activity</span>
        <span className="recent-activity-count">{activities.length}</span>
      </div>
      
      <div className="recent-activity-list">
        {activities.slice(0, 10).map((activity, i) => (
          <div key={`${activity.hash || i}-${activity.timestamp}`} className="activity-item">
            <div className="activity-main">
              <div className="activity-left">
                <span className="activity-type-icon">
                  {activityTypeIcons[activity.type]}
                </span>
                <div className="activity-details">
                  <div className="activity-type">
                    {activityTypeLabels[activity.type]}
                  </div>
                  <div className="activity-tokens">
                    {activity.tokenIn && activity.tokenOut && (
                      <span>
                        {activity.tokenIn} → {activity.tokenOut}
                      </span>
                    )}
                    {activity.amountIn && (
                      <span className="activity-amount">
                        {formatAmount(activity.amountIn)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="activity-right">
                <div className="activity-time">
                  {formatTimeAgo(activity.timestamp)}
                </div>
                {activity.hash && CONFIG.EXPLORER_URL && (
                  <a 
                    href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${activity.hash}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="activity-link"
                    title="View on explorer"
                  >
                    <span className="activity-link-icon">🔗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activities.length > 10 && (
          <div className="activity-more">
            <div className="activity-more-text">
              +{activities.length - 10} more activities
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
