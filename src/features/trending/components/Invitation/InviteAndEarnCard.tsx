import { AlertCircle, Share2, Twitter, MessageCircle, Copy, Check } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount } from "../../../../hooks/useAccount";
import { useAeSdk } from "../../../../hooks/useAeSdk";
import { Decimal } from "../../../../libs/decimal";
import { useInvitations } from "../../hooks/useInvitations";
import WalletConnectBtn from "../../../../components/WalletConnectBtn";
import CopyText from "../../../../components/ui/CopyText";
import { AeButton } from "../../../../components/ui/ae-button";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

interface InviteAndEarnCardProps {
  className?: string;
}

export default function InviteAndEarnCard({
  className,
}: InviteAndEarnCardProps) {
  const { t } = useTranslation('forms');
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const { generateInviteKeys, prepareInviteLink } = useInvitations();

  // Form state
  const [amount, setAmount] = useState<string>("");
  const [invitesNumber, setInvitesNumber] = useState<number>(1);
  const [generatingInviteLink, setGeneratingInviteLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog state
  const [copyInviteLinkDialog, setCopyInviteLinkDialog] = useState(false);
  const [invitationLinks, setInvitationLinks] = useState<string[]>([]);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

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
      setAmount("");
      setCopyInviteLinkDialog(true);
    } catch (error: any) {
      console.error("generateInviteLink error:", error);
      setErrorMessage(error?.message || t('failedToCreateInvitation'));
    } finally {
      setGeneratingInviteLink(false);
    }
  };

  const closeCopyInviteLinkDialog = () => {
    setCopyInviteLinkDialog(false);
    setTimeout(() => {
      setLinkHasBeenCopied(false);
      setCopiedLinkIndex(null);
    }, 500);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkIndex(index);
      setTimeout(() => setCopiedLinkIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareToTwitter = (link: string) => {
    const text = encodeURIComponent(`Join me on Superhero! Earn rewards by trading trend tokens. Use my invite link: ${link}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareToDiscord = (link: string) => {
    // Copy link for Discord sharing
    copyToClipboard(link, -1);
  };

  return (
    <div className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
      {/* Enhanced Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0 animate-bounce">
          🚀
        </div>
        <div className="flex-1">
          <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
            Generate Invite Links
          </h3>
          <p className="text-sm md:text-base text-slate-400 mt-2">
            Create unique invite links and start earning rewards
          </p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Description - Left Side */}
        <div className="flex-1 space-y-4">
          <div className="p-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-xl border border-pink-400/20">
            <p className="text-sm md:text-base text-white m-0 font-medium">
              <span className="text-pink-400 font-bold">Earn 0.5%</span> of every token purchase made by your invitees. 
              The more friends you invite, the more you can earn!
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <p className="m-0">Stake AE to create unique invite links</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <p className="m-0">Share links via social media or direct message</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">✓</span>
              <p className="m-0">Earn automatically when invitees buy tokens</p>
            </div>
          </div>
        </div>

        {/* Form - Right Side */}
        <div className="flex-1">
          <form onSubmit={generateInviteLink} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className="text-xs md:text-sm font-semibold text-slate-400 tracking-wider break-words"
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
                  placeholder="0.0"
                  disabled={!activeAccount}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 lg:p-5 text-white text-sm md:text-base transition-all duration-300 outline-none font-medium w-full box-border focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:bg-white/8 focus:-translate-y-px placeholder:text-slate-400 placeholder:opacity-60"
                />
              </div>

              {/* Number of Invites Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="invites"
                  className="text-xs md:text-sm font-semibold text-slate-400 tracking-wider break-words"
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
                  onChange={(e) =>
                    setInvitesNumber(Math.max(1, Number(e.target.value || 1)))
                  }
                  disabled={!activeAccount}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 lg:p-5 text-white text-sm md:text-base transition-all duration-300 outline-none font-medium w-full box-border focus:border-[var(--neon-teal)] focus:shadow-[0_0_0_3px_rgba(0,255,157,0.1)] focus:bg-white/8 focus:-translate-y-px placeholder:text-slate-400 placeholder:opacity-60"
                />
              </div>
            </div>

            {/* Error Messages */}
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

            {/* Submit Button */}
            {activeAccount ? (
              <button
                type="submit"
                disabled={generatingInviteLink || !activeAccount}
                className={`w-full p-4 md:p-5 lg:p-6 text-sm md:text-base font-bold flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden break-words whitespace-normal min-h-12 rounded-xl transition-all duration-300 ${
                  !activeAccount
                    ? "opacity-50 cursor-not-allowed bg-gray-600 transform-none"
                    : "bg-gradient-to-r from-[var(--neon-teal)] to-blue-500 text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full"
                }`}
              >
                {generatingInviteLink ? (
                  <>
                    <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                    {t('creatingInvites', { ns: 'common' })}
                  </>
                ) : (
                  t('generateInviteLinks', { ns: 'common' })
                )}
              </button>
            ) : (
              <WalletConnectBtn label={t('connectWalletToGenerate', { ns: 'common' })} className="text-sm" />
            )}
          </form>
        </div>
      </div>

      {/* Copy Invite Link Dialog */}
      <Dialog
        open={copyInviteLinkDialog}
        onOpenChange={setCopyInviteLinkDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {t('copyInviteLinks')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              {t('inviteLinksGeneratedSuccessfully')}
            </p>

            {/* Links */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {invitationLinks.map((link, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CopyText
                      value={link}
                      bordered
                      className="flex-1"
                    />
                    <button
                      onClick={() => copyToClipboard(link, index)}
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-300 hover:border-pink-400"
                      title="Copy link"
                    >
                      {copiedLinkIndex === index ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  {/* Social Share Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shareToTwitter(link)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/30 rounded-lg transition-all duration-300 text-sm text-white"
                    >
                      <Twitter className="w-4 h-4" />
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => shareToDiscord(link)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 rounded-lg transition-all duration-300 text-sm text-white"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Discord</span>
                    </button>
                    {navigator.share && (
                      <button
                        onClick={() => navigator.share({ text: link, title: 'Superhero Invite Link' })}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-300 text-sm text-white"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  {t('saveLinksBeforeClosing')}
                </span>
              </AlertDescription>
            </Alert>

            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copied"
                checked={linkHasBeenCopied}
                onCheckedChange={(checked) => setLinkHasBeenCopied(!!checked)}
              />
              <Label htmlFor="copied" className="text-sm">
                {t('iHaveCopiedInvitationLinks')}
              </Label>
            </div>

            {/* Close Button */}
            <AeButton
              variant="default"
              size="lg"
              fullWidth
              disabled={!linkHasBeenCopied}
              onClick={closeCopyInviteLinkDialog}
            >
              {t('close', { ns: 'common' })}
            </AeButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
