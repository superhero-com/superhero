import { HeaderLogo as IconGovernance } from "@/icons";
import MobileCard from "../MobileCard";
import MobileInput from "../MobileInput";
import AeButton from "../AeButton";
import { useAccount, useAeSdk, useGovernance } from "@/hooks";
import { useEffect, useState } from "react";
import { Encoding, isAddressValid, toAe } from "@aeternity/aepp-sdk";

export default function GovernanceAccount() {
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const {
    useDelegation,
    useDelegators,
    useSetDelegation,
    useRevokeDelegation,
  } = useGovernance();

  const { data: delegation } = useDelegation();
  const { data: delegators = [], isLoading: delegatorsLoading } = useDelegators();

  // Mutations
  const setDelegationMutation = useSetDelegation();
  const revokeDelegationMutation = useRevokeDelegation();

  const [delegateAddress, setDelegateAddress] = useState<string>(
    delegation || ""
  );

  // Update delegate address when delegation changes
  useEffect(() => {
    setDelegateAddress(delegation || "");
  }, [delegation]);

  const handleSaveDelegation = () => {
    const to = delegateAddress.trim();
    if (isAddressValid(to, Encoding.AccountAddress)) {
      setDelegationMutation.mutate(to);
    }
  };

  const handleRevokeDelegation = () => {
    revokeDelegationMutation.mutate();
    setDelegateAddress("");
  };

  const isSaving = setDelegationMutation.isPending;
  const isRevoking = revokeDelegationMutation.isPending;

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 px-4 md:px-6 py-6 max-w-[min(1200px,100%)] mx-auto">
        {/* Enhanced Header Section */}
        <div className="text-center mb-12 animate-slideInUp">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-2xl shadow-purple-500/25 mb-6 animate-float">
            <IconGovernance className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-4 leading-tight">
            Governance Account
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Manage your voting power, delegate to trusted addresses, and participate in community governance decisions.
          </p>
        </div>

        {/* Account Information Card */}
        {activeAccount && (
          <div className="mb-8 animate-fadeInUp">
            <MobileCard
              variant="elevated"
              padding="large"
              className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                  <span className="text-lg">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Account Information</h2>
                  <p className="text-sm text-slate-400">Your governance account details</p>
                </div>
              </div>

              {delegatorsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : activeAccount ? (
                <div className="grid gap-4">
                  {/* Address */}
                  <div className="group p-5 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                          <span className="text-sm">📍</span>
                        </div>
                        <span className="text-sm font-medium text-slate-300">Wallet Address</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-white bg-black/20 px-3 py-1 rounded-lg">
                          {activeAccount.slice(0, 8)}...{activeAccount.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="group p-5 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                          <span className="text-sm">💰</span>
                        </div>
                        <span className="text-sm font-medium text-slate-300">AE Balance</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {decimalBalance.prettify()} AE
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delegators Count */}
                  {delegators.length > 0 && (
                    <div className="group p-5 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                            <span className="text-sm">🤝</span>
                          </div>
                          <span className="text-sm font-medium text-slate-300">Active Delegators</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {delegators.length}
                          </div>
                          <div className="text-xs text-slate-400">people trust you</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="text-slate-400">Unable to load account information</p>
                </div>
              )}
            </MobileCard>
          </div>
        )}

        {/* Vote Delegation Section */}
        <div className="mb-8 animate-fadeInUp">
          <MobileCard
            variant="elevated"
            padding="large"
            className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                <span className="text-lg">🤝</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Vote Delegation</h2>
                <p className="text-sm text-slate-400">Delegate your voting power to trusted addresses</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Current Delegation Status */}
              {delegation && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-sm">✅</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-300">Currently Delegated</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {delegation.slice(0, 12)}...{delegation.slice(-12)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delegation Input */}
              <div className="space-y-3">
                <MobileInput
                  label="Delegate to address"
                  placeholder="Enter the address you want to delegate to..."
                  value={delegateAddress}
                  onChange={(e) => setDelegateAddress(e.target.value)}
                  variant="filled"
                  size="large"
                  className="transition-all duration-300"
                  disabled={isSaving || isRevoking}
                />
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  💡 Delegating allows another address to vote on your behalf in governance polls. 
                  Choose someone you trust to represent your interests.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <AeButton
                  onClick={handleSaveDelegation}
                  disabled={!delegateAddress.trim() || isSaving || isRevoking}
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={isSaving}
                  className="h-14 text-base font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                >
                  {isSaving ? "Saving Delegation..." : "💾 Save Delegation"}
                </AeButton>

                {delegation && (
                  <AeButton
                    onClick={handleRevokeDelegation}
                    disabled={isSaving || isRevoking}
                    variant="secondary"
                    size="large"
                    fullWidth
                    loading={isRevoking}
                    className="h-14 text-base font-semibold rounded-2xl transition-all duration-300"
                  >
                    {isRevoking ? "Revoking Delegation..." : "❌ Revoke Delegation"}
                  </AeButton>
                )}
              </div>
            </div>

            {/* Delegators List */}
            {delegators.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <span className="text-sm">👥</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Your Delegators</h3>
                    <p className="text-sm text-slate-400">{delegators.length} people trust you with their votes</p>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {delegators.map((delegator: any, idx: number) => (
                    <div
                      key={idx}
                      className="group p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-2xl rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {(delegator.delegator).slice(3, 5).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-mono text-white truncate">
                              {delegator.delegator}
                            </p>
                            <p className="text-xs text-slate-400">Delegator #{idx + 1}</p>
                          </div>
                        </div>
                        {delegator.balance && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-white">
                              {Number(toAe(delegator.balance)).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}
                              {" "}AE
                            </p>
                            <p className="text-xs text-slate-400">Voting Power</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </MobileCard>
        </div>

        {/* Success/Error Messages */}
        {setDelegationMutation.isSuccess && (
          <div className="fixed top-20 right-4 z-50 animate-slideInUp">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">✅</span>
                <div>
                  <p className="font-semibold">Delegation Saved!</p>
                  <p className="text-sm opacity-90">Your voting power has been successfully delegated.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {revokeDelegationMutation.isSuccess && (
          <div className="fixed top-20 right-4 z-50 animate-slideInUp">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="font-semibold">Delegation Revoked!</p>
                  <p className="text-sm opacity-90">You now have full control of your voting power.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(setDelegationMutation.isError || revokeDelegationMutation.isError) && (
          <div className="fixed top-20 right-4 z-50 animate-slideInUp">
            <div className="p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="text-lg">❌</span>
                <div>
                  <p className="font-semibold">Transaction Failed</p>
                  <p className="text-sm opacity-90">Please try again or check your connection.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
