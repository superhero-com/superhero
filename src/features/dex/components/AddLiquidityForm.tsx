import { useEffect, useMemo, useState } from "react";
import { DEX_ADDRESSES } from "../../../libs/dex";
import ConnectWalletButton from "../../../components/ConnectWalletButton";
import { useAddLiquidity } from "../hooks";
import { useTokenList } from "../../../components/dex/hooks/useTokenList";
import { useTokenBalances } from "../../../components/dex/hooks/useTokenBalances";
import { DexTokenDto } from "../../../api/generated";
import TokenInput from "../../../components/dex/core/TokenInput";
import DexSettings from "./DexSettings";
import LiquidityConfirmation from "./LiquidityConfirmation";
import LiquidityPreview from "./LiquidityPreview";
import LiquiditySuccessNotification from "../../../components/dex/core/LiquiditySuccessNotification";
import { Decimal } from "../../../libs/decimal";

import { useAccount, useDex } from "../../../hooks";
import { usePool } from "../context/PoolProvider";
import { TokenChip } from "@/components/TokenChip";

export default function AddLiquidityForm() {
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const {
    currentAction,
    selectedTokenA,
    selectedTokenB,
    clearSelection,
    onPositionUpdated,
  } = usePool();

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenA, setTokenA] = useState<DexTokenDto | null>(null);
  const [tokenB, setTokenB] = useState<DexTokenDto | null>(null);
  const { balances } = useTokenBalances(tokenA, tokenB);

  // Amounts and liquidity state
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");

  // Liquidity hook
  const { state, setState, executeAddLiquidity } = useAddLiquidity();

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string>("");
  const [successAmounts, setSuccessAmounts] = useState<{ amountA: string; amountB: string }>({ amountA: "", amountB: "" });

  // Helper function to find token by symbol or contract address
  const findToken = (identifier: string): DexTokenDto | null => {
    if (!identifier || !tokens.length) return null;

    // First try to find by symbol (case insensitive)
    const bySymbol = tokens.find(
      (t) => t.symbol.toLowerCase() === identifier.toLowerCase()
    );
    if (bySymbol) return bySymbol;

    // Then try to find by contract address
    const byAddress = tokens.find(
      (t) => t.address === identifier || t.address === identifier.toLowerCase()
    );
    if (byAddress) return byAddress;

    // For AE, check if it's the native token
    if (identifier.toLowerCase() === "ae") {
      const aeToken = tokens.find((t) => t.is_ae);
      if (aeToken) return aeToken;
    }

    return null;
  };

  // Initialize tokens based on context or defaults
  useEffect(() => {
    if (!tokens.length) return;

    // Set initial tokens from context if provided (force update when context changes)
    if (selectedTokenA) {
      const foundTokenA = findToken(selectedTokenA);
      if (foundTokenA && (!tokenA || tokenA.symbol !== foundTokenA.symbol)) {
        setTokenA(foundTokenA);
      }
    }

    if (selectedTokenB) {
      const foundTokenB = findToken(selectedTokenB);
      if (foundTokenB && (!tokenB || tokenB.symbol !== foundTokenB.symbol)) {
        setTokenB(foundTokenB);
      }
    }

    // Set default tokens if no context tokens provided and none selected
    if (!selectedTokenA && !tokenA && tokens.length) {
      setTokenA(tokens[2] || tokens[0]);
    }
    if (!selectedTokenB && !tokenB && tokens.length) {
      setTokenB(tokens[0] || tokens[1]);
    }
  }, [tokens, selectedTokenA, selectedTokenB]);

  // Update hook state when tokens change
  useEffect(() => {
    // For AE tokens, use 'AE' as the address for the hook state
    const tokenAAddress = tokenA?.is_ae ? "AE" : (tokenA?.address || "");
    const tokenBAddress = tokenB?.is_ae ? "AE" : (tokenB?.address || "");

    setState(prev => ({
      ...prev,
      tokenA: tokenAAddress,
      tokenB: tokenBAddress,
      symbolA: tokenA?.symbol || "",
      symbolB: tokenB?.symbol || "",
      decA: tokenA?.decimals || 18,
      decB: tokenB?.decimals || 18,
    }));
  }, [tokenA, tokenB, setState]);

  // Update hook state when amounts change
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      amountA,
      amountB,
    }));
  }, [amountA, amountB, setState]);

  // Handle Token A amount change and auto-calculate Token B
  const handleAmountAChange = (newAmountA: string) => {
    setAmountA(newAmountA);
    
    // Auto-calculate Token B based on ratio
    if (state.pairPreview?.ratioAinB && newAmountA && newAmountA !== '') {
      const ratioAinB = parseFloat(state.pairPreview.ratioAinB);
      if (!isNaN(ratioAinB) && ratioAinB > 0) {
        const amountANum = parseFloat(newAmountA);
        if (!isNaN(amountANum)) {
          const calculatedAmountB = amountANum === 0 ? '0' : (amountANum / ratioAinB).toString();
          setAmountB(calculatedAmountB);
        }
      }
    } else if (!newAmountA || newAmountA === '') {
      // Clear Token B when Token A is cleared
      setAmountB('');
    }
  };

  // Handle Token B amount change and auto-calculate Token A
  const handleAmountBChange = (newAmountB: string) => {
    setAmountB(newAmountB);
    
    // Auto-calculate Token A based on ratio
    if (state.pairPreview?.ratioAinB && newAmountB && newAmountB !== '') {
      const ratioAinB = parseFloat(state.pairPreview.ratioAinB);
      if (!isNaN(ratioAinB) && ratioAinB > 0) {
        const amountBNum = parseFloat(newAmountB);
        if (!isNaN(amountBNum)) {
          const calculatedAmountA = amountBNum === 0 ? '0' : (amountBNum * ratioAinB).toString();
          setAmountA(calculatedAmountA);
        }
      }
    } else if (!newAmountB || newAmountB === '') {
      // Clear Token A when Token B is cleared
      setAmountA('');
    }
  };

  const filteredTokensA = useMemo(() => {
    const term = searchA.trim().toLowerCase();
    const matches = (t: DexTokenDto) =>
      !term ||
      t.symbol.toLowerCase().includes(term) ||
      (t.address || "").toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchA]);

  const filteredTokensB = useMemo(() => {
    const term = searchB.trim().toLowerCase();
    const matches = (t: DexTokenDto) =>
      !term ||
      t.symbol.toLowerCase().includes(term) ||
      (t.address || "").toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchB]);

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) return;

    try {
      const txHash = await executeAddLiquidity(
        {
          tokenA: tokenA.address,
          tokenB: tokenB.address,
          amountA,
          amountB,
          slippagePct,
          deadlineMins,
          isAePair:
            tokenA.address === "AE" ||
            tokenB.address === "AE" ||
            tokenA.is_ae ||
            tokenB.is_ae ||
            false,
        },
        { suppressToast: true }
      ); // Suppress toast since we're using the custom success notification

      if (txHash) {
        // Capture amounts before clearing form
        setSuccessAmounts({ amountA, amountB });
        setSuccessTxHash(txHash);
        setShowSuccess(true);

        // Clear form
        setAmountA("");
        setAmountB("");
        setShowConfirm(false);

        // Clear selection if we were adding to existing position
        if (currentAction === "add") {
          clearSelection();
        }

        // Refresh positions after successful transaction
        await onPositionUpdated();
      }
    } catch (error) {
      console.error("Add liquidity failed:", error);
    }
  };

  // Balance validation
  const hasInsufficientBalanceA = useMemo(() => {
    if (!amountA || !balances.in || Number(amountA) <= 0) return false;
    try {
      return Decimal.from(amountA).gt(Decimal.from(balances.in));
    } catch {
      return false;
    }
  }, [amountA, balances.in]);

  const hasInsufficientBalanceB = useMemo(() => {
    if (!amountB || !balances.out || Number(amountB) <= 0) return false;
    try {
      return Decimal.from(amountB).gt(Decimal.from(balances.out));
    } catch {
      return false;
    }
  }, [amountB, balances.out]);

  const hasInsufficientBalance =
    hasInsufficientBalanceA || hasInsufficientBalanceB;

  const isAddDisabled =
    state.loading ||
    !amountA ||
    Number(amountA) <= 0 ||
    !amountB ||
    Number(amountB) <= 0 ||
    !tokenA ||
    !tokenB ||
    !!state.error ||
    hasInsufficientBalance;

  return (
    <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold m-0 sh-dex-title">
            Add Liquidity
          </h2>
        </div>

        <div className="flex gap-2 items-center">
          {currentAction === "add" && (
            <button
              onClick={clearSelection}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-xs font-medium hover:bg-[#00ff9d] hover:-translate-y-0.5 active:translate-y-0"
            >
              ✕ Cancel
            </button>
          )}

          <DexSettings title="Liquidity Settings">
            <button
              aria-label="open-settings"
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-xs font-medium hover:bg-[#00ff9d] hover:-translate-y-0.5 active:translate-y-0"
            >
              ⚙️ Settings
            </button>
          </DexSettings>
        </div>
      </div>
      <div className="flex-wrap text-sm text-white/60 text-left mb-6 opacity-90">
        {currentAction === "add" && selectedTokenA && selectedTokenB && (
          <p className="text-xs text-white/60 mt-1">
            Adding to
            <TokenChip address={selectedTokenA} />
            <span className="text-lg text-light-font-color">
              /
            </span>
            <TokenChip address={selectedTokenB} />
          
            position
          </p>
        )}
      </div>
      <div className="text-sm text-white/60 text-center mb-6 opacity-90">
        Provide liquidity to earn trading fees from swaps
      </div>

      {/* Token A Input */}
      <div className="mb-2">
        <TokenInput
          label="Token A"
          token={tokenA}
          skipToken={tokenB}
          amount={amountA}
          balance={balances.in}
          onTokenChange={setTokenA}
          onAmountChange={handleAmountAChange}
          tokens={filteredTokensA}
          excludeTokens={tokenB ? [tokenB] : []}
          disabled={state.loading}
          loading={tokensLoading}
          searchValue={searchA}
          onSearchChange={setSearchA}
          hasInsufficientBalance={hasInsufficientBalanceA}
        />
      </div>

      {/* Plus Icon */}
      <div className="flex justify-center my-4 relative">
        <div className="w-12 h-12 rounded-full bg-[#1161FE] border-2 border-white/10 text-white flex items-center justify-center text-xl font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(17,97,254,0.3)] z-[2] relative hover:shadow-[0_8px_24px_rgba(17,97,254,0.4)] hover:-translate-y-0.5">
          +
        </div>
      </div>

      {/* Token B Input */}
      <div className="mb-5">
        <TokenInput
          label="Token B"
          token={tokenB}
          skipToken={tokenA}
          amount={amountB}
          balance={balances.out}
          onTokenChange={setTokenB}
          onAmountChange={handleAmountBChange}
          tokens={filteredTokensB}
          excludeTokens={tokenA ? [tokenA] : []}
          disabled={state.loading}
          loading={tokensLoading}
          searchValue={searchB}
          onSearchChange={setSearchB}
          hasInsufficientBalance={hasInsufficientBalanceB}
        />
      </div>

      {/* Liquidity Preview */}
      {state.pairPreview && (
        <LiquidityPreview
          preview={state.pairPreview}
          tokenA={tokenA}
          tokenB={tokenB}
          pairExists={state.pairExists}
          hasError={!!state.error}
          onSuggestedAmountA={setAmountA}
          onSuggestedAmountB={setAmountB}
        />
      )}

      {/* Error Display */}
      {state.error && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          {state.error}
        </div>
      )}

      {/* Insufficient Balance Warning */}
      {(hasInsufficientBalanceA || hasInsufficientBalanceB) && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          {hasInsufficientBalanceA && hasInsufficientBalanceB ? (
            <>
              Insufficient balance for both {tokenA?.symbol} and {" "}
              {tokenB?.symbol}
            </>
          ) : hasInsufficientBalanceA ? (
            <>
              Insufficient {tokenA?.symbol} balance. You need {amountA} but only
              have {balances.in ? Decimal.from(balances.in).prettify() : "0"}
            </>
          ) : (
            <>
              Insufficient {tokenB?.symbol} balance. You need {amountB} but only
              have {balances.out ? Decimal.from(balances.out).prettify() : "0"}
            </>
          )}
        </div>
      )}

      {/* Add Liquidity Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isAddDisabled}
          className={`w-full px-6 py-3 sm:px-5 sm:py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isAddDisabled
              ? "bg-white/10 cursor-not-allowed opacity-60"
              : "bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {state.loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Confirm in wallet…
            </div>
          ) : (
            "Add Liquidity"
          )}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect wallet"
          variant="dex"
          block
          className="w-full py-4 px-6 rounded-2xl border-none bg-[#1161FE] text-white text-base font-bold tracking-wider uppercase shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0"
        />
      )}

      {/* Confirmation Modal */}
      <LiquidityConfirmation
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAddLiquidity}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={amountA}
        amountB={amountB}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        pairPreview={state.pairPreview}
        loading={state.loading}
      />

      {/* Success Notification */}
      <LiquiditySuccessNotification
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={successAmounts.amountA}
        amountB={successAmounts.amountB}
        txHash={successTxHash}
      />
    </div>
  );
}
