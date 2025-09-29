import { useEffect, useMemo, useState } from "react";
import { useAeSdk } from "@/hooks";
import { Encoded, toAe } from "@aeternity/aepp-sdk";
import { getAffiliationTreasury } from "@/libs/affiliation";
import AeButton from "../AeButton";
import camelCaseKeysDeep from "camelcase-keys-deep";
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
import { cn } from "@/lib/utils";
import AddressChip from "../AddressChip";
import { Decimal } from "@/libs/decimal";
import LivePriceFormatter from "@/features/shared/components/LivePriceFormatter";
import {
  TX_FUNCTIONS,
  DATE_LONG,
  INVITATIONS_CONTRACT,
} from "@/utils/constants";
import { ITransaction } from "@/utils/types";
import { useInvitation } from "@/hooks/useInvitation";
import moment from "moment";
import { fetchJson } from "@/utils/common";

interface InvitationStatus {
  hash: string;
  status: "created" | "claimed" | "revoked";
  invitee: string;
  date?: string;
  amount: string;
  revoked: boolean;
  revokedAt?: string;
  revokeTxHash?: string;
  claimed: boolean;
  secretKey?: string;
}

export default function InvitationList() {
  const { sdk, activeAccount, activeNetwork } = useAeSdk();
  const [transactionList, setTransactionList] = useState<ITransaction[]>([]);
  const [claimedInvitations, setClaimedInvitations] = useState<
    Record<string, boolean>
  >({});
  const [revokingInvitationInvitee, setRevokingInvitationInvitee] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<InvitationStatus | null>(null);
  const [linkHasBeenCopied, setLinkHasBeenCopied] = useState(false);
  const [recentlyRevokedInvitations, setRecentlyRevokedInvitations] = useState<
    string[]
  >([]);
  const { activeAccountInviteList, prepareInviteLink, removeStoredInvite } =
    useInvitation();

  function getInvitationRevokeStatus(invitee: string): ITransaction | boolean {
    return (
      transactionList.find(
        (tx) =>
          tx?.tx?.function === TX_FUNCTIONS.register_invitation_code &&
          tx?.tx?.arguments?.[0]?.value === invitee
      ) || recentlyRevokedInvitations.includes(invitee)
    );
  }
  const determineInvitationStatus = (
    claimed: boolean,
    hasRevokeTx: any
  ): "created" | "claimed" | "revoked" => {
    if (claimed) return "claimed";
    if (hasRevokeTx) return "revoked";
    return "created";
  };
  /**
   * Retrieves the secret key for an invitation
   * @param invitee - The invitee address
   * @returns The invitation secret key if found
   */
  function getInvitationSecretKey(invitee: string): string | undefined {
    return activeAccountInviteList.find((item) => item.invitee === invitee)
      ?.secretKey;
  }

  /**
   * Determines the status and details of an invitation
   * @param invitee - The invitee address
   * @param transaction - The registration transaction
   * @returns Formatted invitation status object
   */
  function getInvitationStatus(
    invitee: Encoded.AccountAddress,
    transaction: ITransaction
  ): InvitationStatus {
    const revokeStatus = getInvitationRevokeStatus(invitee);
    const claimed = claimedInvitations[invitee];
    const status = determineInvitationStatus(claimed, revokeStatus);
    const secretKey = getInvitationSecretKey(invitee);

    return {
      hash: transaction.hash,
      status,
      invitee,
      date: moment(transaction.microTime).format(DATE_LONG),
      amount: Decimal.from(toAe(transaction.tx.arguments[2].value)).prettify(),
      revoked: !!revokeStatus,
      ...(typeof revokeStatus === "object" && {
        revokedAt: moment(revokeStatus.microTime).format(DATE_LONG),
        revokeTxHash: revokeStatus.hash,
      }),
      claimed,
      secretKey,
    };
  }
  const invitations = useMemo(() => {
    const formattedInvitations: InvitationStatus[] = [];
    for (const transaction of transactionList) {
      if (transaction?.tx?.function !== TX_FUNCTIONS.register_invitation_code)
        continue;
      const invitees =
        transaction.tx.arguments?.[0]?.value?.map((item: any) => item.value) ||
        [];
      // const amount = Number(transaction.tx.arguments?.[2]?.value || 0) / 1e18;
      for (const invitee of invitees) {
        const invitationStatus = getInvitationStatus(invitee, transaction);
        formattedInvitations.push(invitationStatus);
      }
    }
    return formattedInvitations;
  }, [
    transactionList,
    activeAccount,
    claimedInvitations,
    recentlyRevokedInvitations,
  ]);

  // Recursive function to load all transactions with pagination
  const loadTransactionsFromMiddleware = async (
    url: string,
    _transactionList: ITransaction[] = []
  ): Promise<ITransaction[]> => {
    const response = await fetchJson(url);
    const transactions: ITransaction[] = response.data
      ? (camelCaseKeysDeep(response.data) as unknown as ITransaction[])
      : [];
    _transactionList.push(...transactions);

    if (response.next) {
      return await loadTransactionsFromMiddleware(
        `${activeNetwork.middlewareUrl}${response.next}`,
        _transactionList
      );
    }
    return _transactionList;
  };

  const loadAccountInvitations = async (
    address: string
  ): Promise<ITransaction[]> => {
    const url = `${activeNetwork.middlewareUrl}/v3/transactions?contract=${INVITATIONS_CONTRACT}&caller_id=${address}`;
    return await loadTransactionsFromMiddleware(url);
  };

  const refreshInvitationData = async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const data = await loadAccountInvitations(activeAccount);
      setTransactionList(data);
      await loadClaimedInvitations();
      setLoading(false);
    } catch (error) {
      console.error("Failed to load invitation data:", error);
      setTransactionList([]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInvitationData();
  }, [activeAccount]);

  async function loadClaimedInvitations() {
    await Promise.all(
      invitations.map(async (invitation) => {
        const inviteeTransactions = await loadAccountInvitations(
          invitation.invitee
        );
        inviteeTransactions.forEach((tx: ITransaction) => {
          if (tx?.tx?.function === TX_FUNCTIONS.redeem_invitation_code) {
            setClaimedInvitations((prev) => ({
              ...prev,
              [invitation.invitee]: true,
            }));
          }
        });
      })
    );
  }

  useEffect(() => {
    if (transactionList.length > 0) {
      loadClaimedInvitations();
    }
  }, [transactionList]);

  async function revokeInvitation(invitee: InvitationStatus) {
    setRevokingInvitationInvitee(invitee.invitee);
    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      await (affiliationTreasury as any).revokeInvitationCode(invitee.invitee);
      setRecentlyRevokedInvitations((prev) => [...prev, invitee.invitee]);
      removeStoredInvite(invitee.invitee as `ak_${string}`, invitee.secretKey);
    } catch (error: any) {
      console.error("Failed to revoke invitation:", error);
      if (error.message?.includes("INVITATION_NOT_REGISTERED")) {
        removeStoredInvite(
          invitee.invitee as `ak_${string}`,
          invitee.secretKey
        );
      } else if (error.message?.includes("ALREADY_REDEEMED")) {
        alert("Invitation already claimed or revoked");
        // Refresh data
        refreshInvitationData();
      }
    } finally {
      setRevokingInvitationInvitee(null);
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
                      onClick={() => revokeInvitation(invitation)}
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
