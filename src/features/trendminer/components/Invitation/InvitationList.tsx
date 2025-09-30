import { useState } from "react";
import { useAeSdk } from "../../../../hooks/useAeSdk";
import AeButton from "../../../../components/AeButton";
import { Badge } from "../../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../components/ui/dialog";
import { Checkbox } from "../../../../components/ui/checkbox";
import CopyText from "../../../../components/ui/CopyText";
import { cn } from "../../../../lib/utils";
import AddressChip from "../../../../components/AddressChip";
import { Decimal } from "../../../../libs/decimal";
import LivePriceFormatter from "../../../shared/components/LivePriceFormatter";
import { useInvitations } from "../../hooks/useInvitations";

export default function InvitationList() {
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
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<any | null>(null);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);

  const handleRevokeInvitation = async (invitation: any) => {
    setRevokingInvitationInvitee(invitation.invitee);
    try {
      await revokeInvitation(invitation);
    } catch (error: any) {
      console.error("Failed to revoke invitation:", error);
      if (error.message?.includes("ALREADY_REDEEMED")) {
        alert("Invitation already claimed or revoked");
      }
    } finally {
      setRevokingInvitationInvitee(null);
    }
  };

  const showInvitationLink = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowInvitationDialog(true);
    setLinkHasBeenCopied(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "created":
        return "default";
      case "claimed":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (!activeAccount) return null;

  return (
    <>
      <div className="border border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Your Invitations</h3>
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
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_120px_120px_140px] gap-4 px-4 py-3 text-xs font-medium text-white/60 border-b border-white/10">
              <div>#</div>
              <div>Invitee</div>
              <div>Amount</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Table Rows */}
            {invitations.map((invitation, index) => (
              <div
                key={`${invitation.invitee}-${invitation.hash}`}
                className="grid grid-cols-[auto_1fr_120px_120px_140px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Index */}
                <div className="text-sm text-white/60 font-mono">
                  {invitations.length - index}
                </div>

                {/* Invitee */}
                <div className="min-w-0">
                  <div className=" font-mono text-sm text-white truncate">
                    <AddressChip address={invitation.invitee} />
                  </div>
                  {invitation.date && (
                    <div className="text-xs text-white/50 mt-1">
                      {invitation.date}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div
                  className={cn(
                    "text-sm font-medium",
                    invitation.status !== "created"
                      ? "text-white/40"
                      : "text-white"
                  )}
                >
                  <LivePriceFormatter
                    aePrice={Decimal.from(invitation.amount)}
                    watchPrice={false}
                    className={
                      invitation.status !== "created"
                        ? "text-white/40"
                        : "text-white"
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
                  {!loading &&
                    invitation.status === "created" &&
                    invitation.secretKey && (
                      <AeButton
                        onClick={() => showInvitationLink(invitation)}
                        variant="ghost"
                        size="small"
                        className="text-xs"
                      >
                        Link
                      </AeButton>
                    )}
                  {invitation.status === "created" && (
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
                        ? "Revoking..."
                        : "Revoke"}
                    </AeButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitation Link Dialog */}
      <Dialog
        open={showInvitationDialog}
        onOpenChange={setShowInvitationDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl mb-2">Copy Invite Link</DialogTitle>
            <DialogDescription className="text-sm text-white/70 mb-4">
              Share this link with someone to invite them. They can use it to
              claim their reward.
            </DialogDescription>
          </DialogHeader>

          {selectedInvitation?.secretKey && (
            <div className="space-y-4">
              <CopyText
                value={prepareInviteLink(selectedInvitation.secretKey)}
                bordered
                className="w-full"
              />

              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <span className="text-2xl">⚠️</span>
                <span className="text-sm text-yellow-200 font-medium">
                  Warning: Only share this link with trusted individuals
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="link-copied"
                  checked={linkHasBeenCopied}
                  onCheckedChange={(checked) =>
                    setLinkHasBeenCopied(checked === true)
                  }
                />
                <label
                  htmlFor="link-copied"
                  className="text-sm text-white/80 cursor-pointer"
                >
                  I have copied the link
                </label>
              </div>

              <AeButton
                onClick={() => setShowInvitationDialog(false)}
                disabled={!linkHasBeenCopied}
                className="w-full"
                size="large"
              >
                Close
              </AeButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
