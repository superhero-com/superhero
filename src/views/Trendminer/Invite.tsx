import React, { useEffect, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import InvitationList from '../../components/Invitation/InvitationList';
import LeftRail from '../../components/layout/LeftRail';
import RightRail from '../../components/layout/RightRail';
import Shell from '../../components/layout/Shell';
import WalletConnectBtn from '../../components/WalletConnectBtn';
import { getAffiliationTreasury } from '../../libs/affiliation';
import { addGeneratedInvites } from '../../libs/invitation';
import './Invite.scss';

import { useAeSdk, useWallet } from '../../hooks';
import { Decimal } from '../../libs/decimal';
export default function Invite() {
  const { sdk, activeAccount } = useAeSdk();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [orderBy, setOrderBy] = useState<'amount' | 'created_at'>('created_at');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  // Generate invite(s)
  const [amountAe, setAmountAe] = useState<number | ''>('');
  const [count, setCount] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);
  // Rewards
  const [accumulatedRewardsAe, setAccumulatedRewardsAe] = useState<number>(0);
  const [uniqueInviteesCount, setUniqueInviteesCount] = useState<number>(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const address = useWallet().address;
  const [showInfo, setShowInfo] = useState<boolean>(() => {
    try { return localStorage.getItem('invite_info_dismissed') !== '1'; } catch { return true; }
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function fetchPage(targetPage: number, reset = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await TrendminerApi.listInvitations({ orderBy, orderDirection, limit: 20, page: targetPage });
      const items = resp?.items ?? resp ?? [];
      setRows((prev) => reset ? items : [...prev, ...items]);
      const currentPage = resp?.meta?.currentPage ?? targetPage;
      const totalPages = resp?.meta?.totalPages ?? (items.length === 20 ? currentPage + 1 : currentPage);
      setHasMore(currentPage < totalPages);
      setPage(currentPage + 1);
    } catch (e: any) {
      setError(e?.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setPage(1);
      if (!cancelled) await fetchPage(1, true);
    }
    init();
    return () => { cancelled = true; };
  }, [orderBy, orderDirection]);

  async function generateInvites(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteLinks([]);
    try {
      const amt = Number(amountAe || 0);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error('Enter amount');
      if (!Number.isFinite(count) || count < 1) throw new Error('Enter count');
      setGenerating(true);

      if (!sdk) throw new Error('Connect your wallet first');
      const treasury = await getAffiliationTreasury(sdk);
      // Generate in-memory keypairs via aepp-sdk
      const mod = await import('@aeternity/aepp-sdk');
      const keys = new Array(count).fill(0).map(() => mod.generateKeyPair());
      const invitees = keys.map((k: any) => k.publicKey);
      const redemptionFeeCover = 10n ** 15n;
      console.log('amt::', amt);
      const inviteAmount = BigInt(Decimal.from(amt).bigNumber);
      await treasury.registerInvitationCode(invitees, redemptionFeeCover, inviteAmount);
      // await treasury.registerInvitationCode(invitees, redemptionFeeCover, aeToAettos(amt));
      const links = keys.map((k: any) => `${location.protocol}//${location.host}#invite_code=${k.secretKey}`);
      setInviteLinks(links);
      if (sdk?.addresses) {
        const inviter = sdk.addresses()[0];
        addGeneratedInvites(inviter, keys.map((k: any) => ({ invitee: k.publicKey, secretKey: k.secretKey, amount: amt })));
      }
      setAmountAe('');
    } catch (e: any) {
      console.log('generateInvites error::', e);
      setError(e?.message || 'Failed to create invitations');
    } finally {
      setGenerating(false);
    }
  }

  async function refreshRewards() {
    setError(null);
    try {
      if (!sdk) return;
      if (!activeAccount) return;
      const treasury = await getAffiliationTreasury(sdk);
      const acc = await treasury.getAccumulatedRewards(activeAccount);
      const uniq = await treasury.getUniqueInvitee(activeAccount).catch(() => null);
      const ae = Number(acc) / 1e18;
      setAccumulatedRewardsAe(ae);
      const thresholdReached = !!(uniq && uniq.ThresholdReached);
      const waitingSize = uniq?.WaitingForInvitations?.[0]?.size || 0;
      setUniqueInviteesCount(thresholdReached ? 4 : waitingSize);
    } catch (e: any) {
      // swallow errors; UI will show zero
    }
  }

  useEffect(() => { refreshRewards(); }, []);

  async function withdrawRewards() {
    setWithdrawing(true);
    setError(null);
    try {
      const treasury = await getAffiliationTreasury(sdk);
      await treasury.withdraw();
      await refreshRewards();
    } catch (e: any) {
      setError(e?.message || 'Failed to withdraw');
    } finally {
      setWithdrawing(false);
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const progressPercentage = Math.min((uniqueInviteesCount / 4) * 100, 100);
  const isEligibleForRewards = uniqueInviteesCount >= 4 && accumulatedRewardsAe > 0;

  return (
    <Shell left={<LeftRail />} right={<RightRail />}>
      <div className="genz-container">
        {/* Hero Section */}
        <div className="invite-hero">
          <h1 className="invite-title">
            <span className="genz-gradient-text">Invite & Earn</span>
            <div className="invite-subtitle">Build your network, earn rewards</div>
          </h1>
        </div>

        {/* Info Card */}
        {showInfo && (
          <div className="invite-info-card genz-card genz-animated-bg">
            <div className="invite-info-header">
              <div className="invite-info-icon">💡</div>
              <div className="invite-info-content">
                <h3 className="genz-gradient-text">How it works</h3>
                <div className="invite-steps">
                  <div className="invite-step">
                    <div className="step-number">1</div>
                    <div className="step-content">Generate invite links by staking AE per invite</div>
                  </div>
                  <div className="invite-step">
                    <div className="step-number">2</div>
                    <div className="step-content">Share links with friends and community</div>
                  </div>
                  <div className="invite-step">
                    <div className="step-number">3</div>
                    <div className="step-content">When 4+ invitees purchase tokens, earn rewards</div>
                  </div>
                  <div className="invite-step">
                    <div className="step-number">4</div>
                    <div className="step-content">Withdraw rewards anytime after eligibility</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  try { localStorage.setItem('invite_info_dismissed', '1'); } catch { }
                  setShowInfo(false);
                }}
                className="invite-dismiss-btn"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="invite-main-grid">
          {/* Generate Invites Card */}
          <div className="invite-card genz-card">
            <div className="invite-card-header">
              <div className="invite-card-icon">🎯</div>
              <h3>Generate Invites</h3>
            </div>

            <div className="invite-wallet-section">
              <WalletConnectBtn />
            </div>

            <form onSubmit={generateInvites} className="invite-form">
              <div className="invite-form-row">
                <div className="invite-input-group">
                  <label className="invite-label">
                    <span>Amount per invite (AE)</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountAe}
                      onChange={(e) => setAmountAe(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.0"
                      className="invite-input"
                    />
                  </label>
                </div>
                <div className="invite-input-group">
                  <label className="invite-label">
                    <span>Number of invites</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Number(e.target.value || 1)))}
                      className="invite-input"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !address}
                className={`invite-generate-btn genz-btn ${!address ? 'genz-btn-disabled' : 'genz-btn-teal'}`}
              >
                {generating ? (
                  <>
                    <div className="invite-spinner"></div>
                    Creating invites...
                  </>
                ) : !address ? (
                  'Connect wallet to generate'
                ) : (
                  'Generate invite links'
                )}
              </button>
            </form>

            {/* Generated Links */}
            {inviteLinks.length > 0 && (
              <div className="invite-links-section">
                <h4>Generated Invite Links</h4>
                <div className="invite-links-grid">
                  {inviteLinks.map((link, i) => (
                    <div key={i} className="invite-link-item">
                      <input
                        value={link}
                        readOnly
                        className="invite-link-input"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        onClick={() => copyToClipboard(link, i)}
                        className={`invite-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                      >
                        {copiedIndex === i ? '✓' : '📋'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rewards Card */}
          <div className="invite-card genz-card">
            <div className="invite-card-header">
              <div className="invite-card-icon">💰</div>
              <h3>Your Rewards</h3>
            </div>

            <div className="invite-rewards-content">
              {/* Progress Section */}
              <div className="invite-progress-section">
                <div className="invite-progress-header">
                  <span>Progress to rewards</span>
                  <span className="invite-progress-text">{uniqueInviteesCount}/4 invitees</span>
                </div>
                <div className="invite-progress-bar">
                  <div
                    className="invite-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="invite-progress-status">
                  {uniqueInviteesCount >= 4 ? '🎉 Eligible for rewards!' : `${4 - uniqueInviteesCount} more invitees needed`}
                </div>
              </div>

              {/* Rewards Display */}
              <div className="invite-rewards-display">
                <div className="invite-reward-amount">
                  <span className="invite-reward-label">Available Rewards</span>
                  <span className="invite-reward-value">{accumulatedRewardsAe.toFixed(4)} AE</span>
                </div>

                <button
                  onClick={withdrawRewards}
                  disabled={withdrawing || !isEligibleForRewards}
                  className={`invite-withdraw-btn genz-btn ${isEligibleForRewards ? 'genz-btn-pink' : 'genz-btn-disabled'}`}
                >
                  {withdrawing ? (
                    <>
                      <div className="invite-spinner"></div>
                      Withdrawing...
                    </>
                  ) : !isEligibleForRewards ? (
                    'Not eligible yet'
                  ) : (
                    'Collect rewards'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Invitations */}
        {!!address && (
          <div className="invite-user-section">
            <h3 className="invite-section-title">Your Invitations</h3>
            <InvitationList activeAddress={address} />
          </div>
        )}

        {/* Public Activity Feed */}
        <div className="invite-public-section">
          <div className="invite-section-header">
            <h3 className="invite-section-title">Public Activity Feed</h3>
            <div className="invite-filters">
              <select
                className="invite-select"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as any)}
              >
                <option value="created_at">Newest</option>
                <option value="amount">Amount</option>
              </select>
              <select
                className="invite-select"
                value={orderDirection}
                onChange={(e) => setOrderDirection(e.target.value as any)}
              >
                <option value="DESC">Desc</option>
                <option value="ASC">Asc</option>
              </select>
            </div>
          </div>

          <div className="invite-description">
            Recent invitation stakes across the network. Connect your wallet above to generate and manage your own invitations.
          </div>

          {error && <div className="invite-error genz-error">{error}</div>}

          <div className="invite-activity-grid">
            <div className="invite-activity-header">
              <div>Date</div>
              <div>Amount</div>
              <div>Inviter</div>
            </div>
            {rows.map((r, idx) => (
              <div key={`${r.id || idx}`} className="invite-activity-row">
                <div className="invite-activity-date">
                  {new Date(r.created_at || Date.now()).toLocaleString()}
                </div>
                <div className="invite-activity-amount">
                  {r.amount ?? 0} AE
                </div>
                <div className="invite-activity-address">
                  {r.inviter || r.owner_address || r.account_address || r.address || r.creator_address || r.creator || '—'}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="invite-load-more">
              <button
                onClick={() => fetchPage(page)}
                disabled={loading}
                className="invite-load-btn genz-btn genz-btn-blue"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}


