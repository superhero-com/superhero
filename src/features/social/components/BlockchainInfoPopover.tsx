import React, { useCallback, useMemo, useState, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ShieldCheck, X } from "lucide-react";
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
  showLabel?: boolean;
  triggerContent?: ReactNode; // custom trigger content (e.g., timestamp text)
  triggerClassName?: string; // optional class for custom trigger
};

export function BlockchainInfoPopover({
  txHash,
  createdAt,
  sender,
  contract,
  postId,
  className,
  showLabel,
  triggerContent,
  triggerClassName,
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
          className={cn(
            triggerContent
              ? cn("inline-flex items-center gap-1 bg-transparent border-0 px-0 py-0 h-auto min-h-0 min-w-0 text-white/70 hover:underline underline-offset-2", triggerClassName)
              : cn("inline-flex items-center justify-center gap-1 h-auto min-h-0 min-w-0 md:h-[28px] md:min-h-[28px] px-0 rounded-lg bg-transparent border-0 md:px-2.5 md:bg-white/[0.04] md:border md:border-white/10 md:hover:border-white/20", className),
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Blockchain info"
          title="Blockchain info"
        >
          {triggerContent ? (
            <>{triggerContent}</>
          ) : (
            <>
              <ShieldCheck className="w-[14px] h-[14px] opacity-80" strokeWidth={2.25} />
              {showLabel && (
                <span className="text-[11px] leading-none text-white/85">on-chain</span>
              )}
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="relative w-[360px] max-w-[92vw] p-3 rounded-xl border border-white/15 bg-black/80 backdrop-blur-md shadow-2xl text-white allow-small-controls">
        <button
          type="button"
          className="absolute right-2 top-2 md:hidden inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-colors"
          aria-label="Close"
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-1 pb-2 flex items-center justify-between gap-2">
          <DropdownMenuLabel className="px-0 pb-0 text-[13px] font-semibold tracking-wide text-white/85">Post stored on the æternity block</DropdownMenuLabel>
          <div className="ml-auto min-w-[48px] text-right">
            {extraLoading && <span className="text-[11px] text-white/70">Loading…</span>}
            {extraError && <span className="text-[11px] text-red-300/90">!</span>}
          </div>
        </div>
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
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="px-1 py-2 grid gap-1.5">
          <div className="grid grid-cols-[auto,1fr] items-center gap-2">
            <div className="text-xs text-white/70">Tx hash</div>
            <div className="flex items-center justify-end gap-2 min-w-0">
              <a href={txUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD] truncate" onClick={(e) => e.stopPropagation()}>{shortHash}</a>
              <button className="text-[11px] whitespace-nowrap opacity-80 hover:opacity-100 min-h-0 min-w-0 h-auto px-0 py-0 leading-none" onClick={(e) => handleCopy(txHash, e)}>Copy</button>
            </div>
          </div>
          {absoluteTime && (
            <div className="grid grid-cols-[auto,1fr] items-center gap-2">
              <div className="text-xs text-white/70">Timestamp</div>
              <div className="text-xs text-white/90 text-right min-h-0">{absoluteTime}</div>
            </div>
          )}
          {sender && (
            <div className="grid grid-cols-[auto,1fr] items-center gap-2">
              <div className="text-xs text-white/70">Sender</div>
              <div className="flex items-center justify-end gap-2 min-w-0">
                <a href={senderUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD] truncate" onClick={(e) => e.stopPropagation()}>
                  {`${sender.slice(0, 6)}...${sender.slice(-4)}`}
                </a>
                <button className="text-[11px] whitespace-nowrap opacity-80 hover:opacity-100 min-h-0 min-w-0 h-auto px-0 py-0 leading-none" onClick={(e) => handleCopy(sender!, e)}>Copy</button>
              </div>
            </div>
          )}
          {contract && (
            <div className="grid grid-cols-[auto,1fr] items-center gap-2">
              <div className="text-xs text-white/70">Contract</div>
              <div className="flex items-center justify-end gap-2 min-w-0">
                <a href={contractUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD] truncate" onClick={(e) => e.stopPropagation()}>
                  {`${contract.slice(0, 6)}...${contract.slice(-4)}`}
                </a>
                <button className="text-[11px] whitespace-nowrap opacity-80 hover:opacity-100 min-h-0 min-w-0 h-auto px-0 py-0 leading-none" onClick={(e) => handleCopy(contract!, e)}>Copy</button>
              </div>
            </div>
          )}
          {postId && (
            <div className="grid grid-cols-[auto,1fr] items-center gap-2">
              <div className="text-xs text-white/70">Post ID</div>
              <div className="flex items-center justify-end gap-2 min-w-0">
                <div className="text-xs text-white/90 truncate min-h-0">{postId}</div>
                <button className="text-[11px] whitespace-nowrap opacity-80 hover:opacity-100 min-h-0 min-w-0 h-auto px-0 py-0 leading-none" onClick={(e) => handleCopy(postId, e)}>Copy</button>
              </div>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <div className="px-1 py-2 flex items-center justify-between gap-2">
          <a href={txUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD]" onClick={(e) => e.stopPropagation()}>
            View on æScan
          </a>
          {senderUrl && (
            <a href={senderUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD]" onClick={(e) => e.stopPropagation()}>
              Sender
            </a>
          )}
          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline no-gradient-text text-[#0099FD] hover:text-[#0099FD]" onClick={(e) => e.stopPropagation()}>
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


