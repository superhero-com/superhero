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

  const progressPercentage = Math.min(
    (inviteesReachedCount / MIN_INVITEES) * 100,
    100,
  );

  const isEligibleForRewards = thresholdReached && accumulatedRewardsAe.gt(Decimal.ZERO);

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

  const onCollectReward = async () => {
    if (!activeAccount || !sdk) return;

    setCollectingReward(true);
    setErrorMessage(null);

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      await affiliationTreasury.withdraw();

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
        <div className="flex items-center justify-center gap-2">
          <Spinner className="w-4 h-4" />
          Withdrawing...
        </div>
      );
    }
    if (!thresholdReached) return 'Not eligible yet';
    if (accumulatedRewardsAe.lte(Decimal.ZERO)) return 'No rewards yet';
    return 'Collect rewards';
  }, [collectingReward, thresholdReached, accumulatedRewardsAe]);

  return (
    <div className="bg-[#0d1117]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
          </svg>
        </div>
      </div>

      <h3 className="m-0 text-xl md:text-2xl font-bold text-white mb-2">
        Collect your rewards
      </h3>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Description */}
        <div className="flex-1 space-y-4 text-sm text-white/50">
          <p className="m-0 leading-relaxed">
            Rewards accumulate as your direct invitees participate in token sales. You can withdraw once
            {' '}
            <span className="font-semibold text-white/80">
              {MIN_INVITEES}
              {' '}
              direct invitees
            </span>
            {' '}
            have each spent at least
            {' '}
            <span className="font-semibold text-white/80">
              {MIN_SPENT_AE}
              {' '}
              AE
            </span>
            {' '}
            (cumulative).
          </p>
          <p className="text-xs text-white/30 m-0">
            Note: eligibility and rewards depend on on-chain activity and are not guaranteed.
          </p>
        </div>

        {/* Progress and Actions */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Progress */}
          <div className="flex flex-col gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="flex justify-between items-center font-semibold text-sm flex-wrap gap-2">
              <span className="text-white/70">Progress to rewards</span>
              <span className="text-cyan-400 font-bold">
                {inviteesReachedCount}
                /
                {MIN_INVITEES}
                {' '}
                reached
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="font-medium text-white/40 text-xs">
              {thresholdReached
                ? 'Eligible to withdraw'
                : `${Math.max(0, MIN_INVITEES - inviteesReachedCount)} more invitees need to reach ${MIN_SPENT_AE} AE`}
            </div>
            {!thresholdReached && inviteesInProgressCount > 0 && (
              <div className="text-xs text-white/30">
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
                  <div key={item.address} className="bg-white/[0.03] rounded-lg border border-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-mono text-white/60 truncate">
                        {item.address}
                      </div>
                      <div className="text-xs text-white/40 whitespace-nowrap">
                        {item.reached ? 'Reached' : `${item.spentAe.toString(2)} / ${MIN_SPENT_AE} AE`}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.reached ? 'bg-emerald-400' : 'bg-cyan-500'}`}
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {inviteeProgress.length > 6 && (
                  <div className="text-xs text-white/30">
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
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 text-center p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
                Available Rewards
              </span>
              <LivePriceFormatter
                aePrice={Decimal.from(accumulatedRewardsAe.toString())}
                watchPrice={false}
                className="gap-2 items-center text-2xl md:text-3xl font-extrabold text-white"
              />
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <button
              type="button"
              onClick={onCollectReward}
              disabled={collectingReward || !isEligibleForRewards}
              className={`w-full p-3 md:p-4 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${isEligibleForRewards
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25'
                : 'opacity-50 cursor-not-allowed bg-white/5 text-white/30'
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
