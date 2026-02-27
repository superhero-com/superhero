import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CollectRewardsCard,
  InvitationList,
  InviteAndEarnCard,
} from '../../features/trending/components/Invitation';
import Shell from '../../components/layout/Shell';
import { useAeSdk } from '../../hooks';
import { useXInviteFlow } from '../../hooks/useXInviteFlow';

const REFERRAL_GOAL = 10;
const SHARE_GOAL = 10;

function ProgressDots({
  total,
  done,
}: {
  total: number;
  done: number;
}) {
  const safeDone = Math.max(0, Math.min(total, done));
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: total }).map((_, index) => {
        const reached = index < safeDone;
        return (
          <span
            key={`dot-${index + 1}`}
            className={`w-6 h-6 rounded-full border text-[11px] font-semibold flex items-center justify-center ${
              reached
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 border-pink-300 text-white shadow-lg shadow-pink-500/30'
                : 'bg-white/5 border-white/20 text-white/60'
            }`}
          >
            {index + 1}
          </span>
        );
      })}
      <span className="ml-1 text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]">🏆</span>
    </div>
  );
}

export default function Invite() {
  const { activeAccount } = useAeSdk();
  const { generateInviteLink, loadInviteProgress } = useXInviteFlow();
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [frontendInviteLink, setFrontendInviteLink] = useState<string | null>(null);
  const [backendInviteLink, setBackendInviteLink] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    verified_friends_count: number;
    goal: number;
    milestone_reward_status: 'not_started' | 'pending' | 'paid' | 'failed';
  } | null>(null);

  const refreshProgress = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const data = await loadInviteProgress(activeAccount);
      setProgress({
        verified_friends_count: data.verified_friends_count || 0,
        goal: data.goal || REFERRAL_GOAL,
        milestone_reward_status: data.milestone_reward_status || 'not_started',
      });
    } catch (err: any) {
      setError((prev) => prev || err?.message || 'Failed to load invite progress');
    }
  }, [activeAccount, loadInviteProgress]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const referralsDone = progress?.verified_friends_count || 0;
  const referralsGoal = progress?.goal || REFERRAL_GOAL;
  const milestoneStatus = progress?.milestone_reward_status || 'not_started';

  const milestoneBadgeClass = useMemo(() => {
    switch (milestoneStatus) {
      case 'paid':
        return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200';
      case 'pending':
        return 'bg-amber-500/20 border-amber-400/40 text-amber-200';
      case 'failed':
        return 'bg-red-500/20 border-red-400/40 text-red-200';
      default:
        return 'bg-white/10 border-white/20 text-white/80';
    }
  }, [milestoneStatus]);

  const onGenerateInvite = useCallback(async () => {
    if (!activeAccount) return;
    setError(null);
    setCreatingInvite(true);
    try {
      const invite = await generateInviteLink(activeAccount);
      setInviteCode(invite.code);
      setFrontendInviteLink(invite.frontend_invite_link);
      setBackendInviteLink(invite.backend_invite_link);
      await refreshProgress();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate invite link');
    } finally {
      setCreatingInvite(false);
    }
  }, [activeAccount, generateInviteLink, refreshProgress]);

  return (
    <Shell>
      <div className="mx-auto px-4 py-2 space-y-8">
        <div className="text-center py-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Invite Missions
          </h1>
          <div className="text-base md:text-lg lg:text-xl text-slate-400 mt-2">
            Complete milestones and unlock AE rewards
          </div>
        </div>

        <div className="grid gap-6">
          <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white m-0">Reward</h2>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-pink-500/20 border border-pink-400/40 text-pink-100">
                50 AE
              </span>
            </div>
            <p className="text-slate-300 mt-3 mb-0">
              Connect Twitter (minimum 50 followers) to claim your first mission reward.
            </p>
          </section>

          <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white m-0">Share</h2>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-500/20 border border-purple-400/40 text-purple-100">
                150 AE
              </span>
            </div>
            <p className="text-slate-300 mt-3 mb-4">
              Post 10/10 tweets mentioning the Superhero link or account.
              This mission is layout-only for now.
            </p>
            <ProgressDots total={SHARE_GOAL} done={0} />
          </section>

          <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white m-0">Referrals</h2>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/20 border border-blue-400/40 text-blue-100">
                200 AE
              </span>
            </div>
            <p className="text-slate-300 mt-3 mb-2">
              Invite 10 users and have them connect Twitter.
            </p>
            <div className="flex items-center justify-between gap-3 text-sm text-slate-300 mb-4 flex-wrap">
              <span>
                Progress:
                {' '}
                <span className="text-white font-semibold">
                  {referralsDone}
                  /
                  {referralsGoal}
                </span>
              </span>
              <span className={`px-3 py-1 rounded-full border text-xs uppercase tracking-wide ${milestoneBadgeClass}`}>
                {milestoneStatus}
              </span>
            </div>
            <ProgressDots total={REFERRAL_GOAL} done={referralsDone} />

            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={onGenerateInvite}
                disabled={!activeAccount || creatingInvite}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  !activeAccount || creatingInvite
                    ? 'bg-gray-600 text-white/70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[var(--neon-teal)] to-blue-500 text-white hover:-translate-y-0.5'
                }`}
              >
                {creatingInvite ? 'Generating invite link...' : 'Generate invite link'}
              </button>
              {frontendInviteLink && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={async () => {
                    await navigator.clipboard.writeText(frontendInviteLink);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  {copied ? 'Copied' : 'Copy frontend invite link'}
                </button>
              )}
            </div>
            {frontendInviteLink && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="text-white/80">
                  Invite code:
                  {' '}
                  <span className="font-mono text-white">{inviteCode}</span>
                </div>
                <div className="text-white/60">Frontend link (portable):</div>
                <div className="text-white/80 break-all">{frontendInviteLink}</div>
                {backendInviteLink && backendInviteLink !== frontendInviteLink && (
                  <>
                    <div className="text-white/50">Backend-provided link:</div>
                    <div className="text-white/60 break-all">{backendInviteLink}</div>
                  </>
                )}
              </div>
            )}
            {error && (
              <div className="mt-3 text-xs text-red-300">
                {error}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8 mb-12 pt-2">
          <div className="text-center">
            <h3 className="text-3xl md:text-4xl font-extrabold m-0 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Affiliate
            </h3>
            <p className="text-slate-400 mt-2">
              Invite 3/3 users with AE amount. When they trade, you make 0.5%.
            </p>
          </div>
          <InviteAndEarnCard />
          <CollectRewardsCard />
          {activeAccount && <InvitationList />}
        </div>
      </div>
    </Shell>
  );
}
