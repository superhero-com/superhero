import { useMemo } from "react";
import { useAeSdk } from "./useAeSdk";

type Profile = { biography: string; avatar_url: string };

export function useProfile(targetAddress?: string) {
  const { activeAccount } = useAeSdk();

  const canEdit = useMemo(
    () =>
      !!activeAccount && (!targetAddress || targetAddress === activeAccount),
    [activeAccount, targetAddress]
  );

  async function getProfile(): Promise<Profile | null> {
    // Legacy on-chain profile registry has been deprecated. Consumers should
    // fetch profile-related data via backend endpoints (e.g., AccountsService)
    // or rely on the tipping post feed. We keep this for backward compatibility
    // and return null to indicate absence of registry data.
    return null;
  }

  return { canEdit, isConfigured: false, getProfile, setProfile: undefined as unknown as never };
}
