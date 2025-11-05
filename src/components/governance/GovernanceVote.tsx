import AeButton from "../AeButton";
import { AddressChip } from "../AddressChip";
import { Encoding, isAddressValid } from "@aeternity/aepp-sdk";
import { useAccount, useAeSdk, useGovernance } from "@/hooks";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface GovernanceVoteProps {
  pollId: string;
}
export default function GovernanceVote({
  pollId,
}: GovernanceVoteProps) {
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const {
    usePoll,
    usePollResults,
    useRevokeVote,
    useSubmitVote,
    useDelegation,
    useDelegators,
  } = useGovernance();
  const submitVoteMutation = useSubmitVote();
  const revokeVoteMutation = useRevokeVote();
  const { data: delegation } = useDelegation();
  const { data: delegators = [] } = useDelegators();
  const pollAddress = isAddressValid(pollId, Encoding.ContractAddress) ? pollId : undefined;
  if (!pollAddress) return null;
  const { data: poll } = usePoll(pollAddress);

  const { data: results } = usePollResults(pollAddress);

  const [votingFor, setVotingFor] = useState<number | null>(null);

  const handleVote = async (option: number) => {
    if (votingFor != null) return;
    setVotingFor(option);
    try {
      await submitVoteMutation.mutateAsync({
        pollAddress,
        option,
      });
    } finally {
      setVotingFor(null);
    }
  };

  const handleRevokeVote = () => {
    revokeVoteMutation.mutate(pollAddress);
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };
  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        {/* Back to polls button (outside the card) */}
        <div className="flex items-center mb-2">
          <AeButton
            onClick={() => navigate('/voting')}
            className="shrink-0 px-6 py-3 text-sm font-medium bg-white/5 backdrop-blur-2xl text-white border border-white/20 rounded-2xl transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Polls
            </span>
          </AeButton>
        </div>
        {/* Enhanced Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-pink-400 to-purple-400 rounded-full"></div>
                  <h1 className="text-2xl md:text-4xl font-bold text-white">
                    {poll?.pollState.metadata.title || "Governance Poll"}
                  </h1>
                </div>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
                  {poll?.pollState.metadata.description || "Cast your vote and make your voice heard in the community governance"}
                </p>
                {poll?.pollState.metadata.link && (
                  <a
                    href={poll.pollState.metadata.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-blue-400 hover:text-blue-300 hover:underline break-all"
                  >
                    {poll.pollState.metadata.link}
                  </a>
                )}
                {poll?.pollState.author && (
                  <div className="mt-3 flex items-center gap-2 text-slate-400 text-xs">
                    <span>By:</span>
                    <AddressChip address={poll.pollState.author} linkToProfile />
                  </div>
                )}
              </div>
              {/* Back button moved above card */}
            </div>
          </div>
        </div>

        {/* Enhanced Voting Section */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 md:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Cast Your Vote</h2>
                </div>
              </div>

              <div className="grid gap-4">
                {Object.values(poll?.pollState.vote_options ?? {}).map(
                  (opt, idx) => {
                    const lbl = opt;
                    const isSelected = results?.myVote === idx;
                    const isVotingThis = votingFor === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleVote(idx)}
                        disabled={votingFor != null}
                        className={cn(
                          "group relative p-6 text-left bg-[var(--glass-bg)] backdrop-blur-2xl border-2 border-[var(--glass-border)] rounded-2xl transition-all cursor-pointer touch-manipulation vote-button",
                          "hover:bg-white/5 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20",
                          "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50",
                          isSelected && "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-1 animate-vote-pulse",
                          isVotingThis && "bg-gradient-to-r from-cyan-400 to-blue-400 text-white border-transparent animate-pulse",
                          votingFor && !isVotingThis && "opacity-50 cursor-not-allowed transform-none hover:transform-none hover:shadow-none"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                              isSelected ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
                            )}>
                              {isVotingThis ? (
                                <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : isSelected ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className="text-lg font-bold">{String.fromCharCode(65 + idx)}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-base md:text-lg font-semibold text-white mb-1">{lbl}</p>
                              <p className="text-sm text-slate-400">Click to vote for this option</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span>Selected</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
              {results?.myVote != null && (
                <div className="mt-6">
                  <AeButton
                    onClick={handleRevokeVote}
                    className="w-full md:w-auto bg-transparent text-white border border-white/20 rounded-xl px-6 py-3 transition-all hover:bg-white/5 hover:border-white/30 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Revoke Vote
                    </span>
                  </AeButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Results Section */}
        {results && (
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">Live Results</h2>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-lg">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Total Votes</p>
                      <p className="text-lg font-bold text-white">{results.totalVotes || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(results.options || []).map((opt: any, idx: number) => {
                    const lbl = opt.label || opt;
                    const votes = opt.votes || 0;
                    const total = results.totalVotes || 1;
                    const percentage = getVotePercentage(votes, total);
                    const isWinning = percentage != 0 && percentage === Math.max(
                      ...(results.options || []).map((o: any) => getVotePercentage(o.votes || 0, total))
                    );

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "group relative p-6 bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10 hover:border-white/20 hover:-translate-y-1",
                          isWinning && "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/30 shadow-xl shadow-yellow-500/20 animate-winning-pulse"
                        )}
                      >
                        {isWinning && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all",
                              isWinning ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-slate-300 group-hover:bg-white/20"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">{lbl}</h3>
                              <p className="text-sm text-slate-400">
                                {isWinning ? "Leading option" : "Vote option"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{percentage}%</p>
                            <p className="text-sm text-slate-400">{votes} votes</p>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out relative",
                                isWinning 
                                  ? "bg-gradient-to-r from-yellow-400 to-amber-400" 
                                  : "bg-gradient-to-r from-pink-500 to-purple-500"
                              )}
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                            </div>
                          </div>
                          {percentage > 0 && (
                            <div className="absolute top-0 left-0 h-full w-full">
                              <div
                                className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Account Section */}
        {activeAccount && (
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Your Governance Power</h2>
                </div>

                {decimalBalance && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="group p-6 bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10 hover:border-white/20 hover:-translate-y-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 font-medium mb-1">Account Balance</p>
                          <p className="text-2xl font-bold text-white">{decimalBalance.prettify()} AE</p>
                          <p className="text-xs text-slate-500">Available for voting</p>
                        </div>
                      </div>
                    </div>

                    {delegators.length > 0 && (
                      <div className="group p-6 bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10 hover:border-white/20 hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400 font-medium mb-1">Delegators</p>
                            <p className="text-2xl font-bold text-white">{delegators.length}</p>
                            <p className="text-xs text-slate-500">Trusting your vote</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Delegation Status
                  </h3>
                  
                  {delegation ? (
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl">
                      <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-300 font-medium mb-2">Votes are being delegated to:</p>
                        <p className="text-white font-mono text-sm break-all bg-black/20 px-3 py-2 rounded-lg border border-white/10">
                          {delegation}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Your voting power is being used by this delegate
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-300 font-medium mb-2">No delegation set</p>
                        <p className="text-xs text-slate-500">
                          You are voting directly with your own tokens. Consider delegating to a trusted community member to increase your voting power.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
