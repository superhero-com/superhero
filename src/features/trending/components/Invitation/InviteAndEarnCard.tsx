import { AlertCircle } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../../../../hooks/useAccount';
import { useAeSdk } from '../../../../hooks/useAeSdk';
import { Decimal } from '../../../../libs/decimal';
import { useInvitations } from '../../hooks/useInvitations';
import WalletConnectBtn from '../../../../components/WalletConnectBtn';
import CopyText from '../../../../components/ui/CopyText';
import { AeButton } from '../../../../components/ui/ae-button';
import Spinner from '../../../../components/Spinner';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { Checkbox } from '../../../../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';

interface InviteAndEarnCardProps {
  className?: string;
}

const InviteAndEarnCard = ({
  className,
}: InviteAndEarnCardProps) => {
  const { t } = useTranslation('forms');
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const { generateInviteKeys, prepareInviteLink } = useInvitations();

  // Form state
  const [amount, setAmount] = useState<string>('');
  const [invitesNumber, setInvitesNumber] = useState<number>(1);
  const [generatingInviteLink, setGeneratingInviteLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog state
  const [copyInviteLinkDialog, setCopyInviteLinkDialog] = useState(false);
  const [invitationLinks, setInvitationLinks] = useState<string[]>([]);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);
  const [closeBlockedPulse, setCloseBlockedPulse] = useState(false);

  // Refs
  const amountInputRef = useRef<HTMLInputElement>(null);
  const invitesInputRef = useRef<HTMLInputElement>(null);

  // Check if user has enough balance
  const hasEnoughBalance = useCallback(() => {
    if (!decimalBalance || !amount) return true;

    try {
      const totalAmount = Decimal.from(amount).mul(invitesNumber);
      return totalAmount.lte(decimalBalance.toString());
    } catch {
      return false;
    }
  }, [decimalBalance, amount, invitesNumber]);

  const generateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setGeneratingInviteLink(true);

    try {
      const amountValue = Number(amount);

      if (!amountValue || amountValue <= 0) {
        amountInputRef.current?.focus();
        throw new Error(t('pleaseEnterAmount'));
      }

      if (!invitesNumber || invitesNumber < 1) {
        invitesInputRef.current?.focus();
        throw new Error(t('pleaseCreateAtLeastOneInvite'));
      }

      if (!activeAccount) {
        throw new Error(t('noActiveAccount'));
      }

      // Use the shared hook to generate invite keys
      const secretKeys = await generateInviteKeys(amountValue, invitesNumber);

      // Generate invitation links
      const links = secretKeys.map((secretKey) => prepareInviteLink(secretKey));
      setInvitationLinks(links);

      // Reset form and show dialog
      setAmount('');
      setCopyInviteLinkDialog(true);
    } catch (error: any) {
      console.error('generateInviteLink error:', error);
      setErrorMessage(error?.message || t('failedToCreateInvitation'));
    } finally {
      setGeneratingInviteLink(false);
    }
  };

  const closeCopyInviteLinkDialog = () => {
    setCopyInviteLinkDialog(false);
    setTimeout(() => {
      setLinkHasBeenCopied(false);
    }, 500);
  };

  const pulseCloseBlocked = useCallback(() => {
    setCloseBlockedPulse(false);
    requestAnimationFrame(() => setCloseBlockedPulse(true));
    window.setTimeout(() => setCloseBlockedPulse(false), 500);
  }, []);

  const handleCopyDialogOpenChange = useCallback((open: boolean) => {
    if (!open && !linkHasBeenCopied) {
      pulseCloseBlocked();
      return;
    }
    if (!open) {
      closeCopyInviteLinkDialog();
      return;
    }
    setCopyInviteLinkDialog(true);
  }, [linkHasBeenCopied, pulseCloseBlocked]);

  return (
    <div className={`bg-[#0d1117]/10 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden ${className || ''}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
      </div>

      <h3 className="m-0 text-xl md:text-2xl font-bold text-white mb-2">
        Generate Invites
      </h3>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="flex-1 space-y-4 text-sm text-white/60">
          <p className="m-0 leading-relaxed">
            Create invite links by funding a one-time AE reward per invite. Each
            link contains a secret code; when someone opens the link and claims
            it, they receive the funded reward and the invitation is marked as
            used. You can generate multiple links at once and share them with friends or your community. You can also revoke an invite before it&apos;s claimed.
          </p>
         
          <p className="text-xs text-white/80 m-0">
            Important: save your links before closing the popup. The secret code
            is only shown to you at creation time.
          </p>
        </div>

        <div className="flex-1">
          <form onSubmit={generateInviteLink} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className="text-xs font-semibold text-white/50 tracking-wider uppercase"
                >
                  Amount per invite (AE)
                </Label>
                <Input
                  id="amount"
                  ref={amountInputRef}
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('common:placeholders.amount')}
                  disabled={!activeAccount}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm transition-all duration-200 outline-none font-medium w-full box-border focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] placeholder:text-white/20"
                />
                <div className="text-xs text-white/50">
                  This amount will be claimable by the recipient who redeems the link.
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="invites"
                  className="text-xs font-semibold text-white/40 tracking-wider uppercase"
                >
                  {t('numberOfInvites')}
                </Label>
                <Input
                  id="invites"
                  ref={invitesInputRef}
                  type="number"
                  min="1"
                  step="1"
                  value={invitesNumber}
                  onChange={(e) => setInvitesNumber(Math.max(1, Number(e.target.value || 1)))}
                  disabled={!activeAccount}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm transition-all duration-200 outline-none font-medium w-full box-border focus:border-cyan-500/50 focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] placeholder:text-white/20"
                />
              </div>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {!hasEnoughBalance() && amount && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('notEnoughBalance', { amount: Decimal.from(amount || 0).mul(invitesNumber).toString() })}
                </AlertDescription>
              </Alert>
            )}

            {activeAccount ? (
              <button
                type="submit"
                disabled={generatingInviteLink || !activeAccount}
                className={`w-full p-3 md:p-4 text-sm font-semibold flex items-center justify-center gap-2 uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  !activeAccount
                    ? 'opacity-50 cursor-not-allowed bg-white/5 text-white/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25'
                }`}
              >
                {generatingInviteLink ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    {t('buttons.creatingInvites', { ns: 'common' })}
                  </>
                ) : (
                  t('buttons.generateInviteLinks', { ns: 'common' })
                )}
              </button>
            ) : (
              <WalletConnectBtn label={t('buttons.connectWalletToGenerate', { ns: 'common' })} className="text-sm" />
            )}
          </form>
        </div>
      </div>

      <Dialog
        open={copyInviteLinkDialog}
        onOpenChange={handleCopyDialogOpenChange}
      >
        <DialogContent
          className="max-w-lg"
          hideClose={!linkHasBeenCopied}
          onEscapeKeyDown={(e) => {
            if (!linkHasBeenCopied) {
              e.preventDefault();
              pulseCloseBlocked();
            }
          }}
          onInteractOutside={(e) => {
            if (!linkHasBeenCopied) {
              e.preventDefault();
              pulseCloseBlocked();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {t('copyInviteLinks')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              {t('inviteLinksGeneratedSuccessfully')}
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {invitationLinks.map((link) => (
                <CopyText
                  key={link}
                  value={link}
                  bordered
                  className="w-full"
                />
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('saveLinksBeforeClosing')}
              </AlertDescription>
            </Alert>

            <div
              className={`flex items-center space-x-2 rounded-lg p-2 transition-colors ${
                closeBlockedPulse && !linkHasBeenCopied
                  ? 'animate-shake bg-red-500/10 border border-red-500/30'
                  : ''
              }`}
            >
              <Checkbox
                id="copied"
                checked={linkHasBeenCopied}
                onCheckedChange={(checked) => setLinkHasBeenCopied(!!checked)}
              />
              <Label htmlFor="copied" className="text-sm">
                {t('iHaveCopiedInvitationLinks')}
              </Label>
            </div>

            {!linkHasBeenCopied && (
              <div className="text-center text-xs text-white/60">
                Please confirm you copied the links to enable closing this dialog.
              </div>
            )}

            <AeButton
              variant="default"
              size="lg"
              fullWidth
              disabled={!linkHasBeenCopied}
              onClick={closeCopyInviteLinkDialog}
            >
              {t('buttons.close', { ns: 'common' })}
            </AeButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InviteAndEarnCard;
