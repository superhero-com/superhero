import React, { useEffect, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import InvitationList from '../../components/Invitation/InvitationList';
import RightRail from '../../components/layout/RightRail';
import Shell from '../../components/layout/Shell';
import WalletConnectBtn from '../../components/WalletConnectBtn';
import { getAffiliationTreasury } from '../../libs/affiliation';
import { addGeneratedInvites } from '../../libs/invitation';

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
    <Shell right={<RightRail />}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 py-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Invite & Earn</span>
            <div className="text-base md:text-lg lg:text-xl text-slate-400 mt-2 font-normal">Build your network, earn rewards</div>
          </h1>
        </div>

        {/* Info Card */}
        {showInfo && (
          <div className="mb-8 bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-30">
            <div className="flex items-start gap-6 relative z-10 flex-wrap">
              <div className="text-3xl md:text-4xl lg:text-5xl flex-shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                💡
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="m-0 mb-6 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
                  How it works
                </h3>
                <div className="grid gap-5">
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      1
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Generate invite links by staking AE per invite
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      2
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Share links with friends and community
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      3
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      When 4+ invitees purchase tokens, earn rewards
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      4
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Withdraw rewards anytime after eligibility
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  try { localStorage.setItem('invite_info_dismissed', '1'); } catch { }
                  setShowInfo(false);
                }}
                className="bg-white/10 border border-white/20 text-white text-base md:text-lg lg:text-xl cursor-pointer p-3 rounded-xl transition-all duration-300 flex-shrink-0 min-w-10 min-h-10 md:min-w-12 md:min-h-12 lg:min-w-14 lg:min-h-14 flex items-center justify-center backdrop-blur-lg hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-400 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/30 active:translate-y-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Generate Invites Card */}
          <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0">
                🎯
              </div>
              <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
                Generate Invites
              </h3>
            </div>

            <div className="mb-6 p-4 bg-white/3 rounded-xl border border-white/5">
              <WalletConnectBtn />
            </div>

            <form onSubmit={generateInvites} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 min-w-0">
                  <label className="flex flex-col gap-3 min-w-0">
                    <span className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider break-words">
                      Amount per invite (AE)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountAe}
                      onChange={(e) => setAmountAe(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.0"
                      className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 lg:p-5 text-white text-sm md:text-base transition-all duration-300 outline-none font-medium w-full box-border focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:bg-white/8 focus:-translate-y-px placeholder:text-slate-400 placeholder:opacity-60"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 min-w-0">
                  <label className="flex flex-col gap-3 min-w-0">
                    <span className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider break-words">
                      Number of invites
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, Number(e.target.value || 1)))}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 lg:p-5 text-white text-sm md:text-base transition-all duration-300 outline-none font-medium w-full box-border focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:bg-white/8 focus:-translate-y-px placeholder:text-slate-400 placeholder:opacity-60"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !address}
                className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${
                  !address 
                    ? 'opacity-50 cursor-not-allowed bg-gray-600 transform-none'
                    : 'bg-gradient-to-r from-[var(--neon-teal)] to-blue-500 text-white shadow-lg shadow-[rgba(0,255,157,0.3)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[rgba(0,255,157,0.4)] before:content-[\'\'] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full'
                }`}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
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
              <div className="mt-8 pt-8 border-t border-white/10">
                <h4 className="m-0 mb-6 text-xl md:text-2xl lg:text-3xl font-bold text-[var(--neon-teal)] break-words">
                  Generated Invite Links
                </h4>
                <div className="flex flex-col gap-4">
                  {inviteLinks.map((link, i) => (
                    <div key={i} className="flex gap-3 items-stretch flex-wrap">
                      <input
                        value={link}
                        readOnly
                        className="flex-1 min-w-[200px] bg-white/3 border border-white/5 rounded-lg p-4 text-slate-400 font-mono text-xs md:text-sm leading-relaxed break-all resize-y min-h-12"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        onClick={() => copyToClipboard(link, i)}
                        className={`${
                          copiedIndex === i 
                            ? 'bg-green-500 shadow-lg shadow-green-500/30' 
                            : 'bg-[var(--neon-teal)] shadow-lg shadow-[rgba(0,255,157,0.3)] hover:bg-[rgba(0,255,157,0.9)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[rgba(0,255,157,0.4)]'
                        } border-0 rounded-lg p-4 text-white cursor-pointer transition-all duration-300 text-base md:text-lg min-w-10 min-h-10 md:min-w-12 md:min-h-12 lg:min-w-14 lg:min-h-14 flex items-center justify-center flex-shrink-0`}
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
          <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0">
                💰
              </div>
              <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
                Your Rewards
              </h3>
            </div>

            <div className="flex flex-col gap-8">
              {/* Progress Section */}
              <div className="flex flex-col gap-5 p-5 md:p-6 lg:p-8 bg-white/3 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center font-semibold text-base md:text-lg lg:text-xl flex-wrap gap-2">
                  <span>Progress to rewards</span>
                  <span className="text-teal-400 font-bold text-lg md:text-xl lg:text-2xl text-shadow-[0_0_10px_rgba(78,205,196,0.5)] break-words">
                    {uniqueInviteesCount}/4 invitees
                  </span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-md overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-center font-semibold text-slate-400 text-sm md:text-base p-2 rounded-lg bg-white/2 break-words">
                  {uniqueInviteesCount >= 4 ? '🎉 Eligible for rewards!' : `${4 - uniqueInviteesCount} more invitees needed`}
                </div>
              </div>

              {/* Rewards Display */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 text-center p-5 md:p-6 lg:p-8 bg-white/3 rounded-2xl border border-white/5">
                  <span className="text-sm md:text-base text-slate-400 font-medium uppercase tracking-wider break-words">
                    Available Rewards
                  </span>
                  <span className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(255,107,107,0.3)] break-words">
                    {accumulatedRewardsAe.toFixed(4)} AE
                  </span>
                </div>

                <button
                  onClick={withdrawRewards}
                  disabled={withdrawing || !isEligibleForRewards}
                  className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${
                    isEligibleForRewards 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/40'
                      : 'opacity-50 cursor-not-allowed bg-gray-600 transform-none'
                  }`}
                >
                  {withdrawing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                      Withdrawing...
                    </div>
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
          <div className="mb-12">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 mb-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center break-words">
              Your Invitations
            </h3>
            <InvitationList activeAddress={address} />
          </div>
        )}

        {/* Public Activity Feed */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6 p-4 bg-white/3 rounded-xl border border-white/5 flex-wrap gap-4">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
              Public Activity Feed
            </h3>
            <div className="flex gap-4 flex-wrap">
              <select
                className="bg-white/5 border border-white/10 rounded-lg p-2 md:p-3 text-white text-xs md:text-sm cursor-pointer transition-all duration-300 font-medium min-w-[100px] focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:outline-none"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as any)}
              >
                <option value="created_at">Newest</option>
                <option value="amount">Amount</option>
              </select>
              <select
                className="bg-white/5 border border-white/10 rounded-lg p-2 md:p-3 text-white text-xs md:text-sm cursor-pointer transition-all duration-300 font-medium min-w-[100px] focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:outline-none"
                value={orderDirection}
                onChange={(e) => setOrderDirection(e.target.value as any)}
              >
                <option value="DESC">Desc</option>
                <option value="ASC">Asc</option>
              </select>
            </div>
          </div>

          <div className="text-slate-400 mb-8 leading-relaxed text-base md:text-lg text-center p-4 bg-white/2 rounded-xl border border-white/5 break-words">
            Recent invitation stakes across the network. Connect your wallet above to generate and manage your own invitations.
          </div>

          {error && <div className="mb-6 p-5 bg-pink-500/10 border border-pink-500/30 rounded-xl text-red-400 font-medium break-words">{error}</div>}

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-white/5 rounded-2xl font-bold text-slate-400 uppercase tracking-wider text-xs md:text-sm break-words">
              <div>Date</div>
              <div>Amount</div>
              <div>Inviter</div>
            </div>
            {rows.map((r, idx) => (
              <div key={`${r.id || idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 items-start break-words hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 hover:border-white/20">
                <div className="text-slate-400 font-medium text-xs md:text-sm break-words leading-relaxed">
                  {new Date(r.created_at || Date.now()).toLocaleString()}
                </div>
                <div className="font-bold text-[var(--neon-teal)] text-sm md:text-lg text-center md:text-left break-words">
                  {r.amount ?? 0} AE
                </div>
                <div className="font-mono text-xs md:text-sm text-slate-400 break-all leading-relaxed">
                  {r.inviter || r.owner_address || r.account_address || r.address || r.creator_address || r.creator || '—'}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={() => fetchPage(page)}
                disabled={loading}
                className="p-4 md:p-5 lg:p-6 px-8 md:px-10 lg:px-12 text-base md:text-lg font-bold uppercase tracking-wider break-words whitespace-normal bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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


