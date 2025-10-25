import MobileInput from "../MobileInput";
import AeButton from "../AeButton";
import { useGovernance, useAccount } from "@/hooks";
import { useEffect, useState } from "react";
import { Encoding, isAddressValid } from "@aeternity/aepp-sdk";
import { formatTokenAmount } from "@/utils/number";

export default function DelegationSettings({ compact = true, defaultCollapsed = true }: { compact?: boolean; defaultCollapsed?: boolean }) {
  const {
    useDelegation,
    useDelegators,
    useSetDelegation,
    useRevokeDelegation,
  } = useGovernance();

  const { balance, activeAccount } = useAccount();
  const { data: delegation } = useDelegation();
  const { data: delegators = [] } = useDelegators();
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
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 rounded-3xl blur-xl -z-10" />
      <div className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl h-full p-4">
        <div className="flex flex-col h-full">
          {/* Main voting power display */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center backdrop-blur-sm border border-green-500/30">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400 font-medium mb-1">Your voting power</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-white">
                  {formatTokenAmount(balance || 0, 18, 2)}
                </span>
                <span className="text-base md:text-lg font-semibold text-slate-300">
                  AE
                </span>
              </div>
              {!activeAccount && (
                <p className="text-xs text-slate-500 mt-1">Connect wallet to see your power</p>
              )}
            </div>
          </div>

          {/* Delegation status */}
          {delegation && (
            <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-xs font-semibold text-purple-300">Delegated</span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">
                {delegation.slice(0, 16)}...{delegation.slice(-10)}
              </p>
            </div>
          )}

          {/* Delegation toggle */}
          <button
            className="no-gradient-text w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between group"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Delegation {!delegation && "(optional)"}
            </span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Delegation controls */}
          {!collapsed && (
            <div className="mt-4 space-y-3 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-400 leading-relaxed">
                Delegate your voting power to another address. You can revoke at any time.
              </p>
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
        </div>
      </div>
    </div>
  );
}


