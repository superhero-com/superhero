import MobileCard from "../MobileCard";
import MobileInput from "../MobileInput";
import AeButton from "../AeButton";
import { useGovernance } from "@/hooks";
import { useEffect, useState } from "react";
import { Encoding, isAddressValid } from "@aeternity/aepp-sdk";

export default function DelegationSettings({ compact = true, defaultCollapsed = true }: { compact?: boolean; defaultCollapsed?: boolean }) {
  const {
    useDelegation,
    useSetDelegation,
    useRevokeDelegation,
  } = useGovernance();

  const { data: delegation } = useDelegation();
  const setDelegationMutation = useSetDelegation();
  const revokeDelegationMutation = useRevokeDelegation();

  const [delegateAddress, setDelegateAddress] = useState<string>(delegation || "");
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);

  useEffect(() => {
    setDelegateAddress(delegation || "");
  }, [delegation]);

  const isSaving = setDelegationMutation.isPending;
  const isRevoking = revokeDelegationMutation.isPending;

  const handleSave = () => {
    const to = delegateAddress.trim();
    if (isAddressValid(to, Encoding.AccountAddress)) {
      setDelegationMutation.mutate(to);
    }
  };

  const handleRevoke = () => {
    revokeDelegationMutation.mutate();
    setDelegateAddress("");
  };

  return (
    <MobileCard
      variant="outlined"
      padding={compact ? "small" : "large"}
      className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <span className="text-sm">🤝</span>
          </div>
          <div>
            <h3 className="m-0 text-white text-base font-semibold">Delegation Settings</h3>
            {delegation && !collapsed && (
              <p className="m-0 text-xs text-slate-400">Currently: {delegation.slice(0, 12)}...{delegation.slice(-12)}</p>
            )}
          </div>
        </div>
        <button
          className="no-gradient-text px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          <MobileInput
            label="Delegate to address"
            placeholder="ak_..."
            value={delegateAddress}
            onChange={(e) => setDelegateAddress(e.target.value)}
            variant="filled"
            size={compact ? "medium" : "large"}
            disabled={isSaving || isRevoking}
          />

          <div className="flex gap-2 flex-wrap">
            <AeButton
              onClick={handleSave}
              disabled={!delegateAddress.trim() || isSaving || isRevoking}
              variant="primary"
              size={compact ? "medium" : "large"}
              loading={isSaving}
            >
              Save Delegation
            </AeButton>
            {delegation && (
              <AeButton
                onClick={handleRevoke}
                disabled={isSaving || isRevoking}
                variant="secondary"
                size={compact ? "medium" : "large"}
                loading={isRevoking}
              >
                Revoke
              </AeButton>
            )}
          </div>
        </div>
      )}
    </MobileCard>
  );
}


