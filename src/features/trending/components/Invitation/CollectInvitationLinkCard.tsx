import { AeSdk, CompilerHttp, MemoryAccount } from '@aeternity/aepp-sdk';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { AeButton } from '@/components/ui/ae-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useCommunityFactory } from '@/hooks/useCommunityFactory';
import { useInvitation } from '@/hooks/useInvitation';
import { cn } from '@/lib/utils';
import { Decimal } from '@/libs/decimal';
import { ensureSdkInitializeContract } from '@/libs/initializeContractTyped';
import { APP_NAME } from '@/config';
import { normalizeSecretKey } from '@/utils/secretKey';

interface CollectInvitationLinkCardProps {
  className?: string;
}

const CollectInvitationLinkCard = ({
  className,
}: CollectInvitationLinkCardProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    sdk, staticAeSdk, activeAccount, activeNetwork, nodes,
  } = useAeSdk();
  const { getAffiliationTreasury } = useCommunityFactory();
  const { invitationCode, resetInviteCode } = useInvitation();

  // State management
  const [invitationAmount, setInvitationAmount] = useState<Decimal>(
    Decimal.ZERO,
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
  const didMountRef = useRef(false);

  // Computed values
  const isRevoking = useMemo(
    () => invitationSender && invitationSender === activeAccount,
    [invitationSender, activeAccount],
  );

  const appName = APP_NAME;

  /**
   * Retrieves the invitation reward amount for a given invitation code.
   * This function sets the loading state, initializes the AeSdk,
   * retrieves the affiliation contract, and updates invitation details.
   */
  const getInvitationRewardAmount = useCallback(async () => {
    if (!invitationCode) return;

    setErrorMessage(undefined);
    setLoadingInvitation(true);

    try {
      const normalizedInvitationKey = normalizeSecretKey(invitationCode);
      const account = new MemoryAccount(normalizedInvitationKey);

      const tempSdk = new AeSdk({
        onCompiler: new CompilerHttp('https://v7.compiler.aepps.com'),
        nodes,
        ttl: 10000,
        accounts: [account],
      });
      tempSdk.selectNode(activeNetwork.name);

      const affiliationTreasury = await getAffiliationTreasury(tempSdk);
      const invitation = await affiliationTreasury.getInvitationCode(
        account.address,
      );

      if (invitation) {
        setInvitationSender(invitation[0]);
        setInvitationAmount(
          Decimal.fromBigNumberString(invitation[1] as unknown as string),
        );
        setInvitationClaimed(invitation[2]);

        if (invitation[2]) {
          setErrorMessage(t('trending.invitations.collect.alreadyClaimed'));
        }
      }
    } catch (error: any) {
      console.error('Failed to get invitation reward amount:', error);
      if (error?.message?.includes('Trying to call undefined function')) {
        setErrorMessage(t('trending.invitations.collect.switchNetwork'));
      } else {
        setErrorMessage(error?.message || t('trending.invitations.collect.failedToLoad'));
      }
    } finally {
      setLoadingInvitation(false);
    }
  }, [invitationCode, getAffiliationTreasury, activeNetwork.name, nodes, t]);

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
      const normalizedInvitationKey = normalizeSecretKey(invitationCode);
      const account = new MemoryAccount(normalizedInvitationKey);

      if (isRevoking) {
        // Revoke invitation
        if (!sdk) throw new Error('SDK not available');

        const affiliationTreasury = await getAffiliationTreasury(sdk);
        await affiliationTreasury.revokeInvitationCode(account.address);
        setSuccessMessage(t('trending.invitations.collect.revokedSuccess'));
      } else {
        // Claim invitation
        if (!staticAeSdk) throw new Error('SDK not available');

        const claimSdk = ensureSdkInitializeContract(staticAeSdk as any) as typeof staticAeSdk;
        await claimSdk.addAccount(account, { select: true });

        const affiliationTreasury = await getAffiliationTreasury(claimSdk);
        await affiliationTreasury.contract.redeem_invitation_code(
          activeAccount,
          {
            onAccount: account,
          },
        );
        setSuccessMessage(t('trending.invitations.collect.claimedSuccess'));
      }

      setInvitationClaimed(true);
    } catch (error: any) {
      console.error('Failed to claim/revoke reward:', error);

      if (error?.message?.includes('INVITEE_ALREADY_REGISTERED')) {
        setErrorMessage(
          t('trending.invitations.collect.accountAlreadyClaimed'),
        );
      } else if (error?.message?.includes('Secret key')) {
        setErrorMessage(t('trending.invitations.collect.unsupportedSecretKey'));
      } else if (error?.message?.includes('ALREADY_REDEEMED')) {
        setErrorMessage(t('trending.invitations.collect.alreadyClaimed'));
      } else {
        setErrorMessage(
          isRevoking
            ? t('trending.invitations.collect.failedToRevoke', { message: error?.message || t('trending.invitations.collect.unknownError') })
            : t('trending.invitations.collect.failedToClaim', { message: error?.message || t('trending.invitations.collect.unknownError') }),
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
    t,
  ]);

  // Load invitation data when invitation code changes
  useEffect(() => {
    if (invitationCode) {
      getInvitationRewardAmount();
    }
  }, [invitationCode, getInvitationRewardAmount]);

  // Ensure card is expanded on first render (especially from invite deep link)
  // Keep expanded while an invitation code is present; collapse only on route
  // changes when there is no invite code and no success message.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      setIsCollapsed(false);
      return () => {};
    }

    if (successMessage) {
      setIsCollapsed(false);
      const timer = setTimeout(() => {
        resetInviteCode();
        setSuccessMessage(undefined);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // If we still have an invitation code, keep expanded
    if (invitationCode) {
      setIsCollapsed(false);
      return () => {};
    }

    // Collapse when navigating to different routes after initial mount
    setIsCollapsed(true);
    return () => {};
  }, [location.pathname, successMessage, resetInviteCode, invitationCode]);

  // Toggle app-level layout class so routes below don't add extra spacing
  useEffect(() => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      if (invitationCode && !isCollapsed) {
        appContainer.classList.add('has-invite-card');
      } else {
        appContainer.classList.remove('has-invite-card');
      }
    }
    return () => {
      const appEl = document.querySelector('.app-container');
      appEl?.classList.remove('has-invite-card');
    };
  }, [invitationCode, isCollapsed]);

  // Don't render if no invitation code
  if (!invitationCode) {
    return null;
  }

  return (
    <div className={cn('relative z-10 mb-2', className)}>
      {/* Collapsed state */}
      {isCollapsed ? (
        <Card
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setIsCollapsed(false)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              {t('trending.invitations.collect.title', { appName })}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{t('trending.invitations.collect.viewInvitation')}</span>
              <button type="button" className="p-4 rounded-full hover:bg-accent transition-colors">
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
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="absolute top-4 right-4 p-4 rounded-full hover:bg-accent transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left column - Text content */}
              <div className="pr-0 md:pr-10">
                <h2 className="text-2xl md:text-3xl font-bold text-primary pb-4">
                  {t('trending.invitations.collect.title', { appName })}
                </h2>
                <p className="text-sm text-foreground mb-4">
                  {t('trending.invitations.collect.description1')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('trending.invitations.collect.description2')}
                </p>
              </div>

              {/* Right column - Action area */}
              <div className="text-center">
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-semibold mb-2">
                    {isRevoking
                      ? t('trending.invitations.collect.canRevokeRewardOf')
                      : t('trending.invitations.collect.canClaimRewardOf')}
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
                      <span>
                        {t('trending.invitations.collect.hasInvitedYou', { appName })}
                      </span>
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
                          {isRevoking ? t('trending.invitations.collect.revokeInvitation') : t('trending.invitations.collect.claimReward')}
                        </AeButton>
                      ) : (
                        <ConnectWalletButton
                          label={t('common.buttons.connectWalletDex')}
                          variant="default"
                          className="text-sm"
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
                          {t('trending.invitations.collect.dismiss')}
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
};

export default CollectInvitationLinkCard;
