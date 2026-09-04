import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  Gift, CheckCircle2, Check, AlertTriangle, Lock, Loader2,
  ArrowRight, Target, PartyPopper, RefreshCw, Clock, UserCheck, Send,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useXPostingReward } from '../../../../hooks/useXPostingReward';
import { useAeSdk } from '../../../../hooks/useAeSdk';
import { openXComposeIntent } from '../../../../utils/openXLink';
import TrophyIcon from '../../../../svg/iconTrophy.svg?react';
import FlameIcon from '../../../../svg/iconFlame.svg?react';
import CelebrationIcon from '../../../../svg/iconCelebration.svg?react';

const POST_TOTAL = 10;
const STREAK_TOTAL = 10;

// Milestone 1: a regular post mentioning Superhero — no referral link required.
const ONBOARDING_TWEET = 'Check out @superhero_chain — earn AE tokens by posting on X! https://superhero.com';
// Milestone 2: per-post reward requires the user's unique referral link in the post.
const REFERRAL_TWEET = (link: string) => `Check out @superhero_chain — earn AE tokens by posting on X! ${link}`;

const openTweet = (text: string) => {
  openXComposeIntent(text);
};

const formatCooldown = (nextCheckAt: Date) => {
  const diff = Math.max(0, nextCheckAt.getTime() - Date.now());
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const checkLabel = (loading: boolean, blocked: boolean, next: Date | null, t: TFunc) => {
  if (loading) return t('rewardsProgram.check.checking');
  if (blocked && next) return t('rewardsProgram.check.checkIn', { time: formatCooldown(next) });
  return t('rewardsProgram.check.checkRewards');
};

const RewardsProgram = () => {
  const { t } = useTranslation('trending');
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();
  const {
    status: rewardData,
    referralLink,
    statusLoading,
    checkLoading,
    linkLoading,
    error,
    canCheck,
    nextCheckAt,
    fetchReferralLink,
    runRewardCheck,
  } = useXPostingReward();

  // --- derived state ---
  const isXLinked = Boolean(rewardData?.x_username) || (rewardData != null && rewardData.status !== 'not_started');
  const isOnboardingPaid = rewardData?.status === 'paid';
  // "Referral posts rewarded" — always use per_post_total_paid_count, never qualified_posts_count.
  const rewardedPostCount = rewardData?.per_post_total_paid_count ?? 0;
  const streakDays = rewardData?.current_streak_days ?? 0;
  const tierAe = rewardData?.tier_amount_ae ?? 0;
  const totalEarned = (isOnboardingPaid ? 50 : 0) + rewardedPostCount * tierAe;

  const verifySteps = [
    { text: t('rewardsProgram.milestone1.step1'), done: isXLinked, Icon: UserCheck },
    { text: t('rewardsProgram.milestone1.step2'), done: isOnboardingPaid, Icon: Send },
  ];
  const verifyDone = verifySteps.filter((s) => s.done).length;
  const verifyTotal = verifySteps.length;
  const verifyCompleted = verifyDone === verifyTotal;
  const verifyProgressPct = Math.min((verifyDone / verifyTotal) * 100, 100);

  const postCompleted = rewardedPostCount >= POST_TOTAL;
  const postProgressPct = Math.min((rewardedPostCount / POST_TOTAL) * 100, 100);

  const verifyStatus = verifyCompleted ? 'completed' : 'in_progress';
  const postStatus = postCompleted ? 'completed' : verifyCompleted ? 'in_progress' : 'locked'; // eslint-disable-line no-nested-ternary

  const currentVerifyStep = verifySteps.findIndex((s) => !s.done);

  // --- actions ---
  const handleVerifyAction = useCallback(async () => {
    if (currentVerifyStep === 0) {
      // Navigate to profile page to link X
      if (activeAccount) navigate(`/users/${encodeURIComponent(activeAccount)}`);
      return;
    }
    // Step 1: post about Superhero — a regular post, no referral link needed.
    openTweet(ONBOARDING_TWEET);
  }, [activeAccount, currentVerifyStep, navigate]);

  const handlePostOnX = useCallback(async () => {
    // Per-post reward (Path 2) requires the unique referral link in the post.
    const link = referralLink || (await fetchReferralLink())?.link;
    if (link) openTweet(REFERRAL_TWEET(link));
  }, [fetchReferralLink, referralLink]);

  const handleCheckRewards = useCallback(async () => {
    await runRewardCheck();
  }, [runRewardCheck]);

  const verifyActionLabel = currentVerifyStep === 0
    ? t('rewardsProgram.milestone1.linkX')
    : t('rewardsProgram.milestone1.postOnX');

  // Check button is available once X is linked
  const showCheckButton = isXLinked;
  const checkButtonDisabled = !canCheck || checkLoading || !activeAccount;

  const renderCheckIcon = () => {
    if (checkLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (!canCheck && nextCheckAt) return <Clock className="w-4 h-4" />;
    return <RefreshCw className="w-4 h-4" />;
  };

  return (
    <div className="mb-10">

      {/* Earnings Summary Banner */}
      {totalEarned > 0 && (
        <div className="mb-8 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden animate-celebrationPop animate-glowPulse">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-4 right-4">
            <TrophyIcon className="w-12 h-12 text-emerald-400 animate-bounce" />
          </div>
          <div className="relative">
            <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 animate-shimmer">
              <CelebrationIcon className="inline w-4 h-4 mr-1 animate-sparkle" />
              {t('rewardsProgram.rewardsEarnedBadge')}
            </span>
            <div className="flex items-center gap-4 mb-3 animate-slideUp">
              <h2 className="text-2xl md:text-3xl font-bold text-white m-0">
                {t('rewardsProgram.aeEarned', { amount: totalEarned })}
              </h2>
              <PartyPopper className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <p className="text-sm text-white/50 m-0 max-w-lg animate-fadeIn animate-delay-200">
              {t('rewardsProgram.rewardsSentAutomatically')}
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-5">
        {/* Milestone 1: Link X Account & Post */}
        <div
          className={cn(
            'bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 animate-scaleIn hover-lift',
            verifyStatus === 'completed' && 'border-emerald-500/30 animate-glowPulse',
            verifyStatus === 'in_progress' && 'border-cyan-500/20',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="mb-4">
              <span
                className={cn(
                  'px-4 py-2 rounded-full font-bold text-sm tracking-wide flex gap-2',
                  verifyStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/25',
                )}
              >
                {verifyStatus === 'completed'
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Gift className="w-4 h-4" />}
                {t('rewardsProgram.milestone1.earnBadge')}
              </span>
            </div>
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full',
                  verifyStatus === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                  verifyStatus === 'in_progress' && 'bg-cyan-500/15 text-cyan-400',
                )}
              >
                {verifyStatus === 'completed'
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <Loader2 className="w-3 h-3 animate-spin" />}
                {verifyStatus === 'completed' ? t('rewardsProgram.status.completed') : t('rewardsProgram.status.inProgress')}
              </span>
            </div>
          </div>
          <div className="flex gap-10 flex-col lg:flex-row">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-white m-0 mb-2 pr-28">{t('rewardsProgram.milestone1.title')}</h3>
              <p className="text-sm text-white/70 m-0 mb-5 leading-relaxed max-w-xl">
                {t('rewardsProgram.milestone1.descIdentity')}
                <br />
                <br />
                <Trans
                  t={t}
                  i18nKey="rewardsProgram.milestone1.descPost"
                  components={{
                    link: <span className="text-cyan-300" />,
                    handle: <span className="text-cyan-300" />,
                  }}
                />
                <br />
                <br />
                {t('rewardsProgram.milestone1.descFollowers')}
                <br />
                <br />
                {t('rewardsProgram.milestone1.descEarn')}
              </p>
            </div>
            <div className="flex-1 mt-10">
              <div className="grid gap-2 mb-8">
                {verifySteps.map((step, i) => (
                  <div
                    key={step.text}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl transition-all duration-200',
                      step.done ? 'bg-emerald-500/10' : 'bg-white/[0.04] hover:bg-white/[0.06]',
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 text-xs',
                        step.done ? 'bg-emerald-500/30 text-emerald-400' : 'bg-white/5 border border-white/10 text-white/50',
                      )}
                    >
                      {step.done ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className={cn('leading-relaxed text-sm flex-1 min-w-0 pt-0.5 flex items-start gap-2', step.done ? 'text-emerald-300/80' : 'text-white/80')}>
                      <step.Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', step.done ? 'text-emerald-400/70' : 'text-cyan-400/70')} />
                      <span className="flex-1 min-w-0">{step.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out relative',
                      verifyStatus === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500',
                    )}
                    style={{
                      width: `${verifyProgressPct}%`,
                      animation: verifyProgressPct > 0 ? 'progressFill 1s ease-out' : 'none',
                    }}
                  >
                    {verifyProgressPct > 0 && (
                      <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Target className={cn('w-5 h-5', verifyCompleted ? 'text-emerald-400' : 'text-cyan-400/80')} />
                <span className="text-2xl font-bold text-white">{verifyDone}</span>
                <span className="text-sm text-white/30">
                  /
                  {verifyTotal}
                </span>
                {!verifyCompleted && activeAccount && (
                  <button
                    type="button"
                    onClick={handleVerifyAction}
                    className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25"
                  >
                    {verifyActionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {!verifyCompleted && showCheckButton && (
                  <button
                    type="button"
                    onClick={handleCheckRewards}
                    disabled={checkButtonDisabled}
                    title={!canCheck && nextCheckAt ? t('rewardsProgram.check.nextCheckTooltip', { time: formatCooldown(nextCheckAt) }) : undefined}
                    className={cn(
                      'ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      checkButtonDisabled
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
                    )}
                  >
                    {renderCheckIcon()}
                    {checkLabel(checkLoading, !canCheck, nextCheckAt, t)}
                  </button>
                )}
              </div>
              {verifyStatus === 'completed' && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium animate-celebrationPop">
                  <TrophyIcon className="w-5 h-5 animate-bounce" />
                  {t('rewardsProgram.milestone1.complete')}
                  <CelebrationIcon className="w-4 h-4 animate-sparkle" />
                </div>
              )}
              {statusLoading && !rewardData && (
                <p className="mt-3 text-xs text-white/30">{t('rewardsProgram.milestone1.loadingProgress')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Milestone 2: Post on X & Earn */}
        <div
          className={cn(
            'bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 animate-scaleIn animate-delay-100 hover-lift',
            postStatus === 'completed' && 'border-emerald-500/30 animate-glowPulse',
            postStatus === 'in_progress' && 'border-cyan-500/20',
            postStatus === 'locked' && 'border-white/10 opacity-80',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="mb-4">
              <span
                className={cn(
                  'px-4 py-2 rounded-full font-bold text-sm tracking-wide flex gap-2',
                  postStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/25',
                )}
              >
                {postStatus === 'completed'
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Gift className="w-4 h-4" />}
                {t('rewardsProgram.milestone2.earnBadge')}
              </span>
            </div>
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full',
                  postStatus === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                  postStatus === 'in_progress' && 'bg-cyan-500/15 text-cyan-400',
                  postStatus === 'locked' && 'bg-white/10 text-white/40',
                )}
              >
                {postStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                {postStatus === 'in_progress' && <Loader2 className="w-3 h-3 animate-spin" />}
                {postStatus === 'locked' && <Lock className="w-3 h-3" />}
                {postStatus === 'completed' && t('rewardsProgram.status.completed')}
                {postStatus === 'in_progress' && t('rewardsProgram.status.inProgress')}
                {postStatus === 'locked' && t('rewardsProgram.status.locked')}
              </span>
            </div>
          </div>
          <div className="flex gap-10 flex-col lg:flex-row">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-white m-0 mb-2 pr-28">{t('rewardsProgram.milestone2.title')}</h3>
              <p className="text-sm text-white/70 m-0 mb-5 leading-relaxed max-w-xl">
                {t('rewardsProgram.milestone2.desc')}
                <br />
                <br />
                {t('rewardsProgram.milestone2.tierIneligible')}
                <br />
                {t('rewardsProgram.milestone2.tier1')}
                <br />
                {t('rewardsProgram.milestone2.tier2')}
                <br />
                {t('rewardsProgram.milestone2.tier3')}
              </p>
              {tierAe > 0 && (
                <p className="text-sm text-cyan-400 font-medium">
                  {t('rewardsProgram.milestone2.yourTier', { amount: tierAe })}
                  {rewardData?.follower_count != null && (
                    <span className="text-white/40 font-normal ml-1">
                      {t('rewardsProgram.milestone2.yourTierFollowers', { followers: rewardData.follower_count.toLocaleString() })}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex-1">
              <div className="mb-4 flex justify-end">
                <span
                  className={cn(
                    'px-4 py-2 rounded-full font-bold text-sm tracking-wide flex gap-2',
                    postStatus === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/25',
                  )}
                >
                  {postStatus === 'completed'
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Gift className="w-4 h-4" />}
                  {t('rewardsProgram.milestone2.streakBadge')}
                </span>
              </div>

              {streakDays > 0 && (
                <p className="text-xs text-cyan-300/70 text-right mb-2 flex items-center gap-1 justify-end animate-slideDown">
                  <FlameIcon className="w-4 h-4 text-orange-400 animate-float" />
                  {t('rewardsProgram.milestone2.currentStreak', { days: streakDays, total: STREAK_TOTAL })}
                </p>
              )}

              <div className="mb-4">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out relative',
                      postStatus === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500',
                    )}
                    style={{
                      width: `${postProgressPct}%`,
                      animation: postProgressPct > 0 ? 'progressFill 1s ease-out' : 'none',
                    }}
                  >
                    {postProgressPct > 0 && (
                      <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Target className={cn('w-5 h-5', postCompleted ? 'text-emerald-400' : 'text-cyan-400/80')} />
                <span className="text-2xl font-bold text-white">{rewardedPostCount}</span>
                <span className="text-sm text-white/30">
                  /
                  {POST_TOTAL}
                </span>
                {postStatus !== 'completed' && (
                  <>
                    <button
                      type="button"
                      onClick={handlePostOnX}
                      disabled={postStatus === 'locked' || linkLoading}
                      className={cn(
                        'ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5',
                        postStatus === 'locked'
                          ? 'bg-white/10 cursor-not-allowed opacity-50'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                      )}
                    >
                      {linkLoading ? t('rewardsProgram.milestone2.openingWallet') : t('rewardsProgram.milestone2.postOnX')}
                      {!linkLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                    {showCheckButton && (
                      <button
                        type="button"
                        onClick={handleCheckRewards}
                        disabled={checkButtonDisabled}
                        title={!canCheck && nextCheckAt ? t('rewardsProgram.check.nextCheckTooltip', { time: formatCooldown(nextCheckAt) }) : undefined}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                          checkButtonDisabled
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
                        )}
                      >
                        {checkLabel(checkLoading, !canCheck, nextCheckAt, t)}
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-white/70 m-0 my-5 leading-relaxed max-w-xl">
                {t('rewardsProgram.milestone2.streakInfo')}
              </p>
              {postStatus === 'completed' && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium animate-celebrationPop success-celebration">
                  <TrophyIcon className="w-5 h-5 animate-bounce" />
                  {t('rewardsProgram.milestone2.complete', { amount: rewardedPostCount * tierAe })}
                  <CelebrationIcon className="w-4 h-4 animate-sparkle" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsProgram;
