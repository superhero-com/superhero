import { useState, useCallback } from 'react';
import MilestoneCard from './MilestoneCard';
import type { MilestoneStatus } from './MilestoneCard';

interface MilestoneData {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  rewardAe: number;
  status: MilestoneStatus;
  current?: number;
  total?: number;
  statusLabel?: string;
  actionLabel?: string;
}

const INITIAL_MILESTONES: MilestoneData[] = [
  {
    id: 'verify-x',
    icon: '🛡️',
    title: 'Verify X Account & Post',
    description: 'Connect your account and verify wallet signatures to prove ownership.',
    rewardAe: 50,
    status: 'in_progress',
    current: 40,
    total: 100,
    statusLabel: 'VERIFICATION LOGIC: 40%',
    actionLabel: 'Verify Identity',
  },
  {
    id: 'invite-grow',
    icon: '👥',
    title: 'Invite & Grow',
    description: 'Refer 5 new users to the platform to unlock 200 AE.',
    rewardAe: 100,
    status: 'in_progress',
    current: 2,
    total: 5,
  },
  {
    id: 'post-about',
    icon: '📋',
    title: 'Post about Superhero',
    description: 'Publish 10 posts about superhero. Post should include "superhero.com" in text.',
    rewardAe: 100,
    status: 'in_progress',
    current: 3,
    total: 10,
  },
];

interface CompletedOp {
  label: string;
}

const CLAIMED_MILESTONES: MilestoneData[] = [
  {
    id: 'verify-x',
    icon: '🛡️',
    title: 'Verify X Account & Post',
    description: 'Connect your account and verify wallet signatures to prove ownership.',
    rewardAe: 50,
    status: 'completed',
    current: 100,
    total: 100,
  },
  {
    id: 'invite-grow',
    icon: '👥',
    title: 'Invite & Grow',
    description: 'Refer 5 new users to the platform to unlock 200 AE.',
    rewardAe: 100,
    status: 'in_progress',
    current: 2,
    total: 5,
  },
  {
    id: 'post-about',
    icon: '📋',
    title: 'Post about Superhero',
    description: 'Publish 10 posts about superhero. Post should include "superhero.com" in text.',
    rewardAe: 100,
    status: 'completed',
    current: 10,
    total: 10,
  },
];

const DEBUG_STAGES = [
  { label: 'In Progress', data: INITIAL_MILESTONES },
  { label: 'Claimed', data: CLAIMED_MILESTONES },
] as const;

const RewardsProgram = () => {
  const [debugStage, setDebugStage] = useState(0);
  const milestones = DEBUG_STAGES[debugStage].data;

  const completedOps: CompletedOp[] = milestones
    .filter((m) => m.status === 'completed')
    .map((m) => ({ label: m.title }));

  const hasClaimableReward = completedOps.length > 0;
  const claimableAe = milestones
    .filter((m) => m.status === 'completed')
    .reduce((sum, m) => sum + m.rewardAe, 0);

  const verifyMilestone = milestones.find((m) => m.id === 'verify-x');
  const otherMilestones = milestones.filter((m) => m.id !== 'verify-x');

  const handleVerifyIdentity = useCallback(() => {
    window.open('https://x.com', '_blank');
  }, []);

  return (
    <div className="mb-10">
      {/* DEBUG toggle — remove before production */}
      <button
        type="button"
        onClick={() => setDebugStage((s) => (s + 1) % DEBUG_STAGES.length)}
        className="mb-4 px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-mono hover:bg-yellow-500/30 transition-colors"
      >
        DEBUG: {DEBUG_STAGES[debugStage].label} → {DEBUG_STAGES[(debugStage + 1) % DEBUG_STAGES.length].label}
      </button>

      {/* Hero */}
      <div className="mb-8 py-2">
        <div className="text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-cyan-400 mb-3">
          Refer & Earn
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Superhero{' '}
          </span>
          <span className="text-white">
            Rewards Program
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-400 mt-3 m-0">
          Complete Milestones to Unlock Next Phases and Earn up to 200+ AE tokens
        </p>
      </div>

      {/* Claim Reward Banner — only visible when at least one milestone is completed */}
      {hasClaimableReward && (
        <div className="mb-8 bg-[#0d1117]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Left: Claim section */}
            <div className="flex-1">
              <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
                Milestone Unlocked
              </span>
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white m-0">
                  Claim Your AE Reward
                </h2>
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                  ⭐
                </div>
              </div>
              <p className="text-sm text-white/50 m-0 mb-5">
                Verification phase complete. You have earned {claimableAe} AE tokens for confirming ownership and social presence.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  🎁 Claim {claimableAe} AE Tokens
                </button>
                <span className="text-xs text-white/30 uppercase tracking-wider">
                  Transaction est. <span className="text-emerald-400 font-semibold">0.0004 GAS</span>
                </span>
              </div>
            </div>

            {/* Right: Completed Ops */}
            <div className="lg:min-w-[200px]">
              <h4 className="text-sm font-bold text-white m-0 mb-3">Completed Ops</h4>
              <div className="space-y-2">
                {completedOps.map((op) => (
                  <div key={op.label} className="flex items-center gap-2 text-sm text-white/70">
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {op.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Milestone — Verify X Account (expanded) */}
      {verifyMilestone && verifyMilestone.status !== 'completed' && (
        <div className="mb-6">
          <MilestoneCard
            icon={verifyMilestone.icon}
            title={verifyMilestone.title}
            description={verifyMilestone.description}
            rewardAe={verifyMilestone.rewardAe}
            status={verifyMilestone.status}
            current={verifyMilestone.current}
            total={verifyMilestone.total}
            statusLabel={verifyMilestone.statusLabel}
            actionLabel={verifyMilestone.actionLabel}
            onAction={handleVerifyIdentity}
            expanded
          />
        </div>
      )}

      {/* Secondary Milestones — side by side */}
      {otherMilestones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {otherMilestones.map((m) => (
            <MilestoneCard
              key={m.id}
              icon={m.icon}
              title={m.title}
              description={m.description}
              rewardAe={m.rewardAe}
              status={m.status}
              current={m.current}
              total={m.total}
              statusLabel={m.statusLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RewardsProgram;
