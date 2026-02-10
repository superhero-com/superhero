import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAeSdk } from '../../../../hooks/useAeSdk';
import AeButton from '../../../../components/AeButton';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../lib/utils';
import { AddressChip } from '../../../../components/AddressChip';
import { Decimal } from '../../../../libs/decimal';
import LivePriceFormatter from '../../../shared/components/LivePriceFormatter';
import { useInvitations } from '../../hooks/useInvitations';

const InvitationList = () => {
  const { t } = useTranslation('trending');
  const { activeAccount } = useAeSdk();
  const {
    invitations,
    loading,
    revokeInvitation,
    prepareInviteLink,
  } = useInvitations();

  const [revokingInvitationInvitee, setRevokingInvitationInvitee] = useState<
    string | null
  >(null);
  const [copiedInvitee, setCopiedInvitee] = useState<string | null>(null);

  const handleCopyLink = async (invitee: string, secretKey: string) => {
    try {
      await navigator.clipboard.writeText(prepareInviteLink(secretKey));
      setCopiedInvitee(invitee);
      setTimeout(() => setCopiedInvitee(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleRevokeInvitation = async (invitation: any) => {
    setRevokingInvitationInvitee(invitation.invitee);
    try {
      await revokeInvitation(invitation);
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error);
      if (error.message?.includes('ALREADY_REDEEMED')) {
        console.warn('Invitation already claimed or revoked');
      }
    } finally {
      setRevokingInvitationInvitee(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'created':
        return 'default';
      case 'claimed':
        return 'secondary';
      case 'revoked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const renderInvitationDetails = (invitation: any) => {
    if (invitation.status === 'claimed') {
      return (
        <>
          <div className="text-[10px] text-green-400/80 font-medium mb-1">
            {invitation.claimedBy ? t('invitations.invitee') : t('invitations.claimed')}
          </div>
          {invitation.claimedBy ? (
            <div className="font-mono text-sm text-white truncate">
              <AddressChip
                address={invitation.claimedBy}
                linkToProfile
              />
            </div>
          ) : (
            <div className="text-xs text-white/50">
              {t('invitations.invitationWasClaimed')}
            </div>
          )}
          {invitation.claimedAt && (
            <div className="text-xs text-white/50 mt-1">
              {t('invitations.claimedOn')}
              {' '}
              {invitation.claimedAt}
            </div>
          )}
        </>
      );
    }

    if (invitation.status === 'revoked') {
      return (
        <>
          <div className="text-[10px] text-red-400/80 font-medium mb-1">{t('invitations.revoked')}</div>
          <div className="text-xs text-white/50">
            No one claimed this invite
          </div>
          {invitation.revokedAt && (
            <div className="text-xs text-white/50 mt-1">
              {t('invitations.revokedOn')}
              {' '}
              {invitation.revokedAt}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div className="text-[10px] text-yellow-400/80 font-medium mb-1">{t('invitations.awaitingClaim')}</div>
        <div className="text-xs text-white/50 mb-1">
          Share the link to invite someone
        </div>
        {invitation.secretKey && (
          <button
            type="button"
            onClick={() => handleCopyLink(invitation.invitee, invitation.secretKey!)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs',
              'bg-white/5 border border-white/10 backdrop-blur-sm',
              'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-white/10',
              'cursor-pointer relative overflow-hidden',
              copiedInvitee === invitation.invitee && 'bg-green-500/20 border-green-500/30',
            )}
            title={t('social:clickToCopyLink')}
          >
            <span className="text-yellow-400">🔗</span>
            <span className="font-mono text-[10px] text-white/80 truncate max-w-[140px]">
              {prepareInviteLink(invitation.secretKey).slice(0, 25)}
              ...
            </span>
            <span className={cn(
              'text-xs',
              copiedInvitee === invitation.invitee ? 'text-green-400' : 'opacity-60',
            )}
            >
              {copiedInvitee === invitation.invitee ? '✓' : '📋'}
            </span>
          </button>
        )}
        {invitation.date && (
          <div className="text-xs text-white/50 mt-1">
            Created on
            {' '}
            {invitation.date}
          </div>
        )}
      </>
    );
  };

  if (!activeAccount) return null;

  return (
    <div className="border border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">{t('invitations.yourInvitations')}</h3>
      </div>

      {loading && (
      <div className="p-4 text-center text-white/60">
        Loading invitations...
      </div>
      )}

      {!loading && invitations.length === 0 && (
      <div className="p-4 text-center text-white/60 text-sm">
        No invitations yet.
      </div>
      )}

      {!loading && invitations.length > 0 && (
      <div>
        {/* Desktop Table Header - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_140px] gap-4 px-4 py-3 text-xs font-medium text-white/60 border-b border-white/10">
          <div>#</div>
          <div>{t('invitations.details')}</div>
          <div>{t('invitations.amount')}</div>
          <div>{t('invitations.status')}</div>
          <div className="text-right">{t('invitations.actions')}</div>
        </div>

        {/* Invitation Rows */}
        {invitations.map((invitation, index) => (
          <div
            key={`${invitation.invitee}-${invitation.hash}`}
            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
          >
            {/* Desktop Table Row */}
            <div className="hidden md:grid grid-cols-[auto_1fr_120px_120px_140px] gap-4 px-4 py-3">
              {/* Index */}
              <div className="text-sm text-white/60 font-mono">
                {invitations.length - index}
              </div>

              {/* Details - show actual invitee for claimed, awaiting for others */}
              <div className="min-w-0">
                {renderInvitationDetails(invitation)}
              </div>

              {/* Amount */}
              <div
                className={cn(
                  'text-sm font-medium',
                  invitation.status !== 'created'
                    ? 'text-white/40'
                    : 'text-white',
                )}
              >
                <LivePriceFormatter
                  aePrice={Decimal.from(invitation.amount)}
                  watchPrice={false}
                  className={
                        invitation.status !== 'created'
                          ? 'text-white/40'
                          : 'text-white'
                      }
                />
              </div>

              {/* Status */}
              <div>
                <Badge
                  variant={getStatusBadgeVariant(invitation.status)}
                  className="text-xs font-bold uppercase tracking-wide"
                >
                  {invitation.status}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {invitation.status === 'created' && (
                <AeButton
                  onClick={() => handleRevokeInvitation(invitation)}
                  disabled={
                          revokingInvitationInvitee === invitation.invitee
                        }
                  loading={revokingInvitationInvitee === invitation.invitee}
                  variant="ghost"
                  size="small"
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {revokingInvitationInvitee === invitation.invitee
                    ? t('invitations.revoking')
                    : t('invitations.revoke')}
                </AeButton>
                )}
              </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden p-4 space-y-3">
              {/* Header Row: Index and Status */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 font-mono bg-white/5 px-2 py-1 rounded">
                  #
                  {invitations.length - index}
                </span>
                <Badge
                  variant={getStatusBadgeVariant(invitation.status)}
                  className="text-xs font-bold uppercase tracking-wide"
                >
                  {invitation.status}
                </Badge>
              </div>

              {/* Details and Amount Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 min-w-0">
                  {(() => {
                    if (invitation.status === 'claimed') {
                      let claimedLabel: string;
                      if (invitation.claimedBy) claimedLabel = t('invitations.invitee');
                      else claimedLabel = t('invitations.claimed');
                      return (
                        <>
                          <div className="text-xs text-green-400/80 font-medium">
                            {claimedLabel}
                          </div>
                          {invitation.claimedBy && (
                            <div className="font-mono text-sm text-white">
                              <AddressChip
                                address={invitation.claimedBy}
                                linkToProfile
                              />
                            </div>
                          )}
                          {!invitation.claimedBy && (
                            <div className="text-xs text-white/50">
                              Invitation was claimed
                            </div>
                          )}
                          {invitation.claimedAt && (
                            <div className="text-xs text-white/50">
                              {invitation.claimedAt}
                            </div>
                          )}
                        </>
                      );
                    }
                    if (invitation.status === 'revoked') {
                      return (
                        <>
                          <div className="text-xs text-red-400/80 font-medium">{t('invitations.revoked')}</div>
                          <div className="text-xs text-white/50">
                            Not claimed
                          </div>
                          {invitation.revokedAt && (
                            <div className="text-xs text-white/50">
                              {invitation.revokedAt}
                            </div>
                          )}
                        </>
                      );
                    }
                    const isCopied = copiedInvitee === invitation.invitee;
                    return (
                      <>
                        <div className="text-xs text-yellow-400/80 font-medium">{t('invitations.awaiting')}</div>
                        <div className="text-xs text-white/50 mb-1">
                          Share the link
                        </div>
                        {invitation.secretKey && (
                          <button
                            type="button"
                            onClick={() => {
                              handleCopyLink(invitation.invitee, invitation.secretKey!);
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]',
                              'bg-white/5 border border-white/10 backdrop-blur-sm',
                              'transition-all duration-300 hover:bg-white/10',
                              'cursor-pointer relative overflow-hidden',
                              isCopied && 'bg-green-500/20 border-green-500/30',
                            )}
                            title={t('social:clickToCopyLink')}
                          >
                            <span className="text-yellow-400 text-xs">🔗</span>
                            <span className="font-mono text-white/80 truncate max-w-[80px]">
                              {prepareInviteLink(invitation.secretKey).slice(0, 15)}
                              ...
                            </span>
                            <span className={cn(isCopied && 'text-green-400', !isCopied && 'opacity-60')}>
                              {isCopied && '✓'}
                              {!isCopied && '📋'}
                            </span>
                          </button>
                        )}
                        {invitation.date && (
                          <div className="text-xs text-white/50 mt-1">
                            Created on
                            {' '}
                            {invitation.date}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-white/60 font-medium">{t('invitations.amount')}</div>
                  <div
                    className={cn(
                      'text-sm font-medium',
                      invitation.status !== 'created'
                        ? 'text-white/40'
                        : 'text-white',
                    )}
                  >
                    <LivePriceFormatter
                      aePrice={Decimal.from(invitation.amount)}
                      watchPrice={false}
                      className={
                            invitation.status !== 'created'
                              ? 'text-white/40'
                              : 'text-white'
                          }
                    />
                  </div>
                </div>
              </div>

              {/* Actions - only Revoke button */}
              {invitation.status === 'created' && (
              <div className="flex gap-2 pt-2">
                <AeButton
                  onClick={() => handleRevokeInvitation(invitation)}
                  disabled={
                          revokingInvitationInvitee === invitation.invitee
                        }
                  loading={revokingInvitationInvitee === invitation.invitee}
                  variant="secondary"
                  size="small"
                  className="text-xs flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {revokingInvitationInvitee === invitation.invitee
                    ? t('invitations.revoking')
                    : t('invitations.revoke')}
                </AeButton>
              </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default InvitationList;
