import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useAeSdk } from '@/hooks/useAeSdk';
import { getAffiliationTreasury } from '@/libs/affiliation';
import { Decimal } from '@/libs/decimal';
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import Spinner from '@/components/Spinner';

const MIN_INVITEES = 4;
const MIN_SPENT_AE = 10;

type UniqueInviteesState =
  | 'ThresholdReached'
  | { ThresholdReached: [] }
  | { WaitingForInvitations: [unknown, unknown] };

function isThresholdReachedState(state: unknown): boolean {
  if (!state) return false;
  if (state === 'ThresholdReached') return true;
  return typeof state === 'object' && 'ThresholdReached' in (state as any);
}

function getWaitingForInvitations(state: unknown): [unknown, unknown] | null {
  if (!state || typeof state !== 'object') return null;
  const waiting = (state as any).WaitingForInvitations;
  return Array.isArray(waiting) && waiting.length === 2 ? (waiting as [unknown, unknown]) : null;
}

function normalizeAddressSetToArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === 'string') as string[];
  // Some decoders may return Set or custom set-like objects
  if (value instanceof Set) return Array.from(value).filter((x): x is string => typeof x === 'string');
  if (typeof (value as any).values === 'function') {
    try {
      return Array.from((value as any).values()).filter((x): x is string => typeof x === 'string');
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeAddressToAettosEntries(value: unknown): Array<[string, string]> {
  if (!value) return [];
  if (value instanceof Map) {
    return Array.from(value.entries())
      .filter(([k]) => typeof k === 'string')
      .map(([k, v]) => [k as string, String(v)]);
  }
  if (Array.isArray(value)) {
    // Sometimes decoded as array of tuples
    return value
      .map((item) => (Array.isArray(item) && item.length >= 2 ? [item[0], item[1]] : null))
      .filter((x): x is [unknown, unknown] => !!x)
      .filter(([k]) => typeof k === 'string')
      .map(([k, v]) => [k as string, String(v)]);
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
  }
  return [];
}

const REWARD_PARTICLES = [
  {
    id: 'p0',
    left: '20%',
    top: '30%',
    delay: '0s',
  },
  {
    id: 'p1',
    left: '35%',
    top: '70%',
    delay: '0.3s',
  },
  {
    id: 'p2',
    left: '50%',
    top: '30%',
    delay: '0.6s',
  },
  {
    id: 'p3',
    left: '65%',
    top: '70%',
    delay: '0.9s',
  },
  {
    id: 'p4',
    left: '80%',
    top: '30%',
    delay: '1.2s',
  },
  {
    id: 'p5',
    left: '95%',
    top: '70%',
    delay: '1.5s',
  },
] as const;

const CollectRewardsCard = () => {
  const { sdk, activeAccount } = useAeSdk();

  // State
  const [accumulatedRewardsAe, setAccumulatedRewardsAe] = useState<Decimal>(
    Decimal.ZERO,
  );
  const [inviteesReachedCount, setInviteesReachedCount] = useState<number>(0);
  const [inviteesInProgressCount, setInviteesInProgressCount] = useState<number>(0);
  const [inviteeProgress, setInviteeProgress] = useState<
    Array<{ address: string; spentAe: Decimal; progressPct: number; reached: boolean }>
  >([]);
  const [thresholdReached, setThresholdReached] = useState<boolean>(false);
  const [collectingReward, setCollectingReward] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate progress percentage
  const progressPercentage = Math.min(
    (inviteesReachedCount / MIN_INVITEES) * 100,
    100,
  );

  // Check if eligible for rewards
  const isEligibleForRewards = thresholdReached && accumulatedRewardsAe.gt(Decimal.ZERO);

  // Calculate accumulated rewards
  const calculateAccumulatedRewards = useCallback(async () => {
    if (!activeAccount || !sdk) return;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const rewards = await affiliationTreasury.getAccumulatedRewards(
        activeAccount,
      );
      const rewardsAe = Number(rewards) / 1e18;
      setAccumulatedRewardsAe(Decimal.from(rewardsAe));
    } catch (error) {
      console.error('Failed to calculate accumulated rewards:', error);
      setAccumulatedRewardsAe(Decimal.ZERO);
    }
  }, [activeAccount, sdk]);

  // Calculate unique invitees
  const calculateUniqueInvitees = useCallback(async () => {
    if (!activeAccount || !sdk) return;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const inviteeData: UniqueInviteesState = await affiliationTreasury
        .getUniqueInvitee(activeAccount);

      if (isThresholdReachedState(inviteeData)) {
        setThresholdReached(true);
        setInviteesReachedCount(MIN_INVITEES);
        setInviteesInProgressCount(0);
        setInviteeProgress([]);
        return;
      }

      const waiting = getWaitingForInvitations(inviteeData);
      if (!waiting) {
        setThresholdReached(false);
        setInviteesReachedCount(0);
        setInviteesInProgressCount(0);
        setInviteeProgress([]);
        return;
      }

      const reachedAddresses = normalizeAddressSetToArray(waiting[0]);
      const waitingEntries = normalizeAddressToAettosEntries(waiting[1]);

      const reachedCount = reachedAddresses.length;
      const inProgressCount = waitingEntries.length;

      const progressItems: Array<{
        address: string;
        spentAe: Decimal;
        progressPct: number;
        reached: boolean;
      }> = [];

      reachedAddresses.forEach((addr) => {
        progressItems.push({
          address: addr,
          spentAe: Decimal.from(MIN_SPENT_AE),
          progressPct: 100,
          reached: true,
        });
      });

      waitingEntries.forEach(([addr, aettosStr]) => {
        // aettosStr should already be in 18-decimals (aettos), same format Decimal expects
        const spent = Decimal.fromBigNumberString(aettosStr);
        const pct = Math.max(
          0,
          Math.min(100, Number(spent.div(MIN_SPENT_AE).mul(100).toString(0))),
        );
        progressItems.push({
          address: addr,
          spentAe: spent,
          progressPct: Number.isFinite(pct) ? pct : 0,
          reached: false,
        });
      });

      // Sort: reached first, then highest spend
      progressItems.sort((a, b) => {
        if (a.reached !== b.reached) return a.reached ? -1 : 1;
        if (a.spentAe.eq(b.spentAe)) return 0;
        return a.spentAe.gt(b.spentAe) ? -1 : 1;
      });

      setThresholdReached(false);
      setInviteesReachedCount(reachedCount);
      setInviteesInProgressCount(inProgressCount);
      setInviteeProgress(progressItems);
    } catch (error: any) {
      const msg = error?.message
        ?? error?.reason
        ?? (error?.cause && typeof error.cause === 'object' && (error.cause as any)?.message)
        ?? String(error);
      const isKeyNotFound = typeof msg === 'string'
        && (msg.includes('Key does not exist') || msg.includes('Maps:'));
      if (isKeyNotFound) {
        // Account has no invitee data in the contract map yet (never invited or no state)
        setThresholdReached(false);
        setInviteesReachedCount(0);
        setInviteesInProgressCount(0);
        setInviteeProgress([]);
        return;
      }
      console.error('Failed to calculate unique invitees:', error);
      setThresholdReached(false);
      setInviteesReachedCount(0);
      setInviteesInProgressCount(0);
      setInviteeProgress([]);
    }
  }, [activeAccount, sdk]);

  // Collect rewards
  const onCollectReward = async () => {
    if (!activeAccount || !sdk) return;

    setCollectingReward(true);
    setErrorMessage(null);

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      await affiliationTreasury.withdraw();

      // Refresh rewards after successful withdrawal
      await calculateAccumulatedRewards();
    } catch (error: any) {
      console.error('Failed to collect rewards:', error);

      if (
        error?.message?.includes('MINIMUM_ACCOUNTS_THRESHOLD_NOT_REACHED')
        || error?.message?.includes('MINIMUM_OF_4_ACCOUNTS_SHALL_BUY')
      ) {
        setErrorMessage(
          `Not eligible yet: you need ${MIN_INVITEES} direct invitees who each spent at least ${MIN_SPENT_AE} AE in token sales.`,
        );
      } else {
        setErrorMessage(error?.message || 'An error occurred while collecting rewards.');
      }
    } finally {
      setCollectingReward(false);
    }
  };

  // Load data when account changes
  useEffect(() => {
    if (activeAccount && sdk) {
      calculateAccumulatedRewards();
      calculateUniqueInvitees();
    }
  }, [
    activeAccount,
    sdk,
    calculateAccumulatedRewards,
    calculateUniqueInvitees,
  ]);

  const collectButtonContent = useMemo(() => {
    if (collectingReward) {
      return (
        <div className="flex items-center justify-center gap-3">
          <Spinner className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          Withdrawing...
        </div>
      );
    }
    if (!thresholdReached) return 'Not eligible yet';
    if (accumulatedRewardsAe.lte(Decimal.ZERO)) return 'No rewards yet';
    return (
      <span className="flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5" />
        Collect rewards
      </span>
    );
  }, [collectingReward, thresholdReached, accumulatedRewardsAe]);

  return (
    <div
      className={
        'bg-gradient-to-br from-black/40 via-purple-900/20 to-black/40 backdrop-blur-xl '
        + 'border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 '
        + 'before:content-[\'\'] before:absolute before:top-0 before:left-0 before:right-0 before:h-px '
        + 'before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 '
        + 'before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100'
      }
    >
      {/* Animated background particles */}
      {isEligibleForRewards && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {REWARD_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 bg-pink-400/30 rounded-full animate-ping"
              style={{
                left: p.left,
                top: p.top,
                animationDelay: p.delay,
                animationDuration: '2s',
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap relative z-10">
        <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0">
          {isEligibleForRewards ? (
            <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 animate-pulse" />
          ) : (
            '💰'
          )}
        </div>
        <div className="flex-1">
          <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
            Collect Your Rewards
          </h3>
          <p className="text-sm md:text-base text-slate-400 mt-2 m-0">
            {isEligibleForRewards
              ? "🎉 You're eligible! Withdraw your rewards anytime."
              : 'Invite friends and earn rewards when they buy tokens'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
        {/* Description - Left Side */}
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-blue-500/10 rounded-xl border border-green-400/20">
            <p className="text-sm md:text-base text-white m-0 font-medium">
              Once
              {' '}
              <span className="text-green-400 font-bold">
                {MIN_INVITEES}
                {' '}
                direct invitees
              </span>
              {' '}
              have each spent at least
              {' '}
              <span className="text-green-400 font-bold">
                {MIN_SPENT_AE}
                {' '}
                AE
              </span>
              {' '}
              (cumulative) in token sales, you can withdraw accumulated rewards.
              {' '}
              Rewards build as your invitees participate.
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="m-0">Rewards reflect on-chain activity from your invitees</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <p className="m-0">Withdraw after you meet the threshold and have a positive balance</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">✓</span>
              <p className="m-0">Track per-invitee progress toward the spending minimum</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 opacity-80 m-0">
            Note: eligibility and rewards depend on on-chain activity and are not guaranteed.
          </p>
        </div>

        {/* Progress and Actions - Right Side */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Progress Section */}
          <div className="flex flex-col gap-3 p-5 sm:p-6 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden">
            {isEligibleForRewards && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-teal-500/20 to-blue-500/20 animate-pulse" />
            )}
            <div className="flex justify-between items-center font-semibold text-sm md:text-base flex-wrap gap-2 relative z-10">
              <span className="text-white">Progress to Rewards</span>
              <span
                className={`font-bold text-base md:text-lg break-words ${
                  thresholdReached
                    ? 'text-green-400 text-shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                    : 'text-teal-400 text-shadow-[0_0_10px_rgba(78,205,196,0.5)]'
                }`}
              >
                {inviteesReachedCount}
                /
                {MIN_INVITEES}
                {' '}
                reached
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
              <div
                className={`h-full rounded-full transition-all duration-[1000ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10 overflow-hidden ${
                  isEligibleForRewards
                    ? 'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 shadow-lg shadow-green-500/50'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              >
                {isEligibleForRewards && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]" />
                )}
              </div>
            </div>
            <div
              className={`text-center font-medium text-xs md:text-sm p-2 rounded-lg break-words relative z-10 ${
                thresholdReached
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              {thresholdReached ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Eligible to withdraw
                </span>
              ) : (
                `${Math.max(0, MIN_INVITEES - inviteesReachedCount)} more invitee${Math.max(0, MIN_INVITEES - inviteesReachedCount) === 1 ? '' : 's'} need to reach ${MIN_SPENT_AE} AE`
              )}
            </div>
            {!thresholdReached && inviteesInProgressCount > 0 && (
              <div className="text-center text-xs text-white/60">
                {inviteesInProgressCount}
                {' '}
                invitee
                {inviteesInProgressCount === 1 ? '' : 's'}
                {' '}
                still accumulating
              </div>
            )}

            {!thresholdReached && inviteeProgress.length > 0 && (
              <div className="mt-2 space-y-2">
                {inviteeProgress.slice(0, 6).map((item) => (
                  <div key={item.address} className="bg-white/3 rounded-lg border border-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-mono text-white/80 truncate">
                        {item.address}
                      </div>
                      <div className="text-xs text-white/70 whitespace-nowrap">
                        {item.reached ? 'Reached' : `${item.spentAe.toString(2)} / ${MIN_SPENT_AE} AE`}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${item.reached ? 'bg-teal-400' : 'bg-purple-400'}`}
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {inviteeProgress.length > 6 && (
                  <div className="text-center text-xs text-white/50">
                    +
                    {inviteeProgress.length - 6}
                    {' '}
                    more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rewards Display */}
          <div className="flex flex-col gap-6">
            <div
              className={`flex flex-col gap-2 text-center p-5 sm:p-6 rounded-xl border relative overflow-hidden ${
                isEligibleForRewards
                  ? 'bg-gradient-to-br from-green-500/20 via-teal-500/20 to-blue-500/20 border-green-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {isEligibleForRewards && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-blue-500/10 animate-pulse" />
              )}
              <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wider break-words relative z-10">
                Available Rewards
              </span>
              <div className="relative z-10">
                <LivePriceFormatter
                  aePrice={Decimal.from(accumulatedRewardsAe.toString())}
                  watchPrice={false}
                  className={`gap-2 items-center text-3xl md:text-4xl lg:text-5xl font-extrabold break-words ${
                    isEligibleForRewards
                      ? 'bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                      : 'bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(255,107,107,0.3)]'
                  }`}
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Collect Button */}
            <button
              type="button"
              onClick={onCollectReward}
              disabled={collectingReward || !isEligibleForRewards}
              className={`w-full p-5 md:p-6 lg:p-7 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-14 rounded-xl transition-all duration-300 relative overflow-hidden ${
                isEligibleForRewards
                  ? "bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white shadow-lg shadow-green-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/50 before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full"
                  : 'opacity-50 cursor-not-allowed bg-gray-600 transform-none'
              }`}
            >
              {collectButtonContent}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectRewardsCard;
