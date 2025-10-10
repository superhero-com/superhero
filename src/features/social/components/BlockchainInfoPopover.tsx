import React, { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { IconLink } from "@/icons";
import { CONFIG } from "@/config";
import { cn } from "@/lib/utils";
import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import { TransactionsService } from "@/api/generated";

type BlockchainInfoPopoverProps = {
  txHash: string;
  createdAt?: string;
  sender?: string;
  contract?: string;
  postId?: string;
  className?: string;
};

export function BlockchainInfoPopover({
  txHash,
  createdAt,
  sender,
  contract,
  postId,
  className,
}: BlockchainInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);
  const { status } = useTransactionStatus(txHash, { enabled: !!txHash, refetchInterval: 8000 });

  // Optional: fetch additional tx details from API when opened (non-blocking)
  const handleOpenChange = useCallback(async (next: boolean) => {
    setOpen(next);
    if (next) {
      try {
        setExtraError(null);
        setExtraLoading(true);
        // Fire-and-forget; not all fields are required here
        await TransactionsService.getTransactionByHash({ txHash });
      } catch (e: any) {
        // ignore; popover still works with base data
        setExtraError(e?.message || "");
      } finally {
        setExtraLoading(false);
      }
    }
  }, [txHash]);

  const explorerBase = useMemo(() => (CONFIG.EXPLORER_URL || "https://aescan.io").replace(/\/$/, ""), []);
  const txUrl = useMemo(() => `${explorerBase}/transactions/${txHash}`, [explorerBase, txHash]);
  const senderUrl = useMemo(() => (sender ? `${explorerBase}/accounts/${sender}` : undefined), [explorerBase, sender]);
  const contractUrl = useMemo(() => (contract ? `${explorerBase}/contracts/${contract}` : undefined), [explorerBase, contract]);

  const shortHash = useMemo(() => `${txHash.slice(0, 6)}...${txHash.slice(-4)}`, [txHash]);
  const absoluteTime = createdAt ? new Date(createdAt).toLocaleString() : undefined;

  const handleCopy = useCallback(async (value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex items-center justify-center gap-1.5 h-[28px] px-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors", className)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Blockchain info"
          title="Blockchain info"
        >
          <IconLink className="w-[14px] h-[14px] opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[360px] max-w-[92vw] p-3 rounded-xl border border-white/15 bg-black/80 backdrop-blur-md shadow-2xl text-white">
        <DropdownMenuLabel className="px-1 pb-2 text-[13px] font-semibold tracking-wide text-white/85">Transaction</DropdownMenuLabel>
        <div className="px-1 pb-2 flex items-center gap-2">
          {status?.confirmed && (
            <Badge className="border-green-500/30 bg-green-500/25 text-green-300">Mined</Badge>
          )}
          {typeof status?.confirmations === "number" && status?.confirmations >= 0 && (
            <span className="text-xs text-white/80">{status.confirmations} conf</span>
          )}
          {status?.blockNumber && (
            <span className="text-xs text-white/80">• #{status.blockNumber}</span>
          )}
          {extraLoading && <span className="ml-auto text-[11px] text-white/70">Loading…</span>}
          {extraError && <span className="ml-auto text-[11px] text-red-300/90">!</span>}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="px-1 py-2 grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-white/70">Tx hash</div>
            <div className="flex items-center gap-2">
              <a href={txUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/85" onClick={(e) => e.stopPropagation()}>{shortHash}</a>
              <button className="text-[11px] opacity-80 hover:opacity-100" onClick={(e) => handleCopy(txHash, e)}>Copy</button>
            </div>
          </div>
          {absoluteTime && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-white/70">Timestamp</div>
              <div className="text-xs text-white/90">{absoluteTime}</div>
            </div>
          )}
          {sender && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-white/70">Sender</div>
              <div className="flex items-center gap-2">
                <a href={senderUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/85" onClick={(e) => e.stopPropagation()}>
                  {`${sender.slice(0, 6)}...${sender.slice(-4)}`}
                </a>
                <button className="text-[11px] opacity-80 hover:opacity-100" onClick={(e) => handleCopy(sender!, e)}>Copy</button>
              </div>
            </div>
          )}
          {contract && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-white/70">Contract</div>
              <div className="flex items-center gap-2">
                <a href={contractUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/85" onClick={(e) => e.stopPropagation()}>
                  {`${contract.slice(0, 6)}...${contract.slice(-4)}`}
                </a>
                <button className="text-[11px] opacity-80 hover:opacity-100" onClick={(e) => handleCopy(contract!, e)}>Copy</button>
              </div>
            </div>
          )}
          {postId && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-white/70">Post ID</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-white/90">{postId}</div>
                <button className="text-[11px] opacity-80 hover:opacity-100" onClick={(e) => handleCopy(postId, e)}>Copy</button>
              </div>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="px-1 py-2 flex items-center justify-between gap-2">
          <a href={txUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/90" onClick={(e) => e.stopPropagation()}>
            View on æScan
          </a>
          {senderUrl && (
            <a href={senderUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/80" onClick={(e) => e.stopPropagation()}>
              Sender
            </a>
          )}
          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline text-white/80" onClick={(e) => e.stopPropagation()}>
              Contract
            </a>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default BlockchainInfoPopover;


