import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { AlertCircle, Gift } from 'lucide-react';
import {
  CollectRewardsCard,
  InvitationList,
  InviteAndEarnCard,
} from '../../features/trending/components/Invitation';
import Shell from '../../components/layout/Shell';
import { useAeSdk } from '../../hooks';
import { CONFIG } from '../../config';
import { useXInviteFlow } from '../../hooks/useXInviteFlow';
import { useWalletConnect } from '../../hooks/useWalletConnect';
import {
  buildXAuthorizeUrl,
  generateCodeVerifier,
  generateOAuthState,
  getXCallbackRedirectUri,
  storeXOAuthPKCE,
} from '../../utils/xOAuth';

const REFERRAL_GOAL = 10;
const SHARE_GOAL = 10;
const VERIFICATION_REWARD_AE = 50;
const REFERRAL_REWARD_AE = 200;
type RewardStatus = 'not_started' | 'pending' | 'paid' | 'failed';
const PRIZE_EXPLANATION_CLASS = 'text-lg sm:text-xl lg:text-2xl leading-[1.15] font-semibold text-white/95';

const isRewardAchieved = (status?: string) => status === 'pending' || status === 'paid';

const CircleMazeProgress = ({
  total,
  done,
  title,
}: {
  total: number;
  done: number;
  title: string;
}) => {
  const safeDone = Math.max(0, Math.min(total, done));
  const rings = Math.max(total, 1);
  const size = 170;
  const center = size / 2;
  const startRadius = 22;
  const radiusStep = 6;

  return (
    <div className="relative w-[170px] h-[170px] flex items-center justify-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: rings }).map((_, index) => {
          const radius = startRadius + (rings - 1 - index) * radiusStep;
          const reached = index < safeDone;
          return (
            <g key={`ring-${index + 1}`}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={3}
              />
              {reached && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="url(#mazeFill)"
                  strokeWidth={3}
                />
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="mazeFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-bold text-white">
          {safeDone}
          /
          {total}
        </div>
        <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      </div>
    </div>
  );
};

const Invite = () => {
  const { activeAccount } = useAeSdk();
  const { reconnectWalletSession } = useWalletConnect();
  const { generateInviteLink, loadRewardsProgress } = useXInviteFlow();
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [frontendInviteLink, setFrontendInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connectingX, setConnectingX] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    verified_friends_count: number;
    goal: number;
    milestone_reward_status: RewardStatus;
    referral_reward_ae: number;
    verification_reward_status: RewardStatus;
    verification_reward_ae: number;
    x_username: string | null;
  } | null>(null);

  const refreshProgress = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const data = await loadRewardsProgress(activeAccount);
      const referralsData = data.x_invite_reward;
      const verificationData = data.x_verification_reward;

      setProgress({
        verified_friends_count: referralsData?.verified_friends_count || 0,
        goal: referralsData?.goal || REFERRAL_GOAL,
        milestone_reward_status: (referralsData?.milestone_reward_status || 'not_started') as RewardStatus,
        referral_reward_ae: REFERRAL_REWARD_AE,
        verification_reward_status: (verificationData?.status || 'not_started') as RewardStatus,
        verification_reward_ae: VERIFICATION_REWARD_AE,
        x_username: verificationData?.x_username || null,
      });
    } catch (err: any) {
      setError((prev) => prev || err?.message || 'Failed to load rewards progress');
    }
  }, [activeAccount, loadRewardsProgress]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const referralsDone = progress?.verified_friends_count || 0;
  const referralGoal = progress?.goal || REFERRAL_GOAL;
  const referralRewardAchieved = isRewardAchieved(progress?.milestone_reward_status)
    || referralsDone >= referralGoal;
  const referralRewardAmount = progress?.referral_reward_ae || REFERRAL_REWARD_AE;
  const verificationRewardAchieved = isRewardAchieved(progress?.verification_reward_status);
  const verificationRewardAmount = progress?.verification_reward_ae || VERIFICATION_REWARD_AE;
  const isXConnected = Boolean(progress?.x_username)
    || progress?.verification_reward_status === 'pending'
    || progress?.verification_reward_status === 'paid';
  let connectXButtonLabel = 'Connect X account';
  if (connectingX) connectXButtonLabel = 'Redirecting to X...';
  if (isXConnected) {
    connectXButtonLabel = progress?.x_username
      ? `X connected (@${progress.x_username})`
      : 'X connected';
  }

  const onConnectX = useCallback(async () => {
    if (!activeAccount || !(CONFIG as any).X_OAUTH_CLIENT_ID) return;
    setError(null);
    setConnectingX(true);
    try {
      const ready = await reconnectWalletSession(activeAccount);
      if (!ready) throw new Error('Wallet session is not ready. Please connect wallet and try again.');

      const redirectUri = getXCallbackRedirectUri();
      const state = generateOAuthState();
      const codeVerifier = generateCodeVerifier();
      storeXOAuthPKCE({
        state,
        codeVerifier,
        address: activeAccount,
        redirectUri,
      });
      const url = await buildXAuthorizeUrl({
        clientId: (CONFIG as any).X_OAUTH_CLIENT_ID,
        redirectUri,
        state,
        codeVerifier,
      });
      window.location.href = url;
    } catch (err: any) {
      setError(err?.message || 'Failed to start X account connection');
    } finally {
      setConnectingX(false);
    }
  }, [activeAccount, reconnectWalletSession]);

  const onGenerateInvite = useCallback(async () => {
    if (!activeAccount) return;
    setError(null);
    setCreatingInvite(true);
    try {
      const invite = await generateInviteLink(activeAccount);
      setFrontendInviteLink(invite.frontend_invite_link);
      await refreshProgress();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate invite link');
    } finally {
      setCreatingInvite(false);
    }
  }, [activeAccount, generateInviteLink, refreshProgress]);

  const onCopyInviteLink = useCallback(async () => {
    if (!frontendInviteLink) return;
    await navigator.clipboard.writeText(frontendInviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [frontendInviteLink]);

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
          <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white m-0">Reward</h2>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-semibold ${
                  verificationRewardAchieved
                    ? 'bg-gradient-to-r from-amber-400/30 to-pink-400/30 border-amber-300/60 text-amber-100'
                    : 'bg-slate-500/20 border-slate-400/40 text-slate-200'
                }`}
              >
                <Gift
                  size={16}
                  className={verificationRewardAchieved ? 'text-amber-300' : 'text-slate-400'}
                />
                <span className="text-base md:text-lg leading-none">
                  {verificationRewardAmount}
                  {' '}
                  AE
                </span>
              </span>
            </div>
            <p className={`${PRIZE_EXPLANATION_CLASS} mt-3 mb-0`}>
              Connect Twitter (minimum 50 followers) to claim your first mission reward.
            </p>
            {(CONFIG as any).X_OAUTH_CLIENT_ID && (
              <button
                type="button"
                onClick={onConnectX}
                disabled={!activeAccount || connectingX || isXConnected}
                className={`mt-4 w-full sm:w-auto px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  !activeAccount || connectingX || isXConnected
                    ? 'bg-slate-600/50 text-white/70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:-translate-y-0.5'
                }`}
              >
                {connectXButtonLabel}
              </button>
            )}
          </section>

          {process.env.VITE_UNFINISHED_FEATURES === 'true' && (
            <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white m-0">Share</h2>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-500/20 border border-purple-400/40 text-purple-100">
                  150 AE
                </span>
              </div>
              <p className={`${PRIZE_EXPLANATION_CLASS} mt-3 mb-4`}>
                Post 10/10 tweets mentioning the Superhero link or account.
                This mission is layout-only for now.
              </p>
              <CircleMazeProgress total={SHARE_GOAL} done={0} title="Tweets" />
            </section>
          )}

          <section className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-white m-0">Referrals</h2>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-semibold ${
                  referralRewardAchieved
                    ? 'bg-gradient-to-r from-amber-400/30 to-pink-400/30 border-amber-300/60 text-amber-100'
                    : 'bg-slate-500/20 border-slate-400/40 text-slate-200'
                }`}
              >
                <Gift
                  size={16}
                  className={referralRewardAchieved ? 'text-amber-300' : 'text-slate-400'}
                />
                <span className="text-base md:text-lg leading-none">
                  {referralRewardAmount}
                  {' '}
                  AE
                </span>
              </span>
            </div>
            <div className="mt-3 flex flex-col lg:flex-row items-center justify-between gap-4">
              <p className={`${PRIZE_EXPLANATION_CLASS} m-0 max-w-2xl`}>
                Invite
                {' '}
                {referralGoal}
                {' '}
                users and have them connect Twitter
              </p>
              <CircleMazeProgress total={referralGoal} done={referralsDone} title="Users" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5 items-center">
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
                  className="px-4 py-2 rounded-xl border border-sky-300/40 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 transition-colors"
                  onClick={onCopyInviteLink}
                >
                  {copied ? 'Copied' : 'Copy invite link'}
                </button>
              )}
            </div>
            {frontendInviteLink && (
              <button
                type="button"
                onClick={onCopyInviteLink}
                className="mt-3 w-full text-left rounded-xl border border-white/30 bg-white/5 px-3 py-3 hover:bg-white/10 transition-colors cursor-copy"
              >
                <div className="text-[11px] uppercase tracking-widest text-white/60 mb-1">
                  Invite link
                </div>
                <div className="text-white font-semibold text-sm md:text-base break-all">
                  {frontendInviteLink}
                </div>
              </button>
            )}
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
                <div>{error}</div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5 mb-8 pt-1">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-extrabold m-0 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Affiliate
            </h3>
            <p className="text-slate-400 mt-1 text-sm md:text-base">
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
};

export default Invite;
