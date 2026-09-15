import { useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban, Check, Loader2, ShieldOff, UserMinus, UserPlus,
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
const ProfileSocialActions = ({
  targetAddress,
  errorSlotRef,
}: {
  targetAddress: string;
  errorSlotRef?: RefObject<HTMLElement | null>;
}) => {
  const { t } = useTranslation('common');
  const {
    isSelf, viewer, isReady, isFollowing, hasBlocked,
    configLoading, relationshipLoading, pendingAction, error, clearError,
    follow, unfollow, block, unblock,
  } = useSocialGraph(targetAddress);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  // On-chain writes must never fire against an unresolved AENS name; the target
  // is only signable once it resolves to a raw ak_ address.
  if (!targetAddress?.startsWith('ak_')) return null;
  if (isSelf || !viewer) return null;
  // Reserve space while the config (caps + contract address) and relationship load.
  if (configLoading || relationshipLoading) return <div className="h-11 md:h-9" aria-hidden />;
  // No contract configured — degrade to nothing rather than a broken control.
  if (!isReady && !hasBlocked) return null;

  const busy = pendingAction !== null;

  const confirmBlock = async () => {
    await block();
    setConfirmBlockOpen(false);
  };

  const errorBanner = error ? (
    <div
      data-testid="social-error"
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-solid border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-200"
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
  ) : null;

  return (
    <>
      <div className="flex flex-1 flex-row items-center gap-2 md:flex-none">
        {hasBlocked ? (
          <>
            <span aria-hidden className="h-5 w-px shrink-0 bg-[#ffffff1f]" />
            <span className="ml-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/55">
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
              className="!rounded-full !h-11 md:!h-9 flex-1 md:flex-none px-4 justify-center inline-flex items-center gap-1.5 text-[13px] font-semibold !border !border-solid !border-white/20 hover:!border-white/40 hover:!bg-white/10 transition-colors"
            >
              {pendingAction !== 'unblock' && <ShieldOff className="h-4 w-4" />}
              {t('socialGraph.unblock')}
            </AeButton>
          </>
        ) : (
          <>
            <AeButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmBlockOpen(true)}
              data-testid="social-block-button"
              title={t('socialGraph.block')}
              aria-label={t('socialGraph.block')}
              className="!rounded-full !h-11 !w-11 md:!h-9 md:!w-9 !p-0 shrink-0 justify-center inline-flex items-center text-white/55 !border !border-solid !border-white/15 hover:!border-red-400/50 hover:!bg-red-500/10 hover:!text-red-200 transition-colors"
            >
              <Ban className="h-4 w-4" />
            </AeButton>
            <span aria-hidden className="h-5 w-px shrink-0 bg-[#ffffff1f]" />
            {isFollowing ? (
              <AeButton
                variant="secondary"
                size="sm"
                loading={pendingAction === 'unfollow'}
                disabled={busy}
                onClick={unfollow}
                data-testid="social-following-button"
                title={t('socialGraph.unfollow')}
                aria-label={t('socialGraph.unfollow')}
                className="group ml-1 !rounded-full !h-11 md:!h-9 flex-1 md:flex-none px-5 min-w-[136px] justify-center inline-flex items-center gap-2 text-[13px] font-semibold !border !border-solid !border-white/15 hover:!border-red-400/40 hover:!bg-red-500/10 hover:!text-red-200 focus-visible:!border-red-400/40 focus-visible:!bg-red-500/10 focus-visible:!text-red-200 transition-colors"
              >
                {pendingAction !== 'unfollow' && (
                  <>
                    <Check className="h-4 w-4 group-hover:hidden group-focus-visible:hidden" />
                    <UserMinus className="hidden h-4 w-4 group-hover:inline-block group-focus-visible:inline-block" />
                  </>
                )}
                <span className="group-hover:hidden group-focus-visible:hidden">{t('socialGraph.following')}</span>
                <span className="hidden group-hover:inline group-focus-visible:inline">{t('socialGraph.unfollow')}</span>
              </AeButton>
            ) : (
              <AeButton
                variant="success"
                size="sm"
                disabled={busy}
                onClick={follow}
                data-testid="social-follow-button"
                className={`ml-1 !rounded-full !h-11 md:!h-9 flex-1 md:flex-none px-5 min-w-[136px] justify-center inline-flex items-center gap-2 text-[13px] font-semibold !text-[#031b12]${pendingAction === 'follow' ? ' cursor-wait disabled:!opacity-100' : ''}`}
              >
                {pendingAction === 'follow'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <UserPlus className="h-4 w-4" />}
                {t('socialGraph.follow')}
              </AeButton>
            )}
          </>
        )}
      </div>

      {errorBanner && (errorSlotRef?.current
        ? createPortal(errorBanner, errorSlotRef.current)
        : errorBanner)}

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
    </>
  );
};

export default ProfileSocialActions;
