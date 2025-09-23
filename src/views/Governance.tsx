import React, { useEffect, useState } from 'react';
import { Encoding, isAddressValid } from '@aeternity/aepp-sdk';
import Shell from '../components/layout/Shell';
import RightRail from '../components/layout/RightRail';
import AeButton from '../components/AeButton';
import MobileInput from '../components/MobileInput';
import MobileCard from '../components/MobileCard';
import { Link, useParams, useLocation } from 'react-router-dom';
import { HeaderLogo as IconGovernance } from '../icons';

import { useWallet, useGovernance } from '../hooks';
type TabType = 'polls' | 'vote' | 'account';

export default function Governance() {
  const { id: pollId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('polls');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  // State for UI
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('open');
  const [search, setSearch] = useState<string>('');
  
  // Hooks
  const { address } = useWallet();
  const {
    usePolls,
    usePoll,
    usePollResults,
    useMyVote,
    useDelegation,
    useDelegators,
    useAccount,
    useSubmitVote,
    useRevokeVote,
    useSetDelegation,
    useRevokeDelegation,
  } = useGovernance();
  
  // Queries
  const { data: polls = [] } = usePolls({ status, search });
  const { data: poll } = usePoll(
    isAddressValid(pollId, Encoding.ContractAddress) ? pollId : undefined
  );
  const { data: results } = usePollResults(pollId || '');
  const { data: myVote } = useMyVote(pollId || '');
  const { data: delegation = { to: null } } = useDelegation();
  const { data: delegators = [] } = useDelegators(address || '');
  const { data: account } = useAccount(address || '');
  
  // Mutations
  const submitVoteMutation = useSubmitVote();
  const revokeVoteMutation = useRevokeVote();
  const setDelegationMutation = useSetDelegation();
  const revokeDelegationMutation = useRevokeDelegation();
  
  const [delegateAddress, setDelegateAddress] = useState<string>(delegation?.to || '');

  // Update delegate address when delegation changes
  useEffect(() => {
    setDelegateAddress(delegation?.to || '');
  }, [delegation?.to]);

  // Determine active tab based on URL
  useEffect(() => {
    if (pollId) {
      setActiveTab('vote');
    } else if (location.pathname.includes('/account')) {
      setActiveTab('account');
    } else {
      setActiveTab('polls');
    }
  }, [pollId, location.pathname]);

  // Data is now loaded automatically by React Query hooks

  const handleSaveDelegation = () => {
    if (delegateAddress.trim()) {
      setDelegationMutation.mutate({ to: delegateAddress.trim() });
    }
  };

  const handleRevokeDelegation = () => {
    revokeDelegationMutation.mutate();
    setDelegateAddress('');
  };

  const handleVote = async (option: string) => {
    if (pollId && !isVoting) {
      setIsVoting(true);
      setSelectedVote(option);
      
      try {
        await submitVoteMutation.mutateAsync({ pollId, option: String(option) });
        // Add a small delay for better UX
        setTimeout(() => {
          setIsVoting(false);
          setSelectedVote(null);
        }, 1000);
      } catch (error) {
        setIsVoting(false);
        setSelectedVote(null);
      }
    }
  };

  const handleRevokeVote = () => {
    if (pollId) {
      revokeVoteMutation.mutate(pollId);
    }
  };

  const getStatusColor = (status: 'open' | 'closed') => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'status-open';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-unknown';
    }
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const renderPollsTab = () => (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6 py-5">
        <div className="flex items-center gap-4">
          <div className="header-text">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent m-0">
              Governance
            </h2>
            <p className="text-sm text-slate-400 font-normal mt-1 mb-0">
              Shape the future of the ecosystem
            </p>
          </div>
        </div>
      </div>
      
      {/* Enhanced Mobile Controls */}
      <div className="flex flex-col gap-4 mb-6 sticky top-0 z-10 bg-[var(--background-color)] backdrop-blur-lg py-4 -my-4">
        <div className="w-full">
          <MobileInput
            label="Search polls"
            placeholder="Find polls by title or description..."
            value={search}
            onChange={(e) => { 
              setSearch(e.target.value); 
            }}
            variant="filled"
            size="large"
            className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 focus-within:border-[var(--neon-teal)] focus-within:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus-within:-translate-y-px"
          />
        </div>
        
        <div className="w-full">
          <MobileInput
            as="select"
            label="Filter by status"
            value={status}
            onChange={(e) => { 
              if (e.target.value !== 'all' && e.target.value !== 'open' && e.target.value !== 'closed') {
                throw new Error('Invalid status');
              }
              setStatus(e.target.value); 
            }}
            variant="filled"
            size="large"
            className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 focus-within:border-[var(--neon-teal)] focus-within:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus-within:-translate-y-px"
          >
            <option value="all">All polls</option>
            <option value="open">🟢 Open polls</option>
            <option value="closed">🔴 Closed polls</option>
          </MobileInput>
        </div>
      </div>

      {/* Enhanced Polls Grid */}
      <div className="my-5">
        {polls.length === 0 ? (
          <MobileCard variant="outlined" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl">
            <div className="text-center py-16 px-5 animate-[slideIn_0.5s_ease-out]">
              <div className="text-5xl mb-4 block">🗳️</div>
              <h3 className="m-0 mb-2 text-white text-xl font-semibold">No polls found</h3>
              <p className="m-0 text-slate-400 text-sm leading-relaxed">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          </MobileCard>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {polls.map((p, index) => (
              <Link to={`/voting/p/${p.poll}`} key={p.id} className="text-inherit no-underline block">
                <MobileCard 
                  variant="elevated" 
                  padding="medium" 
                  clickable 
                  className={`bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/20 overflow-hidden relative group animate-[slideIn_0.5s_ease-out] [animation-delay:${index * 0.1}s]`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="font-bold text-lg leading-snug text-white flex-1">
                        {p.title}
                      </div>
                      <div className={`px-3 py-1.5 rounded-2xl text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                        p.status?.toLowerCase() === 'open' 
                          ? 'bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-400 border border-green-500/30'
                          : p.status?.toLowerCase() === 'closed'
                          ? 'bg-gradient-to-br from-red-500/20 to-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-gradient-to-br from-gray-500/20 to-gray-500/10 text-gray-400 border border-gray-500/30'
                      }`}>
                        {p.status || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm text-slate-400 font-medium">
                        <span className="text-sm">👥</span>
                        {p.voteCount} votes
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-slate-400 font-medium">
                        <span className="text-sm">⏰</span>
                        {new Date(p.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </MobileCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderVoteTab = () => (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6 py-5">
        <div className="flex items-center gap-4">
          <div className="header-text">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent m-0">
              {poll?.pollState.metadata.title || 'Poll'}
            </h2>
            <p className="text-sm text-slate-400 font-normal mt-1 mb-0">
              Cast your vote and make your voice heard
            </p>
          </div>
        </div>
        <AeButton 
          onClick={() => setActiveTab('polls')}
          className="ml-auto px-4 py-2.5 text-sm h-10 bg-black/20 backdrop-blur-lg text-slate-400 border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/15 hover:-translate-y-px"
        >
          ← Back to Polls
        </AeButton>
      </div>

      {/* Enhanced Voting Section */}
      <div className="mb-6">
        <MobileCard variant="elevated" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white mb-0 flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-[var(--neon-teal)] before:rounded-sm">
              🗳️ Cast Your Vote
            </h3>
            {poll?.pollState.metadata.description && (
              <p className="text-sm text-slate-400 leading-relaxed mt-2 mb-0 max-h-16 overflow-hidden relative after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-10 after:h-5 after:bg-gradient-to-l after:from-[var(--background-color)] after:pointer-events-none">
                {poll.pollState.metadata.description}
              </p>
            )}
          </div>
          
          {myVote && (
            <div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl mb-5 backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span className="text-sm text-slate-400 font-medium">
                  You voted for: <strong className="text-green-400 font-semibold">{myVote?.option || myVote}</strong>
                </span>
              </div>
              <AeButton 
                onClick={handleRevokeVote} 
                className="bg-transparent text-white border border-white/20 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/30 hover:-translate-y-px"
              >
                🔄 Change Vote
              </AeButton>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(Object.values(poll?.pollState.vote_options ?? {})).map((opt, idx) => {
              const val = idx.toString();
              const lbl = opt;
              const isSelected = selectedVote === val;
              const isVotingThis = isVoting && isSelected;
              
              return (
                <button 
                  key={val} 
                  onClick={() => handleVote(val)}
                  disabled={isVoting}
                  className={`h-14 text-base font-semibold bg-black/20 backdrop-blur-lg text-white border-2 border-white/10 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer touch-manipulation min-h-12 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5'
                      : isVotingThis
                      ? 'bg-gradient-to-r from-[var(--neon-teal)] to-blue-400 text-white border-transparent animate-pulse'
                      : 'hover:bg-white/5 hover:border-[var(--neon-teal)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
                  } ${
                    isVoting ? 'opacity-60 cursor-not-allowed transform-none' : ''
                  } active:scale-98 transition-transform duration-100`}
                >
                  <span className="flex-1 text-center">{lbl}</span>
                  {isVotingThis && <span className="text-lg animate-spin">⏳</span>}
                </button>
              );
            })}
          </div>
        </MobileCard>
      </div>

      {/* Enhanced Results Section */}
      {results && (
        <div className="mb-6 animate-[slideIn_0.5s_ease-out_0.2s_both]">
          <MobileCard variant="elevated" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white mb-0 flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-[var(--neon-teal)] before:rounded-sm">
                📊 Live Results
              </h3>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-base">👥</span>
                <span className="text-sm text-slate-400 font-medium">{results.totalVotes || 0} total votes</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-5">
              {(results.options || []).map((opt: any, idx: number) => {
                const val = opt.value || opt;
                const lbl = opt.label || opt;
                const votes = opt.votes || 0;
                const total = results.totalVotes || 1;
                const percentage = getVotePercentage(votes, total);
                const isWinning = percentage === Math.max(...(results.options || []).map((o: any) => getVotePercentage(o.votes || 0, total)));
                
                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col gap-3 p-4 bg-white/2 border border-white/6 rounded-2xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-0.5 ${
                      isWinning 
                        ? 'bg-gradient-to-br from-yellow-400/10 to-yellow-400/5 border-yellow-400/30 shadow-xl shadow-yellow-400/20 relative before:content-[\'\'] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-yellow-400 before:rounded-l-2xl before:animate-pulse'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-white flex items-center gap-2">
                        {isWinning && <span className="text-lg">🏆</span>}
                        {lbl}
                      </span>
                      <span className="text-sm text-slate-400 font-medium">
                        {votes} votes ({percentage}%)
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-md overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </MobileCard>
        </div>
      )}

      {/* Enhanced Account Section */}
      {address && (
        <div className="mb-6 animate-[slideIn_0.5s_ease-out_0.3s_both]">
          <MobileCard variant="elevated" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white mb-0 flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-[var(--neon-teal)] before:rounded-sm">
                👤 Your Governance Power
              </h3>
            </div>
            
            {account && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-teal-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
                    <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                      <span className="text-base">💰</span>
                      Balance
                    </span>
                    <span className="text-base font-bold text-white">{account.balance || '0'} AE</span>
                  </div>
                  {delegators.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-teal-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
                      <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                        <span className="text-base">🤝</span>
                        Delegators
                      </span>
                      <span className="text-base font-bold text-white">{delegators.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5">
              <div>
                {delegation.to ? (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-green-500/10 before:to-transparent before:animate-[shimmer_4s_infinite]">
                    <span className="text-xl">✅</span>
                    <span className="text-sm text-slate-400 font-medium">
                      Delegating to: <span className="text-white font-mono text-xs break-all">{delegation.to}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl">
                    <span className="text-xl">⚠️</span>
                    <span className="text-sm text-slate-400 font-medium">No delegation set</span>
                  </div>
                )}
              </div>
            </div>
          </MobileCard>
        </div>
      )}
    </div>
  );

  const renderAccountTab = () => (
    <div className="flex flex-col gap-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-xl animate-[fadeIn_0.6s_ease-out]">
            <IconGovernance className="w-6 h-6 brightness-0 invert" />
          </div>
          <div className="header-text">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent m-0 animate-[slideIn_0.6s_ease-out_0.1s_both]">
              My Governance Account
            </h2>
            <p className="text-sm text-slate-400 font-normal mt-1 mb-0 animate-[slideIn_0.6s_ease-out_0.2s_both]">
              Manage your voting power and delegations
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Account Info */}
      {address && (
        <div className="mb-6">
          <MobileCard variant="elevated" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white mb-0 flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-teal-400 before:rounded-sm">
                👤 Account Information
              </h3>
            </div>
            
            {account && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-teal-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
                    <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                      <span className="text-base">📍</span>
                      Address
                    </span>
                    <span className="text-base font-bold text-white font-mono text-xs text-slate-400 max-w-32 overflow-hidden text-ellipsis">{address}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-teal-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
                    <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                      <span className="text-base">💰</span>
                      Balance
                    </span>
                    <span className="text-base font-bold text-white">{account.balance || '0'} AE</span>
                  </div>
                  {delegators.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-teal-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
                      <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                        <span className="text-base">🤝</span>
                        Delegators
                      </span>
                      <span className="text-base font-bold text-white">{delegators.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </MobileCard>
        </div>
      )}

      {/* Enhanced Delegation Section */}
      <div className="mb-6 animate-[slideIn_0.5s_ease-out_0.4s_both]">
        <MobileCard variant="elevated" padding="large" className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white mb-0 flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-teal-400 before:rounded-sm">
              🤝 Vote Delegation
            </h3>
            <p className="m-0 mt-5 text-sm text-slate-400 leading-relaxed">
              Delegate your voting power to another address. They can vote on your behalf in governance polls.
            </p>
          </div>
          
          <div className="flex flex-col gap-5">
            <MobileInput
              label="Delegate to address"
              placeholder="Enter the address you want to delegate to..."
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              variant="filled"
              size="large"
              className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 focus-within:border-teal-400 focus-within:shadow-[0_0_0_3px_rgba(78,205,196,0.1)] focus-within:-translate-y-px relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-teal-400 after:transition-all after:duration-300 focus-within:after:w-full"
            />
            
            <div className="flex flex-col gap-3">
              <AeButton 
                onClick={handleSaveDelegation}
                disabled={!delegateAddress.trim() || delegation.loading}
                className={`h-13 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  !delegateAddress.trim() || delegation.loading
                    ? 'opacity-50 cursor-not-allowed transform-none relative overflow-hidden after:content-[\'\'] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:animate-[shimmer_1.5s_infinite]'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-xl hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-pink-500/40'
                }`}
              >
                {delegation.loading ? '⏳ Saving...' : '💾 Save Delegation'}
              </AeButton>
              
              {delegation.to && (
                <AeButton 
                  onClick={handleRevokeDelegation}
                  disabled={delegation.loading}
                  className="bg-black/20 backdrop-blur-lg text-white border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5"
                >
                  {delegation.loading ? '⏳ Revoking...' : '❌ Revoke Delegation'}
                </AeButton>
              )}
            </div>
          </div>

          {delegators.length > 0 && (
            <div className="mt-6">
              <h4 className="m-0 mb-4 text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-xl">👥</span>
                Your Delegators
              </h4>
              <div className="flex flex-col gap-3">
                {delegators.map((delegator: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-white/2 border border-white/6 rounded-xl transition-all duration-300 hover:bg-white/5 hover:border-white/10 hover:-translate-y-px relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-purple-400 before:rounded-l-xl before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 break-all flex-1">
                        {delegator.address || delegator}
                      </span>
                      {delegator.balance && (
                        <span className="text-xs font-semibold text-white whitespace-nowrap">
                          {delegator.balance} AE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </MobileCard>
      </div>
    </div>
  );

  return (
    <Shell right={<RightRail />}> 
      {/* Enhanced Tab Navigation */}
      <div className="flex gap-2 mb-5 px-1 overflow-x-auto scrollbar-none -ms-overflow-style-none webkit-scrollbar-none scroll-smooth webkit-overflow-scrolling-touch">
        <AeButton 
          onClick={() => setActiveTab('polls')}
          className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'polls'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
          }`}
        >
          📊 Polls
        </AeButton>
        {pollId && (
          <AeButton 
            onClick={() => setActiveTab('vote')}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
              activeTab === 'vote'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
                : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
            }`}
          >
            🗳️ Vote
          </AeButton>
        )}
        <AeButton 
          onClick={() => setActiveTab('account')}
          className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-semibold bg-black/20 backdrop-blur-lg border transition-all duration-300 touch-manipulation ${
            activeTab === 'account'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow-xl -translate-y-0.5 relative after:content-[\'\'] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-1 after:bg-[var(--neon-teal)] after:rounded-sm after:animate-[slideIn_0.3s_ease-out]'
              : 'text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20'
          }`}
        >
          👤 My Account
        </AeButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'polls' && renderPollsTab()}
      {activeTab === 'vote' && renderVoteTab()}
      {activeTab === 'account' && renderAccountTab()}
    </Shell>
  );
}


