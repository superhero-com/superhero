import { useMemo } from 'react';
import { AccountsService } from '@/api/generated/services/AccountsService';
// @ts-ignore
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
import { CONFIG } from '@/config';
import { useAeSdk } from './useAeSdk';

type Profile = {
  biography?: string;
  avatar_url?: string;
  preferredChainName?: string;
  location?: string;
};

export function useProfile(targetAddress?: string) {
  const { activeAccount, sdk } = useAeSdk();

  const canEdit = useMemo(
    () => !!activeAccount && (!targetAddress || targetAddress === activeAccount),
    [activeAccount, targetAddress],
  );

  async function getProfile(address?: string): Promise<Profile | null> {
    // Fetch profile-like data from backend accounts endpoint and map fields
    try {
      const addr = (address || targetAddress || activeAccount) as string | undefined;
      if (!addr) return null;
      const acct: any = await AccountsService.getAccount({ address: addr });
      if (!acct) return null;
      return {
        biography: acct.bio || undefined,
        avatar_url: acct.avatar_url || undefined,
        preferredChainName: acct.chain_name || undefined,
        location: acct.location || undefined,
      } as Profile;
    } catch {
      return null;
    }
  }

  async function setProfile(data: { biography: string; avatar_url?: string }): Promise<string | undefined> {
    // Persist profile updates by posting a hidden tipping v3 post with the bio content.
    // Avatar updates are not currently supported via tipping and will be ignored.
    const contract = await sdk.initializeContract({
      aci: (TIPPING_V3_ACI as any),
      address: CONFIG.CONTRACT_V3_ADDRESS as `ct_${string}`,
    });
    const res: any = await (contract as any).post_without_tip(data.biography, ['bio-update', 'hidden']);
    // Best-effort: return tx hash if available
    return res?.hash || res?.transactionHash || res?.tx?.hash;
  }

  return {
    canEdit, isConfigured: false, getProfile, setProfile,
  };
}
