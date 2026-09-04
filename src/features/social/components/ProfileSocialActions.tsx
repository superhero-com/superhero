import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ban, Check, ShieldOff, UserPlus,
} from 'lucide-react';
import AeButton from '../../../components/AeButton';
import Spinner from '../../../components/Spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '../../../components/ui/dialog';
import { useSocialGraph } from '../../../hooks/useSocialGraph';

/**
 * Follow / unfollow and block / unblock for the profile being viewed. Renders
 * nothing on your own profile or when there is no connected account. Button
 * state comes from the uncached relationship route; a block is confirmed first
 * because the contract severs follows in both directions and never restores them.
 */
const ProfileSocialActions = ({ targetAddress }: { targetAddress: string }) => {
  const { t } = useTranslation('common');
  const {
    isSelf, viewer, isReady, isFollowing, hasBlocked,
    configLoading, pendingAction, error, clearError,
    follow, unfollow, block, unblock,
  } = useSocialGraph(targetAddress);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  if (isSelf || !viewer) return null;
  // Reserve space while the config (caps + contract address) loads.
  if (configLoading) return <div className="h-8" aria-hidden />;
  // No contract configured — degrade to nothing rather than a broken control.
  if (!isReady && !hasBlocked) return null;

  const busy = pendingAction !== null;

  const confirmBlock = async () => {
    await block();
    setConfirmBlockOpen(false);
  };

  return (
    <div className="flex flex-col items-stretch gap-1.5 md:items-end">
      <div className="flex flex-row flex-wrap items-center gap-2 md:justify-end">
        {hasBlocked ? (
          <>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-solid border-white/15 px-3 text-[12px] font-semibold text-white/60">
              <Ban className="h-3.5 w-3.5" />
              {t('socialGraph.blocked')}
            </span>
            <AeButton
              variant="ghost"
              size="sm"
              loading={pendingAction === 'unblock'}
              disabled={busy}
              onClick={unblock}
              data-testid="social-unblock-button"
              className="!border !border-solid !border-white/20 hover:!border-white/40 hover:bg-white/10 transition-all inline-flex items-center gap-1.5"
            >
              <ShieldOff className="h-4 w-4" />
              {t('socialGraph.unblock')}
            </AeButton>
          </>
        ) : (
          <>
            {isFollowing ? (
              <AeButton
                variant="secondary"
                size="sm"
                loading={pendingAction === 'unfollow'}
                disabled={busy}
                onClick={unfollow}
                data-testid="social-following-button"
                title={t('socialGraph.unfollow')}
                className="group inline-flex items-center gap-1.5 min-w-[104px] justify-center"
              >
                {pendingAction !== 'unfollow' && <Check className="h-4 w-4" />}
                <span className="group-hover:hidden">{t('socialGraph.following')}</span>
                <span className="hidden group-hover:inline">{t('socialGraph.unfollow')}</span>
              </AeButton>
            ) : (
              <AeButton
                variant="primary"
                size="sm"
                loading={pendingAction === 'follow'}
                disabled={busy}
                onClick={follow}
                data-testid="social-follow-button"
                className="inline-flex items-center gap-1.5 min-w-[104px] justify-center"
              >
                {pendingAction !== 'follow' && <UserPlus className="h-4 w-4" />}
                {t('socialGraph.follow')}
              </AeButton>
            )}
            <AeButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmBlockOpen(true)}
              data-testid="social-block-button"
              title={t('socialGraph.block')}
              className="!border !border-solid !border-white/20 hover:!border-red-400/50 hover:bg-red-500/10 transition-all inline-flex items-center gap-1.5"
            >
              <Ban className="h-4 w-4" />
              {t('socialGraph.block')}
            </AeButton>
          </>
        )}
      </div>

      {error && (
        <div
          data-testid="social-error"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-solid border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-200 md:justify-end"
        >
          <span>{error.message}</span>
          {error.offerUnblock && (
            <button
              type="button"
              onClick={() => { clearError(); unblock(); }}
              className="font-semibold text-red-100 underline underline-offset-2 hover:text-white"
            >
              {t('socialGraph.unblock')}
            </button>
          )}
        </div>
      )}

      <Dialog open={confirmBlockOpen} onOpenChange={(open) => !busy && setConfirmBlockOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('socialGraph.blockDialog.title')}</DialogTitle>
            <DialogDescription>{t('socialGraph.blockDialog.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <AeButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmBlockOpen(false)}
              className="!border !border-solid !border-white/20"
            >
              {t('socialGraph.blockDialog.cancel')}
            </AeButton>
            <AeButton
              variant="error"
              size="sm"
              loading={pendingAction === 'block'}
              disabled={busy}
              onClick={confirmBlock}
              data-testid="social-block-confirm"
              className="inline-flex items-center gap-1.5"
            >
              {pendingAction === 'block' && <Spinner className="h-4 w-4" />}
              {t('socialGraph.blockDialog.confirm')}
            </AeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSocialActions;
