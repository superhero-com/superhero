import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useRefreshXLinkState } from '@/hooks/useRefreshXLinkState';
import { TxPayloadType, useTransactionNotification } from '@/features/transaction-notification';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

const UNLINK_X_PAYLOAD = { type: TxPayloadType.UnlinkX } as const;

type XLinkedAccountRowProps = {
  address: string;
  username: string;
  /** Not the owner of this profile. */
  disabled?: boolean;
  /** The unlink confirmed on-chain; the editor should switch back to "Link account". */
  onUnlinked: () => void;
};

/**
 * The linked X account in the profile editor, with a way to unlink it.
 *
 * Unlinking is an on-chain change, so it goes through the same steps as
 * linking: an explicit confirm first — it ends X posting rewards — then the
 * wallet signature, then the top banner while the chain confirms.
 *
 * The pending state is read from the global notification rather than kept
 * here, because the editor can be closed and reopened while the transaction is
 * still confirming. Held locally, a reopened editor would offer "Unlink" again
 * for an unlink that is already on its way.
 */
export const XLinkedAccountRow = ({
  address,
  username,
  disabled = false,
  onUnlinked,
}: XLinkedAccountRowProps) => {
  const { t } = useTranslation('common');
  const { unlinkXAccount } = useProfile(address);
  const refreshXLinkState = useRefreshXLinkState();
  const {
    notificationState, notifySubmitted, notifyPendingTx, notifyConfirmed, notifyError,
  } = useTransactionNotification();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = `@${username.replace(/^@/u, '')}`;
  const unlinkPending = notificationState.status === 'pending'
    && notificationState.payload.type === TxPayloadType.UnlinkX;

  const handleUnlink = useCallback(async () => {
    if (signing) return;
    setSigning(true);
    setError(null);
    notifySubmitted(UNLINK_X_PAYLOAD);
    try {
      const txHash = await unlinkXAccount(address);
      const onConfirmed = () => {
        refreshXLinkState(address);
        onUnlinked();
      };
      setConfirmOpen(false);
      if (txHash) {
        notifyPendingTx(UNLINK_X_PAYLOAD, txHash, { onConfirmed });
      } else {
        // Nothing to poll. Say it's done rather than show a wait that can't end.
        notifyConfirmed(UNLINK_X_PAYLOAD);
        onConfirmed();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[x-unlink] failed', err);
      const message = (err as Error)?.message || t('messages.failedToUpdateProfile');
      // Stays open with the reason, so retrying is one tap.
      setError(message);
      notifyError(message);
    } finally {
      setSigning(false);
    }
  }, [
    address, notifyConfirmed, notifyError, notifyPendingTx, notifySubmitted,
    onUnlinked, refreshXLinkState, signing, t, unlinkXAccount,
  ]);

  if (unlinkPending) {
    return (
      <div
        className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2"
        role="status"
      >
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-white/60" aria-hidden />
        <div className="min-w-0">
          <div className="text-sm text-white/80">
            {t('transactionNotification.unlinkingXAccount')}
          </div>
          <div className="text-xs text-white/45">
            {t('transactionNotification.confirmingOnBlockchainEllipsis')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2">
        <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--neon-teal)' }} aria-hidden />
        <span className="min-w-0 truncate text-sm text-white/90">{handle}</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => { setError(null); setConfirmOpen(true); }}
            aria-label={`${t('buttons.unlink')} ${handle}`}
            className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-white/55 transition-colors hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            {t('buttons.unlink')}
          </button>
        )}
      </div>

      <Dialog
        open={confirmOpen}
        // No dismissing mid-signature: the wallet prompt is already out, and
        // closing this would leave the banner as the only sign it happened.
        onOpenChange={(next) => { if (!signing) setConfirmOpen(next); }}
      >
        <DialogContent className="bg-gray-900 border-white/12 text-white sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t('messages.xUnlinkConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-white/65">
              {t('messages.xUnlinkConfirmDesc', { username: handle })}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={signing}
              className="rounded-xl text-white/75 hover:bg-white/10 hover:text-white"
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleUnlink}
              disabled={signing}
              className="rounded-xl bg-red-500/90 font-semibold text-white hover:bg-red-500"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t('messages.xCallbackSigning')}
                </>
              ) : t('buttons.unlink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default XLinkedAccountRow;
