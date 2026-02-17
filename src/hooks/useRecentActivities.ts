import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { recentActivitiesAtom } from '../atoms/dexAtoms';
import type { RecentActivity } from '../components/dex/types/dex';

const MAX_ACTIVITIES_PER_ACCOUNT = 50; // Keep last 50 activities per account

export const useRecentActivities = () => {
  const [recentActivities, setRecentActivities] = useAtom(recentActivitiesAtom);

  const addActivity = useCallback((activity: Omit<RecentActivity, 'timestamp'> & { timestamp?: number }) => {
    const newActivity: RecentActivity = {
      ...activity,
      timestamp: activity.timestamp || Date.now(),
    };

    setRecentActivities((prev) => {
      const accountActivities = prev[newActivity.account] || [];

      // Add new activity at the beginning (most recent first)
      const updatedActivities = [newActivity, ...accountActivities];

      // Keep only the most recent activities (limit per account)
      const trimmedActivities = updatedActivities.slice(0, MAX_ACTIVITIES_PER_ACCOUNT);

      return {
        ...prev,
        [newActivity.account]: trimmedActivities,
      };
    });
  }, [setRecentActivities]);

  const getActivitiesForAccount = useCallback((account: string): RecentActivity[] => recentActivities[account] || [], [recentActivities]);

  const clearActivitiesForAccount = useCallback((account: string) => {
    setRecentActivities((prev) => {
      const updated = { ...prev };
      delete updated[account];
      return updated;
    });
  }, [setRecentActivities]);

  const updateActivityStatus = useCallback((
    account: string,
    txHash: string,
    status: RecentActivity['status'],
  ) => {
    setRecentActivities((prev) => {
      const accountActivities = prev[account] || [];
      const updatedActivities = accountActivities.map((activity) => (activity.hash === txHash
        ? { ...activity, status }
        : activity));

      return {
        ...prev,
        [account]: updatedActivities,
      };
    });
  }, [setRecentActivities]);

  const clearAllActivities = useCallback(() => {
    setRecentActivities({});
  }, [setRecentActivities]);

  return {
    addActivity,
    getActivitiesForAccount,
    clearActivitiesForAccount,
    clearAllActivities,
    updateActivityStatus,
    recentActivities,
  };
};
