import React, { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { useAeSdk } from "@/hooks/useAeSdk";
import { getAffiliationTreasury } from "@/libs/affiliation";
import { Decimal } from "@/libs/decimal";
import LivePriceFormatter from "@/features/shared/components/LivePriceFormatter";

const MIN_INVITEES = 4;
const MIN_SPENT_AE = 10;

interface CollectRewardsCardProps {
  className?: string;
}

export default function CollectRewardsCard({
  className,
}: CollectRewardsCardProps) {
  const { sdk, activeAccount } = useAeSdk();

  // State
  const [accumulatedRewardsAe, setAccumulatedRewardsAe] = useState<Decimal>(
    Decimal.ZERO
  );
  const [numberOfUniqueInvitees, setNumberOfUniqueInvitees] =
    useState<number>(0);
  const [collectingReward, setCollectingReward] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate progress percentage
  const progressPercentage = Math.min(
    (numberOfUniqueInvitees / MIN_INVITEES) * 100,
    100
  );

  // Check if eligible for rewards
  const isEligibleForRewards =
    numberOfUniqueInvitees >= MIN_INVITEES &&
    accumulatedRewardsAe.gt(Decimal.ZERO);

  // Calculate accumulated rewards
  const calculateAccumulatedRewards = useCallback(async () => {
    if (!activeAccount || !sdk) return;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const rewards = await affiliationTreasury.getAccumulatedRewards(
        activeAccount
      );
      const rewardsAe = Number(rewards) / 1e18;
      setAccumulatedRewardsAe(Decimal.from(rewardsAe));
    } catch (error) {
      console.error("Failed to calculate accumulated rewards:", error);
      setAccumulatedRewardsAe(Decimal.ZERO);
    }
  }, [activeAccount, sdk]);

  // Calculate unique invitees
  const calculateUniqueInvitees = useCallback(async () => {
    if (!activeAccount || !sdk) return;
    let _numberOfUniqueInvitees = 0;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const inviteeData = await affiliationTreasury.getUniqueInvitee(
        activeAccount
      );

      _numberOfUniqueInvitees =
        'ThresholdReached' in inviteeData
          ? MIN_INVITEES
          : inviteeData.WaitingForInvitations[0].length || inviteeData.WaitingForInvitations[1].size;
    } catch (error: any) {
      //
    }
    setNumberOfUniqueInvitees(_numberOfUniqueInvitees);
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
      console.error("Failed to collect rewards:", error);

      if (error?.message?.includes("MINIMUM_OF_4_ACCOUNTS_SHALL_BUY")) {
        setErrorMessage(
          `You need to have at least ${MIN_INVITEES} accounts that have bought tokens to be able to collect rewards.`
        );
      } else {
        setErrorMessage("An error occurred while collecting rewards.");
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

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)] hover:-translate-y-1">
      {/* Animated background particles */}
      {isEligibleForRewards && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-pink-400/30 rounded-full animate-ping"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.3}s`,
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
            "💰"
          )}
        </div>
        <div className="flex-1">
          <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
            Collect Your Rewards
          </h3>
          <p className="text-sm md:text-base text-slate-400 mt-2 m-0">
            {isEligibleForRewards 
              ? "🎉 You're eligible! Withdraw your rewards anytime."
              : "Invite friends and earn rewards when they buy tokens"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
        {/* Description - Left Side */}
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-gradient-to-r from-green-500/10 via-teal-500/10 to-blue-500/10 rounded-xl border border-white/10">
            <p className="text-sm md:text-base text-white m-0 font-medium">
              Once <span className="text-green-400 font-bold">4+ invitees</span> have purchased tokens, 
              you become eligible to collect rewards. Rewards accumulate automatically from all your invitees' purchases.
            </p>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="m-0">Rewards accumulate in real-time</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <p className="m-0">Withdraw anytime after eligibility</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">✓</span>
              <p className="m-0">No limits on earning potential</p>
            </div>
          </div>
        </div>

        {/* Progress and Actions - Right Side */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Progress Section */}
          <div className="flex flex-col gap-3 p-5 sm:p-6 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden">
            {/* Celebration effect when eligible */}
            {isEligibleForRewards && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-teal-500/20 to-blue-500/20 animate-pulse" />
            )}
            <div className="flex justify-between items-center font-semibold text-sm md:text-base flex-wrap gap-2 relative z-10">
              <span className="text-white">Progress to Rewards</span>
              <span className={`font-bold text-base md:text-lg break-words ${
                isEligibleForRewards 
                  ? "text-green-400 text-shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                  : "text-teal-400 text-shadow-[0_0_10px_rgba(78,205,196,0.5)]"
              }`}>
                {numberOfUniqueInvitees}/{MIN_INVITEES} invitees
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
              <div
                className={`h-full rounded-full transition-all duration-[1000ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10 ${
                  isEligibleForRewards
                    ? "bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 shadow-lg shadow-green-500/50"
                    : "bg-gradient-to-r from-pink-500 to-purple-500"
                }`}
                style={{ width: `${progressPercentage}%` }}
              >
                {isEligibleForRewards && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]" />
                )}
              </div>
            </div>
            <div className={`text-center font-medium text-xs md:text-sm p-2 rounded-lg break-words relative z-10 ${
              isEligibleForRewards
                ? "bg-green-500/10 text-green-300 border border-white/10"
                : "bg-white/5 text-slate-400"
            }`}>
              {numberOfUniqueInvitees >= MIN_INVITEES ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Eligible for rewards!
                </span>
              ) : (
                `${MIN_INVITEES - numberOfUniqueInvitees} more invitee${MIN_INVITEES - numberOfUniqueInvitees === 1 ? '' : 's'} needed`
              )}
            </div>
          </div>

          {/* Rewards Display */}
          <div className="flex flex-col gap-6">
            <div className={`flex flex-col gap-2 text-center p-5 sm:p-6 rounded-xl border relative overflow-hidden ${
              isEligibleForRewards
                ? "bg-gradient-to-br from-green-500/10 via-teal-500/10 to-blue-500/10 border-white/15"
                : "bg-white/5 border-white/10"
            }`}>
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
                      ? "bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                      : "bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(255,107,107,0.3)]"
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
              onClick={onCollectReward}
              disabled={collectingReward || !isEligibleForRewards}
              className={`w-full p-5 md:p-6 lg:p-7 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-14 rounded-xl transition-all duration-300 relative overflow-hidden ${
                isEligibleForRewards
                  ? "bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white shadow-lg shadow-green-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/50 before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full"
                  : "opacity-50 cursor-not-allowed bg-gray-600 transform-none"
              }`}
            >
              {collectingReward ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                  Withdrawing...
                </div>
              ) : !isEligibleForRewards ? (
                "Not eligible yet"
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Collect Rewards
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
