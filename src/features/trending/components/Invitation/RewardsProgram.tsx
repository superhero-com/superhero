import { useState, useCallback } from 'react';
import MilestoneCard from './MilestoneCard';
import type { MilestoneStep } from './MilestoneCard';

const VERIFY_STEPS_INITIAL: MilestoneStep[] = [
  { text: 'Link your X account to your on-chain SuperheroID', done: false },
  { text: 'Post about Superhero with your linked X account', done: false },
];

const RewardsProgram = () => {
  const [verifySteps, setVerifySteps] = useState<MilestoneStep[]>(VERIFY_STEPS_INITIAL);
  const [postCount, setPostCount] = useState(0);

  const verifyDone = verifySteps.filter((s) => s.done).length;
  const verifyTotal = verifySteps.length;
  const verifyCompleted = verifyDone === verifyTotal;

  const postTotal = 10;
  const postCompleted = postCount >= postTotal;

  // The current step index the user needs to act on (first non-done step)
  const currentVerifyStep = verifySteps.findIndex((s) => !s.done);

  const verifyActionLabels: Record<number, string> = {
    0: 'Connect Twitter',
    1: 'Post on X',
  };
  const verifyActionLabel = verifyActionLabels[currentVerifyStep];

  const handleVerifyAction = useCallback(() => {
    setVerifySteps((prev) => {
      const nextIdx = prev.findIndex((s) => !s.done);
      if (nextIdx === -1) return prev;

      // TODO: Replace with real logic per step:
      // Step 0 → Twitter OAuth flow
      // Step 1 → Wallet signature request
      // Step 2 → Open compose tweet flow
      // For now, just mark the step as done (skip actual logic)

      const updated = prev.map((s, i) => (i === nextIdx ? { ...s, done: true } : s));
      return updated;
    });
  }, []);

  const handlePostOnX = useCallback(() => {
    // TODO: Replace with real post verification logic
    // For now, just increment the counter
    setPostCount((prev) => Math.min(prev + 1, postTotal));
  }, []);

  const totalAe = 200;
  const earnedAe = (verifyCompleted ? 50 : 0) + (postCompleted ? 150 : 0);
  const hasClaimableReward = earnedAe > 0;

  return (
    <div className="mb-10">
      {/* Hero */}
      <div className="mb-8 py-2">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Superhero
            {' '}
          </span>
          <span className="text-white">Rewards</span>
        </h1>
        <p className="text-white/40 text-lg mt-3 m-0">
          Complete milestones to earn up to
          {' '}
          <span className="text-cyan-400 font-bold">
            {totalAe}
            +
            {' '}
            AE
          </span>
          {' '}
          in rewards.
        </p>
      </div>

      {/* Claim Reward Banner */}
      {hasClaimableReward && (
        <div className="mb-8 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
              Ready to Claim
            </span>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white m-0">
                {earnedAe}
                {' '}
                AE Earned
              </h2>
              <span className="text-3xl">🎉</span>
            </div>
            <p className="text-sm text-white/50 m-0 mb-5 max-w-lg">
              You&apos;ve completed milestones. Claim your tokens to your connected wallet.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              🎁 Claim
              {' '}
              {earnedAe}
              {' '}
              AE Tokens
            </button>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-5">
        {/* Milestone 1: Link X Account */}
        <MilestoneCard
          title="Link X Account & Post"
          description="Verify ownership of your X account and link it on-chain to your SuperheroID. SuperheroID is a digital identity smart contract that connects all your social accounts to your wallet address. After linking, make a post about Superhero on X from your account to spread the word and share with your network. By completing this milestone, you earn 50 AE tokens!"
          earnLabel="Earn"
          rewardAe={50}
          status={verifyCompleted ? 'completed' : 'in_progress'}
          current={verifyDone}
          total={verifyTotal}
          steps={verifySteps}
          actionLabel={verifyCompleted ? undefined : verifyActionLabel}
          onAction={handleVerifyAction}
        />

        {/* Milestone 2: Post & Earn */}
        <MilestoneCard
          title="Post & Earn"
          description="Publish posts about Superhero from your linked X account to spread the word and share with your network. Each post must include your unique referral link in the post content. Post about your trades, your experience, or share news about Superhero. For every post that meets the criteria, you earn 10 AE tokens. Daily streaks will earn you bonus rewards, so keep posting and engaging with the community!"
          earnLabel="Earn Daily"
          rewardAe={10}
          // eslint-disable-next-line no-nested-ternary
          status={postCompleted ? 'completed' : (verifyCompleted ? 'in_progress' : 'locked')}
          current={postCount}
          steps={[{ info: true, text: 'Posting each day for a 10-day streak unlocks 50 AE Bonus' }]}
          total={postTotal}
          actionLabel={postCompleted ? undefined : 'Post on X'}
          onAction={handlePostOnX}
        />
      </div>
    </div>
  );
};

export default RewardsProgram;
