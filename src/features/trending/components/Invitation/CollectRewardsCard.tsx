import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
    return 'Collect rewards';
  }, [collectingReward, thresholdReached, accumulatedRewardsAe]);

  return (
    <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0">
          💰
        </div>
        <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
          Collect your rewards
        </h3>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Description - Left Side */}
        <div className="flex-1 space-y-4 text-sm text-muted-foreground">
          <p>
            Rewards accumulate as your direct invitees participate in token sales. You can withdraw once
            {' '}
            <span className="font-semibold text-white/80">
              {MIN_INVITEES}
              {' '}
              direct invitees
            </span>
            {' '}
            have each
            spent at least
            <span className="font-semibold text-white/80">
              {MIN_SPENT_AE}
              {' '}
              AE
            </span>
            {' '}
            (cumulative).
          </p>
          <p className="text-xs opacity-60">
            Note: eligibility and rewards depend on on-chain activity and are not guaranteed.
          </p>
        </div>

        {/* Progress and Actions - Right Side */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Progress Section */}
          <div className="flex flex-col gap-3 p-4 bg-white/3 rounded-xl border border-white/5">
            <div className="flex justify-between items-center font-semibold text-sm md:text-base flex-wrap gap-2">
              <span>Progress to rewards</span>
              <span className="text-teal-400 font-bold text-base md:text-lg text-shadow-[0_0_10px_rgba(78,205,196,0.5)] break-words">
                {inviteesReachedCount}
                /
                {MIN_INVITEES}
                {' '}
                reached
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-md overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-center font-medium text-slate-400 text-xs md:text-sm p-1 rounded-lg bg-white/2 break-words">
              {thresholdReached
                ? '🎉 Eligible to withdraw'
                : `${Math.max(0, MIN_INVITEES - inviteesReachedCount)} more invitees need to reach ${MIN_SPENT_AE} AE`}
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
            <div className="flex flex-col gap-2 text-center p-4 bg-white/3 rounded-xl border border-white/5">
              <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wider break-words">
                Available Rewards
              </span>
              <LivePriceFormatter
                aePrice={Decimal.from(accumulatedRewardsAe.toString())}
                watchPrice={false}
                className="gap-2 items-center text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(255,107,107,0.3)] break-words"
              />
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
              className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${isEligibleForRewards
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/40'
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
