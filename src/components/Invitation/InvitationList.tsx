import { useEffect, useMemo, useState } from "react";
import { useAeSdk } from "../../hooks";
import { getAffiliationTreasury } from "../../libs/affiliation";
import {
  getActiveAccountInviteList,
  getSecretKeyByInvitee,
  prepareInviteLink,
  removeStoredInvite,
} from "../../libs/invitation";
import AeButton from "../AeButton";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import CopyText from "../ui/CopyText";
import { cn } from "../../lib/utils";
import AddressChip from "../AddressChip";
import { Decimal } from "../../libs/decimal";
import LivePriceFormatter from "../../features/shared/components/LivePriceFormatter";

type Tx = {
  tx?: { function?: string; arguments?: any[] };
  hash?: string;
  microTime?: number;
};

interface InvitationStatus {
  hash: string;
  status: "created" | "claimed" | "revoked";
  invitee: string;
  date?: string;
  amount: number;
  revoked: boolean;
  revokedAt?: string;
  revokeTxHash?: string;
  claimed: boolean;
  invitationSecretKey?: string;
}

export default function InvitationList() {
  const { sdk, activeAccount } = useAeSdk();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [claimedMap, setClaimedMap] = useState<Record<string, boolean>>({});
  const [revoking, setRevoking] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationStatus | null>(null);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);
  const [recentlyRevokedInvitations, setRecentlyRevokedInvitations] = useState<
    string[]
  >([]);

  const list = useMemo(
    () => getActiveAccountInviteList(activeAccount),
    [activeAccount]
  );
  const getInvitationRevokeStatus = (invitee: string) => {
    return (
      transactions.find(
        (tx) =>
          tx?.tx?.function === "revoke_invitation_code" &&
          tx?.tx?.arguments?.[0]?.value === invitee
      ) || recentlyRevokedInvitations.includes(invitee)
    );
  };
  const determineInvitationStatus = (
    claimed: boolean,
    hasRevokeTx: any
  ): "created" | "claimed" | "revoked" => {
    if (claimed) return "claimed";
    if (hasRevokeTx) return "revoked";
    return "created";
  };

  const formatDate = (microTime: number): string => {
    const date = new Date(microTime);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (date > oneDayAgo) {
      // Show relative time for recent dates
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
      } else {
        return "Just now";
      }
    } else {
      // Show full date for older dates
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };
  const invitations = useMemo(() => {
    const result: InvitationStatus[] = [];
    for (const tx of transactions) {
      if (tx?.tx?.function !== "register_invitation_code") continue;
      const invitees =
        tx.tx.arguments?.[0]?.value?.map((x: any) => x.value) || [];
      const amount = Number(tx.tx.arguments?.[2]?.value || 0) / 1e18;
      for (const invitee of invitees) {
        const secret = getSecretKeyByInvitee(activeAccount, invitee);
        const revokeStatus = getInvitationRevokeStatus(invitee);
        const claimed = Boolean(claimedMap[invitee]);
        const status = determineInvitationStatus(claimed, revokeStatus);
        result.push({
          hash: tx.hash || "",
          status,
          invitee,
          amount,
          date: tx.microTime ? formatDate(tx.microTime) : undefined,
          revoked: !!revokeStatus,
          claimed,
          invitationSecretKey: secret,
        });
      }
    }
    return result;
  }, [transactions, activeAccount, claimedMap, recentlyRevokedInvitations]);

  // Recursive function to load all transactions with pagination
  const loadTransactionsFromMiddleware = async (
    url: string,
    _transactionList: Tx[] = []
  ): Promise<Tx[]> => {
    const response = await fetch(url);
    const json = await response.json();
    const transactions: Tx[] = Array.isArray(json?.data) ? json.data : [];
    _transactionList.push(...transactions);

    if (json.next) {
      const { CONFIG } = await import("../../config");
      return await loadTransactionsFromMiddleware(
        `${CONFIG.MIDDLEWARE_URL}${json.next}`,
        _transactionList
      );
    }
    return _transactionList;
  };

  const loadAccountInvitations = async (address: string): Promise<Tx[]> => {
    const { CONFIG } = await import("../../config");
    const contract = "ct_2GG42rs2FDPTXuUCWHMn98bu5Ab6mgNxY7KdGAKUNsrLqutNxZ";
    const url = `${CONFIG.MIDDLEWARE_URL}/v3/transactions?contract=${contract}&caller_id=${address}`;
    return await loadTransactionsFromMiddleware(url);
  };

  const refreshInvitationData = async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const data = await loadAccountInvitations(activeAccount);
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load invitation data:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInvitationData();
  }, [activeAccount]);

  const loadClaimedInvitations = async () => {
    const map: Record<string, boolean> = {};

    // Get unique invitees from transactions
    const uniqueInvitees = new Set<string>();
    transactions.forEach((t) => {
      if (t?.tx?.function === "register_invitation_code") {
        t?.tx?.arguments?.[0]?.value?.forEach((it: any) =>
          uniqueInvitees.add(it.value)
        );
      }
    });

    // Check each invitee's transaction history for redeem transactions
    await Promise.all(
      Array.from(uniqueInvitees).map(async (invitee) => {
        try {
          const inviteeTransactions = await loadAccountInvitations(invitee);
          const hasRedeemTx = inviteeTransactions.some(
            (tx) => tx?.tx?.function === "redeem_invitation_code"
          );
          map[invitee] = hasRedeemTx;
        } catch (error) {
          console.error(
            `Failed to check claimed status for ${invitee}:`,
            error
          );
          map[invitee] = false;
        }
      })
    );

    setClaimedMap(map);
  };

  useEffect(() => {
    if (transactions.length > 0) {
      loadClaimedInvitations();
    }
  }, [transactions]);

  async function revoke(invitee: string) {
    setRevoking(invitee);
    try {
      const treasury = await getAffiliationTreasury(sdk as any);
      await (treasury as any).revokeInvitationCode(invitee);
      setRecentlyRevokedInvitations((prev) => [...prev, invitee]);
      removeStoredInvite(activeAccount, invitee);
    } catch (error: any) {
      console.error("Failed to revoke invitation:", error);
      if (error.message?.includes("INVITATION_NOT_REGISTERED")) {
        removeStoredInvite(activeAccount, invitee);
      } else if (error.message?.includes("ALREADY_REDEEMED")) {
        alert("Invitation already claimed or revoked");
        // Refresh data
        refreshInvitationData();
      }
    } finally {
      setRevoking(null);
    }
  }

  const showInvitationLink = (invitation: InvitationStatus) => {
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
                  {!loading && invitation.status === "created" &&
                    invitation.invitationSecretKey && (
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
                      onClick={() => revoke(invitation.invitee)}
                      disabled={revoking === invitation.invitee}
                      loading={revoking === invitation.invitee}
                      variant="ghost"
                      size="small"
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      {revoking === invitation.invitee
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

          {selectedInvitation?.invitationSecretKey && (
            <div className="space-y-4">
              <CopyText
                value={prepareInviteLink(
                  selectedInvitation.invitationSecretKey
                )}
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
