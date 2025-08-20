import React, { useEffect, useState } from 'react';
import Shell from '../components/layout/Shell';
import LeftRail from '../components/layout/LeftRail';
import RightRail from '../components/layout/RightRail';
import { CONFIG } from '../config';
import './Governance.scss';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { 
  loadPolls, 
  loadDelegation, 
  setDelegation, 
  revokeDelegation, 
  loadPoll, 
  loadPollResults, 
  loadMyVote, 
  submitVote, 
  revokeMyVote, 
  loadDelegators, 
  loadAccount,
  loadPollComments
} from '../store/slices/governanceSlice';
import AeButton from '../components/AeButton';
import MobileInput from '../components/MobileInput';
import MobileCard from '../components/MobileCard';
import { Link, useParams, useLocation } from 'react-router-dom';
import { HeaderLogo as IconGovernance, IconComment } from '../icons';

type TabType = 'polls' | 'vote' | 'account';

export default function Governance() {
  const dispatch = useDispatch<AppDispatch>();
  const { id: pollId } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('polls');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  // Polls list state
  const polls = useSelector((s: RootState) => s.governance.polls);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  
  // Account state
  const address = useSelector((s: RootState) => s.root.address);
  const delegation = useSelector((s: RootState) => s.governance.delegation);
  const [delegateAddress, setDelegateAddress] = useState<string>(delegation.to || '');
  const delegators = useSelector((s: RootState) => (address ? s.governance.delegatorsByAddress[address] : []));
  const account = useSelector((s: RootState) => (address ? s.governance.accountByAddress[address] : null));
  
  // Individual poll state
  const poll = useSelector((s: RootState) => (pollId ? s.governance.pollById[pollId] : null));
  const results = useSelector((s: RootState) => (pollId ? s.governance.resultsById[pollId] : null));
  const myVote = useSelector((s: RootState) => (pollId ? s.governance.myVoteById[pollId] : null));
  
  // Comment state
  const pollComments = useSelector((s: RootState) => s.governance.pollComments);
  const pollCommentsLoading = useSelector((s: RootState) => s.governance.pollCommentsLoading);

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

  // Load polls data
  useEffect(() => { 
    dispatch(loadPolls({ page, pageSize, status: status || undefined, search: search || undefined })); 
  }, [dispatch, page, pageSize, status, search]);

  // Load comments for displayed polls
  useEffect(() => {
    polls.forEach(poll => {
      if (poll.id) {
        loadCommentsForPoll(poll.id);
      }
    });
  }, [polls, dispatch]);
  
  // Load account data
  useEffect(() => { 
    if (address) {
      dispatch(loadDelegation(address));
      dispatch(loadDelegators(address));
      dispatch(loadAccount(address));
    }
  }, [dispatch, address]);

  // Load individual poll data
  useEffect(() => {
    if (pollId) {
      dispatch(loadPoll(pollId));
      dispatch(loadPollResults(pollId));
      dispatch(loadMyVote(pollId));
    }
  }, [dispatch, pollId]);

  useEffect(() => {
    setDelegateAddress(delegation.to || '');
  }, [delegation.to]);

  const iframeSrc = CONFIG.GOVERNANCE_URL;
  
  const handleSaveDelegation = () => {
    if (delegateAddress.trim()) {
      dispatch(setDelegation({ to: delegateAddress.trim() }));
    }
  };

  const handleRevokeDelegation = () => {
    dispatch(revokeDelegation());
    setDelegateAddress('');
  };

  const handleVote = async (option: string) => {
    if (pollId && !isVoting) {
      setIsVoting(true);
      setSelectedVote(option);
      
      try {
        await dispatch(submitVote({ pollId, option: String(option) }));
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
      dispatch(revokeMyVote(pollId));
    }
  };

  const getStatusColor = (status: string) => {
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

  const getCommentCount = (pollId: string) => {
    const comments = pollComments[pollId] || [];
    return comments.length;
  };

  const loadCommentsForPoll = (pollId: string) => {
    if (!pollComments[pollId] && !pollCommentsLoading[pollId]) {
      dispatch(loadPollComments(pollId));
    }
  };

  const renderPollsTab = () => (
    <div className="gov-native mobile-container">
      <div className="gov-header mobile-header">
        <div className="header-content">

          <div className="header-text">
            <h2>Governance</h2>
            <p className="header-subtitle">Shape the future of the ecosystem</p>
          </div>
        </div>
      </div>
      
      {/* Enhanced Mobile Controls */}
      <div className="mobile-controls">
        <div className="mobile-search-section">
          <MobileInput
            label="Search polls"
            placeholder="Find polls by title or description..."
            value={search}
            onChange={(e) => { 
              setPage(1); 
              setSearch(e.target.value); 
            }}
            variant="filled"
            size="large"
            className="enhanced-search"
          />
        </div>
        
        <div className="mobile-filter-section">
          <MobileInput
            as="select"
            label="Filter by status"
            value={status}
            onChange={(e) => { 
              setPage(1); 
              setStatus(e.target.value); 
            }}
            variant="filled"
            size="large"
            className="enhanced-filter"
          >
            <option value="">All polls</option>
            <option value="open">🟢 Open polls</option>
            <option value="closed">🔴 Closed polls</option>
          </MobileInput>
        </div>
      </div>

      {/* Enhanced Polls Grid */}
      <div className="mobile-polls-section">
        {polls.length === 0 ? (
          <MobileCard variant="outlined" padding="large" className="empty-state-card">
            <div className="mobile-empty-state">
              <div className="empty-icon">🗳️</div>
              <h3>No polls found</h3>
              <p>Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          </MobileCard>
        ) : (
          <div className="mobile-polls-grid">
            {polls.map((p: any) => (
              <Link to={`/voting/p/${p.id}`} key={p.id} className="mobile-poll-link">
                <MobileCard variant="elevated" padding="medium" clickable className="enhanced-poll-card">
                  <div className="mobile-poll-card">
                    <div className="poll-header">
                      <div className="mobile-poll-title">{p.title || p.name || p.id}</div>
                      <div className={`mobile-poll-status ${getStatusColor(p.status)}`}>
                        {p.status || 'Unknown'}
                      </div>
                    </div>
                    <div className="poll-meta">
                      <div className="poll-stats">
                        <span className="stat-item">
                          <span className="stat-icon">👥</span>
                          {p.totalVotes || 0} votes
                        </span>
                        {p.endDate && (
                          <span className="stat-item">
                            <span className="stat-icon">⏰</span>
                            {new Date(p.endDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileCard>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      <div className="mobile-pagination">
        <AeButton 
          onClick={() => setPage((p) => Math.max(1, p - 1))} 
          disabled={page === 1}
          className="mobile-pagination-btn"
        >
          ← Previous
        </AeButton>
        <span className="mobile-page-info">Page {page}</span>
        <AeButton 
          onClick={() => setPage((p) => p + 1)}
          className="mobile-pagination-btn"
        >
          Next →
        </AeButton>
      </div>
    </div>
  );

  const renderVoteTab = () => (
    <div className="gov-native mobile-container">
      <div className="gov-header mobile-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <IconGovernance className="gov-icon" />
          </div>
          <div className="header-text">
            <h2>{poll?.title || poll?.name || 'Poll'}</h2>
            <p className="header-subtitle">Cast your vote and make your voice heard</p>
          </div>
        </div>
        <AeButton 
          onClick={() => setActiveTab('polls')}
          className="mobile-back-btn"
        >
          ← Back to Polls
        </AeButton>
      </div>

      {/* Enhanced Voting Section */}
      <div className="mobile-voting-section">
        <MobileCard variant="elevated" padding="large" className="voting-card">
          <div className="voting-header">
            <h3 className="mobile-section-title">🗳️ Cast Your Vote</h3>
            {poll?.description && (
              <p className="poll-description">{poll.description}</p>
            )}
          </div>
          
          {myVote && (
            <div className="mobile-current-vote">
              <div className="vote-badge">
                <span className="vote-icon">✅</span>
                <span className="vote-text">You voted for: <strong>{myVote?.option || myVote}</strong></span>
              </div>
              <AeButton 
                onClick={handleRevokeVote} 
                className="mobile-action-btn secondary revoke-btn"
              >
                🔄 Change Vote
              </AeButton>
            </div>
          )}

          <div className="mobile-voting-options">
            {(poll?.options || []).map((opt: any) => {
              const val = opt.value || opt;
              const lbl = opt.label || opt;
              const isSelected = selectedVote === val;
              const isVotingThis = isVoting && isSelected;
              
              return (
                <button 
                  key={val} 
                  onClick={() => handleVote(val)}
                  disabled={isVoting}
                  className={`mobile-vote-option-btn ${isSelected ? 'selected' : ''} ${isVotingThis ? 'voting' : ''}`}
                >
                  <span className="vote-option-text">{lbl}</span>
                  {isVotingThis && <span className="voting-spinner">⏳</span>}
                </button>
              );
            })}
          </div>
        </MobileCard>
      </div>

      {/* Enhanced Results Section */}
      {results && (
        <div className="mobile-results-section">
          <MobileCard variant="elevated" padding="large" className="results-card">
            <div className="results-header">
              <h3 className="mobile-section-title">📊 Live Results</h3>
              <div className="total-votes">
                <span className="total-votes-icon">👥</span>
                <span className="total-votes-text">{results.totalVotes || 0} total votes</span>
              </div>
            </div>
            
            <div className="mobile-results-list">
              {(results.options || []).map((opt: any, idx: number) => {
                const val = opt.value || opt;
                const lbl = opt.label || opt;
                const votes = opt.votes || 0;
                const total = results.totalVotes || 1;
                const percentage = getVotePercentage(votes, total);
                const isWinning = percentage === Math.max(...(results.options || []).map((o: any) => getVotePercentage(o.votes || 0, total)));
                
                return (
                  <div key={idx} className={`mobile-result-item ${isWinning ? 'winning' : ''}`}>
                    <div className="mobile-result-header">
                      <span className="mobile-result-label">
                        {isWinning && <span className="winner-icon">🏆</span>}
                        {lbl}
                      </span>
                      <span className="mobile-result-votes">
                        {votes} votes ({percentage}%)
                      </span>
                    </div>
                    <div className="mobile-result-bar">
                      <div 
                        className="mobile-result-progress" 
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
        <div className="mobile-account-section">
          <MobileCard variant="elevated" padding="large" className="account-card">
            <div className="account-header">
              <h3 className="mobile-section-title">👤 Your Governance Power</h3>
            </div>
            
            {account && (
              <div className="mobile-account-info">
                <div className="account-stats">
                  <div className="mobile-account-item">
                    <span className="mobile-account-label">
                      <span className="account-icon">💰</span>
                      Balance
                    </span>
                    <span className="mobile-account-value">{account.balance || '0'} AE</span>
                  </div>
                  {delegators.length > 0 && (
                    <div className="mobile-account-item">
                      <span className="mobile-account-label">
                        <span className="account-icon">🤝</span>
                        Delegators
                      </span>
                      <span className="mobile-account-value">{delegators.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mobile-delegation-info">
              <div className="delegation-status">
                {delegation.to ? (
                  <div className="delegation-active">
                    <span className="delegation-icon">✅</span>
                    <span className="delegation-text">
                      Delegating to: <span className="mobile-delegate-address">{delegation.to}</span>
                    </span>
                  </div>
                ) : (
                  <div className="delegation-inactive">
                    <span className="delegation-icon">⚠️</span>
                    <span className="delegation-text">No delegation set</span>
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
    <div className="gov-native mobile-container">
      <div className="gov-header mobile-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <IconGovernance className="gov-icon" />
          </div>
          <div className="header-text">
            <h2>My Governance Account</h2>
            <p className="header-subtitle">Manage your voting power and delegations</p>
          </div>
        </div>
      </div>

      {/* Enhanced Account Info */}
      {address && (
        <div className="mobile-account-section">
          <MobileCard variant="elevated" padding="large" className="account-details-card">
            <div className="account-header">
              <h3 className="mobile-section-title">👤 Account Information</h3>
            </div>
            
            {account && (
              <div className="mobile-account-info">
                <div className="account-stats">
                  <div className="mobile-account-item">
                    <span className="mobile-account-label">
                      <span className="account-icon">📍</span>
                      Address
                    </span>
                    <span className="mobile-account-value address-value">{address}</span>
                  </div>
                  <div className="mobile-account-item">
                    <span className="mobile-account-label">
                      <span className="account-icon">💰</span>
                      Balance
                    </span>
                    <span className="mobile-account-value">{account.balance || '0'} AE</span>
                  </div>
                  {delegators.length > 0 && (
                    <div className="mobile-account-item">
                      <span className="mobile-account-label">
                        <span className="account-icon">🤝</span>
                        Delegators
                      </span>
                      <span className="mobile-account-value">{delegators.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </MobileCard>
        </div>
      )}

      {/* Enhanced Delegation Section */}
      <div className="mobile-delegation-section">
        <MobileCard variant="elevated" padding="large" className="delegation-card">
          <div className="delegation-header">
            <h3 className="mobile-section-title">🤝 Vote Delegation</h3>
            <p className="mobile-delegation-description">
              Delegate your voting power to another address. They can vote on your behalf in governance polls.
            </p>
          </div>
          
          <div className="mobile-delegation-form">
            <MobileInput
              label="Delegate to address"
              placeholder="Enter the address you want to delegate to..."
              value={delegateAddress}
              onChange={(e) => setDelegateAddress(e.target.value)}
              variant="filled"
              size="large"
              className="enhanced-delegation-input"
            />
            
            <div className="mobile-delegation-actions">
              <AeButton 
                onClick={handleSaveDelegation}
                disabled={!delegateAddress.trim() || delegation.loading}
                className="mobile-action-btn primary"
              >
                {delegation.loading ? '⏳ Saving...' : '💾 Save Delegation'}
              </AeButton>
              
              {delegation.to && (
                <AeButton 
                  onClick={handleRevokeDelegation}
                  disabled={delegation.loading}
                  className="mobile-action-btn secondary"
                >
                  {delegation.loading ? '⏳ Revoking...' : '❌ Revoke Delegation'}
                </AeButton>
              )}
            </div>
          </div>

          {delegators.length > 0 && (
            <div className="mobile-delegators-section">
              <h4 className="mobile-subsection-title">
                <span className="subsection-icon">👥</span>
                Your Delegators
              </h4>
              <div className="mobile-delegators-list">
                {delegators.map((delegator: any, idx: number) => (
                  <div key={idx} className="mobile-delegator-item">
                    <div className="delegator-info">
                      <span className="mobile-delegator-address">{delegator.address || delegator}</span>
                      {delegator.balance && (
                        <span className="mobile-delegator-balance">{delegator.balance} AE</span>
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
    <Shell left={<LeftRail />} right={<RightRail />}> 
      {iframeSrc ? (
        <div className="governance-page">
          <div className="gov-header mobile-header">
            <IconGovernance className="gov-icon" />
            <h2>Governance</h2>
          </div>
          <iframe title="Aeternity Governance" className="governance-iframe" src={iframeSrc} />
        </div>
      ) : (
        <>
          {/* Enhanced Tab Navigation */}
          <div className="mobile-tab-navigation">
            <AeButton 
              onClick={() => setActiveTab('polls')}
              className={`mobile-tab-btn ${activeTab === 'polls' ? 'active' : ''}`}
            >
              📊 Polls
            </AeButton>
            {pollId && (
              <AeButton 
                onClick={() => setActiveTab('vote')}
                className={`mobile-tab-btn ${activeTab === 'vote' ? 'active' : ''}`}
              >
                🗳️ Vote
              </AeButton>
            )}
            <AeButton 
              onClick={() => setActiveTab('account')}
              className={`mobile-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            >
              👤 My Account
            </AeButton>
          </div>

          {/* Tab Content */}
          {activeTab === 'polls' && renderPollsTab()}
          {activeTab === 'vote' && renderVoteTab()}
          {activeTab === 'account' && renderAccountTab()}
        </>
      )}
    </Shell>
  );
}


