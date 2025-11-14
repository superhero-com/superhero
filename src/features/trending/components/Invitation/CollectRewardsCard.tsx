import React, { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAeSdk } from "@/hooks/useAeSdk";
import { getAffiliationTreasury } from "@/libs/affiliation";
import { Decimal } from "@/libs/decimal";
import LivePriceFormatter from "@/features/shared/components/LivePriceFormatter";
import Spinner from "@/components/Spinner";

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
            To access participation rewards, contributors may invite others to explore the platform. If at least {MIN_INVITEES} of their invitees engage with the ecosystem (e.g., by minting or transacting with tokens), the contributor becomes eligible to unlock optional rewards.
          </p>
          <p className="text-xs opacity-60">
            Rewards can be claimed manually at any time for the current or previous calendar month. Unclaimed rewards beyond this window will be permanently removed to maintain system balance.
          </p>
        </div>

        {/* Progress and Actions - Right Side */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Progress Section */}
          <div className="flex flex-col gap-3 p-4 bg-white/3 rounded-xl border border-white/5">
            <div className="flex justify-between items-center font-semibold text-sm md:text-base flex-wrap gap-2">
              <span>Progress to rewards</span>
              <span className="text-teal-400 font-bold text-base md:text-lg text-shadow-[0_0_10px_rgba(78,205,196,0.5)] break-words">
                {numberOfUniqueInvitees}/{MIN_INVITEES} invitees
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-md overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="text-center font-medium text-slate-400 text-xs md:text-sm p-1 rounded-lg bg-white/2 break-words">
              {numberOfUniqueInvitees >= MIN_INVITEES
                ? "🎉 Eligible for rewards!"
                : `${MIN_INVITEES - numberOfUniqueInvitees} more invitees needed`}
            </div>
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
              onClick={onCollectReward}
              disabled={collectingReward || !isEligibleForRewards}
              className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${isEligibleForRewards
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/40"
                  : "opacity-50 cursor-not-allowed bg-gray-600 transform-none"
                }`}
            >
              {collectingReward ? (
                <div className="flex items-center justify-center gap-3">
                  <Spinner className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                  Withdrawing...
                </div>
              ) : !isEligibleForRewards ? (
                "Not eligible yet"
              ) : (
                "Collect rewards"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
