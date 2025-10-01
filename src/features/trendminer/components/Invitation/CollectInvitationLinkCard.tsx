import { AeSdk, CompilerHttp, MemoryAccount } from "@aeternity/aepp-sdk";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { AeButton } from "@/components/ui/ae-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import LivePriceFormatter from "@/features/shared/components/LivePriceFormatter";
import { useAeSdk } from "@/hooks/useAeSdk";
import { useCommunityFactory } from "@/hooks/useCommunityFactory";
import { useInvitation } from "@/hooks/useInvitation";
import { cn } from "@/lib/utils";
import { Decimal } from "@/libs/decimal";
import { SETTINGS } from "@/utils/constants";

interface CollectInvitationLinkCardProps {
  className?: string;
}

export default function CollectInvitationLinkCard({
  className,
}: CollectInvitationLinkCardProps) {
  const location = useLocation();
  const { sdk, staticAeSdk, activeAccount, activeNetwork, nodes } = useAeSdk();
  const { getAffiliationTreasury } = useCommunityFactory();
  const { invitationCode, resetInviteCode } = useInvitation();

  // State management
  const [invitationAmount, setInvitationAmount] = useState<Decimal>(
    Decimal.ZERO
  );
  const [invitationSender, setInvitationSender] = useState<
    string | undefined
  >();
  const [invitationClaimed, setInvitationClaimed] = useState(false);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  // Computed values
  const isRevoking = useMemo(
    () => invitationSender && invitationSender === activeAccount,
    [invitationSender, activeAccount]
  );

  const appName = SETTINGS.app.name;

  /**
   * Retrieves the invitation reward amount for a given invitation code.
   * This function sets the loading state, initializes the AeSdk, retrieves the affiliation contract,
   * and updates the invitation details if the invitation code exists.
   */
  const getInvitationRewardAmount = useCallback(async () => {
    if (!invitationCode) return;

    setErrorMessage(undefined);
    setLoadingInvitation(true);

    try {
      const account = new MemoryAccount(invitationCode);

      const sdk = new AeSdk({
        onCompiler: new CompilerHttp("https://v7.compiler.aepps.com"),
        nodes,
        ttl: 10000,
        accounts: [account],
      });
      sdk.selectNode(activeNetwork.name);

      const affiliationTreasury = await getAffiliationTreasury(sdk);
      const invitation = await affiliationTreasury.getInvitationCode(
        account.address
      );

      if (invitation) {
        setInvitationSender(invitation[0]);
        setInvitationAmount(
          Decimal.fromBigNumberString(invitation[1] as unknown as string)
        );
        setInvitationClaimed(invitation[2]);

        if (invitation[2]) {
          setErrorMessage("This invitation has already been claimed.");
        }
      }
    } catch (error: any) {
      console.error("Failed to get invitation reward amount:", error);
      if (error?.message?.includes("Trying to call undefined function")) {
        setErrorMessage("Please switch to the correct network.");
      } else {
        setErrorMessage(error?.message || "Failed to load invitation details.");
      }
    } finally {
      setLoadingInvitation(false);
    }
  }, [invitationCode, getAffiliationTreasury]);

  /**
   * Claims or revokes the invitation reward
   */
  const claimOrRevokeReward = useCallback(async () => {
    if (!invitationCode || !activeAccount) {
      return;
    }

    setClaimingReward(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    try {
      const account = new MemoryAccount(invitationCode);

      if (isRevoking) {
        // Revoke invitation
        if (!sdk) throw new Error("SDK not available");

        const affiliationTreasury = await getAffiliationTreasury(sdk);
        await affiliationTreasury.revokeInvitationCode(account.address);
        setSuccessMessage("Invitation reward has been revoked successfully.");
      } else {
        // Claim invitation
        staticAeSdk.addAccount(account, { select: true });
        const affiliationTreasury = await getAffiliationTreasury(staticAeSdk);
        await affiliationTreasury.redeemInvitationCode(
          invitationCode,
          activeAccount
        );
        setSuccessMessage("Invitation reward has been claimed successfully!");
      }

      setInvitationClaimed(true);
    } catch (error: any) {
      console.error("Failed to claim/revoke reward:", error);

      if (error?.message?.includes("INVITEE_ALREADY_REGISTERED")) {
        setErrorMessage(
          "This account has already claimed an invitation reward."
        );
      } else if (error?.message?.includes("ALREADY_REDEEMED")) {
        setErrorMessage("This invitation has already been claimed.");
      } else {
        setErrorMessage(
          `Failed to ${isRevoking ? "revoke" : "claim"} reward. ${
            error?.message || "Unknown error"
          }`
        );
      }
    } finally {
      setClaimingReward(false);
    }
  }, [
    invitationCode,
    activeAccount,
    isRevoking,
    sdk,
    staticAeSdk,
    getAffiliationTreasury,
  ]);

  // Load invitation data when invitation code changes
  useEffect(() => {
    if (invitationCode) {
      getInvitationRewardAmount();
    }
  }, [invitationCode, getInvitationRewardAmount]);

  // Handle route changes - collapse card when navigating if there's a success message
  useEffect(() => {
    if (successMessage) {
      setIsCollapsed(false);
      // Auto-dismiss after successful claim/revoke
      const timer = setTimeout(() => {
        resetInviteCode();
        setSuccessMessage(undefined);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Collapse when navigating to different routes
      setIsCollapsed(true);
    }
  }, [location.pathname, successMessage, resetInviteCode]);

  // Don't render if no invitation code
  if (!invitationCode) {
    return null;
  }

  return (
    <div className={cn("relative z-10 mb-4", className)}>
      {/* Collapsed state */}
      {isCollapsed ? (
        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setIsCollapsed(false)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Collect your {appName} invitation reward
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">View invitation</span>
              <button className="p-4 rounded-full hover:bg-accent transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Expanded state */
        <Card>
          <CardContent className="p-6 relative">
            {/* Collapse button */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute top-4 right-4 p-4 rounded-full hover:bg-accent transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left column - Text content */}
              <div className="pr-0 md:pr-10">
                <h2 className="text-2xl md:text-3xl font-bold text-primary pb-4">
                  Collect your {appName} invitation reward
                </h2>
                <p className="text-sm text-foreground mb-4">
                  Easily create and manage Token Sales with a bonding curve
                  ensuring fair pricing. Engage in fair token launches,
                  participate in community governance through integrated DAOs,
                  and maximize rewards with a robust referral system.
                </p>
                <p className="text-sm text-muted-foreground">
                  Grow vibrant token-gated communities for businesses, projects,
                  DAOs, or even meme coins. Step into the future of
                  decentralized token management!
                </p>
              </div>

              {/* Right column - Action area */}
              <div className="text-center">
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {isRevoking
                      ? "You can revoke the invite reward of:"
                      : "You can claim the invite reward of:"}
                  </h3>

                  <div className="mb-4">
                    <LivePriceFormatter
                      aePrice={invitationAmount}
                      watchPrice={false}
                      priceLoading={loadingInvitation}
                      className="text-2xl text-primary font-bold"
                      row
                    />
                  </div>

                  {/* Sender info */}
                  {invitationSender && !isRevoking && (
                    <div className="mb-4 flex items-center gap-2 text-sm">
                      <AddressAvatarWithChainName address={invitationSender} />
                      <span>has invited you to join {appName}</span>
                    </div>
                  )}

                  {/* Error/Success messages */}
                  {errorMessage && (
                    <Alert variant="destructive" className="mb-4 max-w-md">
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {successMessage && (
                    <Alert variant="success" className="mb-4 max-w-md">
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action buttons */}
                  {!loadingInvitation && (
                    <div className="flex items-center gap-4">
                      {activeAccount && !invitationClaimed ? (
                        <AeButton
                          size="lg"
                          loading={claimingReward}
                          disabled={!!errorMessage}
                          onClick={claimOrRevokeReward}
                        >
                          {isRevoking ? "Revoke Invitation" : "Claim Reward"}
                        </AeButton>
                      ) : (
                        <ConnectWalletButton
                          label="CONNECT WALLET"
                          variant="default"
                        />
                      )}

                      {activeAccount && (
                        <AeButton
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            resetInviteCode();
                            setSuccessMessage(undefined);
                          }}
                        >
                          Dismiss
                        </AeButton>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
