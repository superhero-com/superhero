import React, { useMemo, useState } from "react";
import { useAccount, useAeSdk } from "../../hooks";
import { toAettos, fromAettos } from "../../libs/dex";
import { Decimal } from "../../libs/decimal";
import AeButton from "../AeButton";
import { IconDiamond } from "../../icons";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import { useChainName } from "../../hooks/useChainName";

export default function TipModal({ toAddress, onClose }: { toAddress: string; onClose: () => void }) {
  const { sdk, activeAccount, activeNetwork } = useAeSdk();
  const { balance } = useAccount();
  const { chainName } = useChainName(toAddress);

  const aeBalanceAe = useMemo(() => {
    try {
      return Decimal.from(fromAettos(String(balance || 0), 18));
    } catch {
      return Decimal.from(0);
    }
  }, [balance]);

  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const insufficient = useMemo(() => {
    if (!amount) return false;
    const v = Number(amount);
    if (!isFinite(v) || v <= 0) return true;
    try {
      return Decimal.from(amount).gt(aeBalanceAe);
    } catch {
      return true;
    }
  }, [amount, aeBalanceAe]);

  const disabled = !activeAccount || !amount || Number(amount) <= 0 || insufficient || sending;

  const handleQuick = (val: string) => setAmount(val);

  // removed Max button per request

  async function handleSend() {
    if (disabled) return;
    setSending(true);
    setError(null);
    setTxHash(null);
    try {
      const value = toAettos(amount, 18);
      const res: any = await (sdk as any).spend(value.toString(), toAddress);
      const hash = res?.hash || res?.transactionHash || res?.tx?.hash || null;
      setTxHash(hash);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSending(false);
    }
  }

  const explorerTxUrl = useMemo(() => {
    if (!txHash) return "";
    const base = activeNetwork?.explorerUrl?.replace(/\/$/, "") || "";
    return base ? `${base}/transactions/${txHash}` : "";
  }, [txHash, activeNetwork]);

  return (
    <div className="w-full">
      {/* Stylish header */}
      <div className="relative overflow-hidden rounded-2xl p-4 mb-4 border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient( circle at 30% 30%, #1161FE 0%, rgba(17,97,254,0) 60% )" }}
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center">
            <IconDiamond className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-lg font-semibold leading-tight">Send a tip</div>
            <div className="flex items-center gap-3 mt-2">
              <AddressAvatarWithChainName
                address={toAddress}
                size={36}
                showAddressAndChainName={false}
                isHoverEnabled={false}
              />
              <div className="min-w-0">
                {chainName && (
                  <div className="text-white/90 text-xs font-semibold truncate">{chainName}</div>
                )}
                <div className="text-white/60 text-[11px] break-all truncate">{toAddress}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success state */}
      {txHash && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
          Tip sent successfully.
          {explorerTxUrl && (
            <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline ml-1">View on explorer</a>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] backdrop-blur-lg">
        <div className="flex items-center justify-between text-xs text-white/70 mb-2">
          <span>Balance</span>
          <span>{aeBalanceAe.prettify()} AE</span>
        </div>

        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-xs text-white/70">Amount (AE)</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:border-[#4ecdc4] focus:outline-none"
              />
            </div>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuick("1")}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >1 AE</button>
            <button
              type="button"
              onClick={() => handleQuick("10")}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >10 AE</button>
            <button
              type="button"
              onClick={() => handleQuick("100")}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >100 AE</button>
            <button
              type="button"
              onClick={() => handleQuick("500")}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
            >500 AE</button>
          </div>

          {insufficient && (
            <div className="text-xs text-red-400">Insufficient balance.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <AeButton onClick={handleSend} disabled={disabled} loading={sending}>
          {txHash ? "Send again" : "Send tip"}
        </AeButton>
        <AeButton variant="ghost" onClick={onClose}>
          {txHash ? "Close" : "Cancel"}
        </AeButton>
      </div>
    </div>
  );
}


