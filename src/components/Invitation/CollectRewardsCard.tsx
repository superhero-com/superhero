import React, { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import { useAeSdk } from "../../hooks/useAeSdk";
import { getAffiliationTreasury } from "../../libs/affiliation";

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
  const [accumulatedRewardsAe, setAccumulatedRewardsAe] = useState<number>(0);
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
    numberOfUniqueInvitees >= MIN_INVITEES && accumulatedRewardsAe > 0;

  // Calculate accumulated rewards
  const calculateAccumulatedRewards = useCallback(async () => {
    if (!activeAccount || !sdk) return;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const rewards = await affiliationTreasury.getAccumulatedRewards(
        activeAccount
      );
      const rewardsAe = Number(rewards) / 1e18;
      setAccumulatedRewardsAe(rewardsAe);
    } catch (error) {
      console.error("Failed to calculate accumulated rewards:", error);
      setAccumulatedRewardsAe(0);
    }
  }, [activeAccount, sdk]);

  // Calculate unique invitees
  const calculateUniqueInvitees = useCallback(async () => {
    if (!activeAccount || !sdk) return;

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      const inviteeData = await affiliationTreasury.getUniqueInvitee(
        activeAccount
      );

      if ("ThresholdReached" in inviteeData) {
        setNumberOfUniqueInvitees(MIN_INVITEES);
      } else if (inviteeData.WaitingForInvitations?.[0]) {
        setNumberOfUniqueInvitees(inviteeData.WaitingForInvitations[0].length);
      } else {
        setNumberOfUniqueInvitees(0);
      }
    } catch (error: any) {
      setNumberOfUniqueInvitees(0);
      // Only log if it's not the expected "Key does not exist" error
      if (!error?.message?.includes("Maps: Key does not exist")) {
        console.error("Failed to calculate unique invitees:", error);
      }
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
          Your Rewards
        </h3>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-8">
        {/* Description */}
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Collect rewards when at least {MIN_INVITEES} of your invitees have
            spent a minimum of {MIN_SPENT_AE} AE on token purchases.
          </p>
          <p className="text-xs opacity-60">
            Rewards are calculated based on the transaction activity of your
            invited network and can be withdrawn once eligibility requirements
            are met.
          </p>
        </div>

        {/* Progress Section */}
        <div className="flex flex-col gap-5 p-5 md:p-6 lg:p-8 bg-white/3 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center font-semibold text-base md:text-lg lg:text-xl flex-wrap gap-2">
            <span>Progress to rewards</span>
            <span className="text-teal-400 font-bold text-lg md:text-xl lg:text-2xl text-shadow-[0_0_10px_rgba(78,205,196,0.5)] break-words">
              {numberOfUniqueInvitees}/{MIN_INVITEES} invitees
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-md overflow-hidden relative before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:animate-[shimmer_2s_infinite]">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-md transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)] relative z-10"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="text-center font-semibold text-slate-400 text-sm md:text-base p-2 rounded-lg bg-white/2 break-words">
            {numberOfUniqueInvitees >= MIN_INVITEES
              ? "🎉 Eligible for rewards!"
              : `${MIN_INVITEES - numberOfUniqueInvitees} more invitees needed`}
          </div>
        </div>

        {/* Rewards Display */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 text-center p-5 md:p-6 lg:p-8 bg-white/3 rounded-2xl border border-white/5">
            <span className="text-sm md:text-base text-slate-400 font-medium uppercase tracking-wider break-words">
              Available Rewards
            </span>
            <span className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-shadow-[0_0_20px_rgba(255,107,107,0.3)] break-words">
              {accumulatedRewardsAe.toFixed(4)} AE
            </span>
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
            className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold uppercase tracking-wider break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${
              isEligibleForRewards
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/40"
                : "opacity-50 cursor-not-allowed bg-gray-600 transform-none"
            }`}
          >
            {collectingReward ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
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
  );
}
