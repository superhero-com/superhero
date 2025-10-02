import { useCallback, useMemo } from "react";
import { useAeSdk } from "./useAeSdk";
import { CONFIG } from "../config";
import ACI from "../api/ProfileRegistryACI.json";

type Profile = { biography: string; avatar_url: string };

export function useProfile(targetAddress?: string) {
  const { sdk, activeAccount } = useAeSdk();

  const contractAddress = CONFIG.PROFILE_REGISTRY_ADDRESS as any;
  const isConfigured = !!contractAddress;

  const canEdit = useMemo(
    () =>
      !!activeAccount && (!targetAddress || targetAddress === activeAccount),
    [activeAccount, targetAddress]
  );

  const getProfile = useCallback(
    async (address?: string): Promise<Profile | null> => {
      if (!contractAddress) return null;
      const instance = await sdk.initializeContract({
        aci: (ACI as any).contract,
        address: contractAddress,
      });
      const res = await instance
        .get_profile({
          account: (address || targetAddress || activeAccount) as any,
        })
        .catch(() => undefined);
      const decoded = res?.decodedResult;
      if (!decoded) return null;
      return decoded as Profile;
    },
    [sdk, contractAddress, targetAddress, activeAccount]
  );

  const setProfile = useCallback(
    async (data: { biography: string; avatar_url: string }) => {
      if (!contractAddress) throw new Error("Profile registry not configured");
      if (!activeAccount) throw new Error("No active account");
      const instance = await sdk.initializeContract({
        aci: (ACI as any).contract,
        address: contractAddress,
      });
      const tx = await instance.set_profile(data);
      return tx?.hash as string | undefined;
    },
    [sdk, contractAddress, activeAccount]
  );

  return { canEdit, isConfigured, getProfile, setProfile };
}
