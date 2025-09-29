import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  AeCard,
  AeCardHeader,
  AeCardContent,
} from "../ui/ae-card";
import { AeButton } from "../ui/ae-button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Checkbox } from "../ui/checkbox";
import { Copy, Check, AlertCircle } from "lucide-react";
import { useAeSdk } from "../../hooks/useAeSdk";
import { useAccount } from "../../hooks/useAccount";
import { useWalletConnect } from "../../hooks/useWalletConnect";
import { useModal } from "../../hooks/useModal";
import { getAffiliationTreasury } from "../../libs/affiliation";
import { addGeneratedInvites, prepareInviteLink } from "../../libs/invitation";
import { Decimal } from "../../libs/decimal";
import WalletConnectBtn from "../WalletConnectBtn";

interface InviteAndEarnCardProps {
  className?: string;
}

export default function InviteAndEarnCard({
  className,
}: InviteAndEarnCardProps) {
  const { sdk, activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const { connectWallet, connectingWallet } = useWalletConnect();
  const { openModal } = useModal();

  // Form state
  const [amount, setAmount] = useState<string>("");
  const [invitesNumber, setInvitesNumber] = useState<number>(1);
  const [generatingInviteLink, setGeneratingInviteLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog state
  const [copyInviteLinkDialog, setCopyInviteLinkDialog] = useState(false);
  const [invitationLinks, setInvitationLinks] = useState<string[]>([]);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const handleConnect = () => {
    openModal({ name: "connect-wallet" });
  };

  const generateInviteLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setGeneratingInviteLink(true);

    try {
      const amountValue = Number(amount);

      if (!amountValue || amountValue <= 0) {
        amountInputRef.current?.focus();
        throw new Error("Please enter an amount");
      }

      if (!invitesNumber || invitesNumber < 1) {
        invitesInputRef.current?.focus();
        throw new Error("Please create at least one invite");
      }

      if (!sdk) {
        throw new Error(
          "SDK not initialized. Please connect your wallet and try again."
        );
      }

      if (!activeAccount) {
        throw new Error(
          "No active account. Please connect your wallet and try again."
        );
      }

      // Get treasury contract
      const treasury = await getAffiliationTreasury(sdk as any);

      // Generate in-memory keypairs via aepp-sdk
      const mod = await import("@aeternity/aepp-sdk");
      const keys = new Array(invitesNumber)
        .fill(0)
        .map(() => mod.generateKeyPair());
      const invitees = keys.map((k: any) => k.publicKey);

      const redemptionFeeCover = 10n ** 15n;
      const inviteAmount = BigInt(Decimal.from(amountValue).bigNumber);

      // Register invitation codes on the blockchain
      await treasury.registerInvitationCode(
        invitees,
        redemptionFeeCover,
        inviteAmount
      );

      // Generate invitation links
      const links = keys.map((k: any) => prepareInviteLink(k.secretKey));
      setInvitationLinks(links);

      // Store invites locally
      if (sdk?.addresses) {
        const inviter = sdk.addresses()[0];
        addGeneratedInvites(
          inviter,
          keys.map((k: any) => ({
            invitee: k.publicKey,
            secretKey: k.secretKey,
            amount: amountValue,
          }))
        );
      }

      // Reset form and show dialog
      setAmount("");
      setCopyInviteLinkDialog(true);
    } catch (error: any) {
      console.error("generateInviteLink error:", error);
      setErrorMessage(error?.message || "Failed to create invitation");
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

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <AeCard
        // variant="glass"
        className="bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10 relative overflow-hidden min-h-0 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
      >
        <AeCardHeader>
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0">
              🎯
            </div>
            <h3 className="m-0 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
              Generate Invites
            </h3>
          </div>
        </AeCardHeader>

        <AeCardContent className="space-y-6">
          {/* Description */}
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              When you invite your friends to join the platform, you help us
              create a vibrant, interconnected ecosystem. As a token of
              appreciation, you receive a small percentage of the transaction
              activity generated by users you've directly invited, as well as by
              those invited indirectly through your network, up to four levels
              deep.
            </p>
            <p>
              This community incentive is designed to reward engagement and the
              expansion of our user base. The exact percentages and conditions
              can be reviewed in our detailed terms and conditions.
            </p>
            <p className="text-xs opacity-60">
              Note: Participation in the invitation program is voluntary, and
              any rewards earned are solely based on community activity, not
              guaranteed returns or investment profits. Please ensure you
              understand all applicable regulations and consult our terms of use
              before participating.
            </p>
          </div>

          {/* Form */}
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
                  Number of invites
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
                  Not enough balance. You need{" "}
                  {Decimal.from(amount || 0)
                    .mul(invitesNumber)
                    .toString()}{" "}
                  AE.
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
                    : "bg-gradient-to-r from-[var(--neon-teal)] to-blue-500 text-white shadow-lg shadow-[rgba(0,255,157,0.3)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[rgba(0,255,157,0.4)] before:content-[''] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-all before:duration-500 hover:before:left-full"
                }`}
              >
                {generatingInviteLink ? (
                  <>
                    <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
                    Creating invites...
                  </>
                ) : (
                  "Generate invite links"
                )}
              </button>
            ) : (
              <WalletConnectBtn label="Connect wallet to generate" />
            )}
          </form>
        </AeCardContent>
      </AeCard>

      {/* Copy Invite Link Dialog */}
      <Dialog
        open={copyInviteLinkDialog}
        onOpenChange={setCopyInviteLinkDialog}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              Copy Invite Links
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              Your invitation links have been generated successfully!
            </p>

            {/* Links */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {invitationLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                >
                  <Input
                    value={link}
                    readOnly
                    className="flex-1 text-xs font-mono bg-transparent border-none focus-visible:ring-0"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <AeButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(link, index)}
                    className="flex-shrink-0"
                  >
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </AeButton>
                </div>
              ))}
            </div>

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  Make sure to save these links before closing this dialog!
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
                I have copied the invitation links
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
              Close
            </AeButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
