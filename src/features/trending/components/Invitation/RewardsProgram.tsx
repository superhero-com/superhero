import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../lib/utils';
import { useXPostingReward } from '../../../../hooks/useXPostingReward';
import { useAeSdk } from '../../../../hooks/useAeSdk';

const POST_TOTAL = 10;
const STREAK_TOTAL = 10;

// Milestone 1: a regular post mentioning Superhero — no referral link required.
const ONBOARDING_TWEET = 'Check out @superhero_chain — earn AE tokens by posting on X! https://superhero.com';
// Milestone 2: per-post reward requires the user's unique referral link in the post.
const REFERRAL_TWEET = (link: string) => `Check out @superhero_chain — earn AE tokens by posting on X! ${link}`;

const openTweet = (text: string) => {
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer',
  );
};

const formatCooldown = (nextCheckAt: Date) => {
  const diff = Math.max(0, nextCheckAt.getTime() - Date.now());
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const checkLabel = (loading: boolean, blocked: boolean, next: Date | null) => {
  if (loading) return 'Checking…';
  if (blocked && next) return `Check in ${formatCooldown(next)}`;
  return 'Check rewards';
};

const RewardsProgram = () => {
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
    { text: 'Link your X account to your on-chain SuperheroID', done: isXLinked },
    { text: 'Post about Superhero with your linked X account (mention @superhero_chain or link superhero.com)', done: isOnboardingPaid },
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

  const verifyActionLabel = currentVerifyStep === 0 ? 'Link Twitter' : 'Post on X';

  // Check button is available once X is linked
  const showCheckButton = isXLinked;
  const checkButtonDisabled = !canCheck || checkLoading || !activeAccount;

  return (
    <div className="mb-10">

      {/* Earnings Summary Banner */}
      {totalEarned > 0 && (
        <div className="mb-8 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
              Rewards Earned
            </span>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white m-0">
                {totalEarned}
                {' '}
                AE Earned
              </h2>
              <span className="text-3xl">🎉</span>
            </div>
            <p className="text-sm text-white/50 m-0 max-w-lg">
              Your AE rewards have been sent automatically to your connected wallet.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <span>⚠</span>
          {error}
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-5">
        {/* Milestone 1: Link X Account & Post */}
        <div
          className={cn(
            'bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8',
            verifyStatus === 'completed' && 'border-emerald-500/30',
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
                <span className="text-base">{verifyStatus === 'completed' ? '✅' : '🎁'}</span>
                Earn 50 AE
              </span>
            </div>
            <div className="mb-4">
              <span
                className={cn(
                  'inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full',
                  verifyStatus === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                  verifyStatus === 'in_progress' && 'bg-cyan-500/15 text-cyan-400',
                )}
              >
                {verifyStatus === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>
          </div>
          <div className="flex gap-10 flex-col lg:flex-row">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-white m-0 mb-2 pr-28">Link X Account &amp; Post</h3>
              {/* eslint-disable-next-line max-len */}
              <p className="text-sm text-white/70 m-0 mb-5 leading-relaxed max-w-xl">
                Verify ownership of your X account and link it on-chain to your SuperheroID. SuperheroID is a decentralized digital identity smart contract that connects all your social accounts to your wallet address. Your SuperheroID Profile will be set up automatically for you after linking your X account.
                {' '}
                <br />
                <br />
                After linking, make a post about Superhero on X from your account to spread the word and share with your network. The post just needs to mention Superhero — include a
                {' '}
                <span className="text-cyan-300">superhero.com</span>
                {' '}
                link or tag
                {' '}
                <span className="text-cyan-300">@superhero_chain</span>
                . No referral link required for this step.
                {' '}
                <br />
                <br />
                By completing this milestone, you earn 50 AE tokens!
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
                      {step.done ? '✓' : i + 1}
                    </div>
                    <div className={cn('leading-relaxed text-sm flex-1 min-w-0 pt-0.5', step.done ? 'text-emerald-300/80' : 'text-white/80')}>
                      {step.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      verifyStatus === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500',
                    )}
                    style={{ width: `${verifyProgressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="text-base">→</span>
                  </button>
                )}
                {!verifyCompleted && showCheckButton && (
                  <button
                    type="button"
                    onClick={handleCheckRewards}
                    disabled={checkButtonDisabled}
                    title={!canCheck && nextCheckAt ? `Next check available in ${formatCooldown(nextCheckAt)}` : undefined}
                    className={cn(
                      'ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      checkButtonDisabled
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
                    )}
                  >
                    {checkLabel(checkLoading, !canCheck, nextCheckAt)}
                  </button>
                )}
              </div>
              {verifyStatus === 'completed' && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Milestone complete — 50 AE earned
                </div>
              )}
              {statusLoading && !rewardData && (
                <p className="mt-3 text-xs text-white/30">Loading your progress…</p>
              )}
            </div>
          </div>
        </div>

        {/* Milestone 2: Post on X & Earn */}
        <div
          className={cn(
            'bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8',
            postStatus === 'completed' && 'border-emerald-500/30',
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
                <span className="text-base">{postStatus === 'completed' ? '✅' : '🎁'}</span>
                Earn 10~30 AE Per Post Daily
              </span>
            </div>
            <div className="mb-4">
              <span
                className={cn(
                  'inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full',
                  postStatus === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                  postStatus === 'in_progress' && 'bg-cyan-500/15 text-cyan-400',
                  postStatus === 'locked' && 'bg-white/10 text-white/40',
                )}
              >
                {postStatus === 'completed' && 'COMPLETED'}
                {postStatus === 'in_progress' && 'IN PROGRESS'}
                {postStatus === 'locked' && 'LOCKED'}
              </span>
            </div>
          </div>
          <div className="flex gap-10 flex-col lg:flex-row">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-white m-0 mb-2 pr-28">Post on X &amp; Earn</h3>
              {/* eslint-disable-next-line max-len */}
              <p className="text-sm text-white/70 m-0 mb-5 leading-relaxed max-w-xl">
                Publish posts about Superhero from your linked X account to spread the word and share with your network. Each post must include your unique referral link in the post content. Your unique referral link will automatically be created when you click &quot;Post&quot;.

                {' '}
                <br />
                <br />
                Less than 100 followers: not eligible
                {' '}
                <br />
                100 - 10k followers: 10 AE per post
                {' '}
                <br />
                10k - 1M followers: 20 AE per post
                {' '}
                <br />
                More than 1M followers: 30 AE per post
              </p>
              {tierAe > 0 && (
                <p className="text-sm text-cyan-400 font-medium">
                  Your tier:
                  {' '}
                  {tierAe}
                  {' '}
                  AE per post
                  {rewardData?.follower_count != null && (
                    <span className="text-white/40 font-normal ml-1">
                      (
                      {rewardData.follower_count.toLocaleString()}
                      {' '}
                      followers)
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
                  <span className="text-base">{postStatus === 'completed' ? '✅' : '🎁'}</span>
                  Earn 50 AE on 10-Day Streak
                </span>
              </div>

              {streakDays > 0 && (
                <p className="text-xs text-cyan-300/70 text-right mb-2">
                  Current streak:
                  {' '}
                  {streakDays}
                  /
                  {STREAK_TOTAL}
                  {' '}
                  days
                </p>
              )}

              <div className="mb-4">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      postStatus === 'completed' ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500',
                    )}
                    style={{ width: `${postProgressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
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
                      {linkLoading ? 'Opening wallet…' : 'Post on X'}
                      {!linkLoading && <span className="text-base">→</span>}
                    </button>
                    {showCheckButton && (
                      <button
                        type="button"
                        onClick={handleCheckRewards}
                        disabled={checkButtonDisabled}
                        title={!canCheck && nextCheckAt ? `Next check available in ${formatCooldown(nextCheckAt)}` : undefined}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                          checkButtonDisabled
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white',
                        )}
                      >
                        {checkLabel(checkLoading, !canCheck, nextCheckAt)}
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-white/70 m-0 my-5 leading-relaxed max-w-xl">
                For every post that meets the criteria, you earn AE tokens based on your follower tier. Posting daily for a 10 day consecutive streak will earn you 50 AE extra, so keep posting and engaging with the community.
              </p>
              {postStatus === 'completed' && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Milestone complete —
                  {' '}
                  {rewardedPostCount * tierAe}
                  {' '}
                  AE earned
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
