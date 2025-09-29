import { useEffect, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import CollectRewardsCard from '../../components/Invitation/CollectRewardsCard';
import InvitationList from '../../components/Invitation/InvitationList';
import InviteAndEarnCard from '../../components/Invitation/InviteAndEarnCard';
import RightRail from '../../components/layout/RightRail';
import Shell from '../../components/layout/Shell';
import { useAeSdk } from '../../hooks';
export default function Invite() {
  const { activeAccount } = useAeSdk();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [orderBy, setOrderBy] = useState<'amount' | 'created_at'>('created_at');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [showInfo, setShowInfo] = useState<boolean>(() => {
    try { return localStorage.getItem('invite_info_dismissed') !== '1'; } catch { return true; }
  });

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
          
          <InviteAndEarnCard />

          {/* Rewards Card */}
          <CollectRewardsCard />
        </div>

        {/* User Invitations */}
        {activeAccount && (
          <div className="mb-12">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 mb-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center break-words">
              Your Invitations
            </h3>
            <InvitationList />
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


