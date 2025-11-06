import { formatFractionalPrice } from "@/utils/common";
import { COIN_SYMBOL } from "@/utils/constants";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import WalletConnectBtn from "../../../components/WalletConnectBtn";
import { useAeSdk } from "../../../hooks/useAeSdk";
import { cn } from "../../../lib/utils";
import FractionFormatter, { FormattedFractionalPrice } from "../../shared/components/FractionFormatter";
import LivePriceFormatter from "../../shared/components/LivePriceFormatter";
import { useTokenTrade } from "../hooks/useTokenTrade";
import { TokenDto } from "@/api/generated/models/TokenDto";
import ImpactBadge from "./ImpactBadge";
import MessageBox from "./MessageBox";
import TradeTokenInput from "./TradeTokenInput";
import TransactionConfirmDetailRow from "./TransactionConfirmDetailRow";

interface TokenTradeCardProps {
  token: TokenDto;
  onClose?: () => void;
}

export default function TokenTradeCard({
  token,
  onClose,
}: TokenTradeCardProps) {
  const { activeAccount } = useAeSdk();
  const [settingsDialogVisible, setSettingsDialogVisible] = useState(false);
  const [detailsShown, setDetailsShown] = useState(false);

  const {
    tokenA,
    tokenB,
    tokenAFocused,
    isBuying,
    loadingTransaction,
    errorMessage,
    successTxData,
    isInsufficientBalance,
    averageTokenPrice,
    priceImpactDiff,
    priceImpactPercent,
    protocolTokenReward,
    userBalance,
    spendableAeBalance,
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage,
    slippage,
    switchTradeView,
    setTokenAmount,
    setSlippage,
    placeTokenTradeOrder,
    resetFormState,
  } = useTokenTrade({ token });

  const currentStepText = isBuying ? "" : "1/2";

  if (!token?.sale_address) {
    return null;
  }

  return (
    <div className="w-full mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
      {/* Header with Tabs */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white m-0 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
          Trade Token
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex p-0 mb-6">
        <div className="grid grid-cols-2 w-full gap-1">
          <Button
            variant={isBuying ? "default" : "outline"}
            size="lg"
            className={cn(
              "w-full rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isBuying
                ? "bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                : "bg-white/10 border border-white/10 hover:bg-white/20"
            )}
            onClick={() => switchTradeView(true)}
          >
            Buy
          </Button>
          <Button
            variant={!isBuying ? "default" : "outline"}
            size="lg"
            className={cn(
              "w-full rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              !isBuying
                ? "bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                : "bg-white/10 border border-white/10 hover:bg-white/20"
            )}
            onClick={() => switchTradeView(false)}
          >
            Sell
          </Button>
        </div>
      </div>

      {/* Content */}
      <div>
        {errorMessage && (
          <MessageBox color="error" title="Oops" text={errorMessage} />
        )}

        <TradeTokenInput
          token={token}
          tokenA={tokenA}
          tokenB={tokenB}
          tokenAFocused={tokenAFocused}
          isBuying={isBuying}
          userBalance={userBalance}
          spendableAeBalance={spendableAeBalance}
          onTokenAChange={(value) => setTokenAmount(value, true)}
          onTokenBChange={(value) => setTokenAmount(value, false)}
          onTokenAFocus={() => setTokenAmount(tokenA, true)}
          onTokenBFocus={() => setTokenAmount(tokenB, false)}
          onToggleTradeView={() => switchTradeView(!isBuying)}
          isInsufficientBalance={isInsufficientBalance}
        />

        <div className="mt-4 space-y-2">
          {!averageTokenPrice.isZero && !averageTokenPrice.infinite && (
            <TransactionConfirmDetailRow label="Avg Token Price">
              <LivePriceFormatter
                aePrice={averageTokenPrice}
                watchPrice={false}
                className="mb-1"
              />
            </TransactionConfirmDetailRow>
          )}

          {detailsShown && (
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5 backdrop-blur-[10px] space-y-2">
              <button
                onClick={() => setDetailsShown(!detailsShown)}
                className="text-sm text-[#4ecdc4] hover:text-white transition-colors"
              >
                {detailsShown ? "Hide Details" : "Show Details"}
              </button>

              <TransactionConfirmDetailRow label="Allowed Slippage">
                <div className="flex items-center gap-2">
                  {Number(slippage ?? 0).toFixed(2)}%
                  <button
                    onClick={() => setSettingsDialogVisible(true)}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-xs font-medium hover:bg-[#4ecdc4] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    ⚙️
                  </button>
                </div>
              </TransactionConfirmDetailRow>

              <TransactionConfirmDetailRow label="Price Impact">
                <div
                  className={cn(
                    "flex items-center gap-4",
                    isBuying ? "text-green-600" : "text-red-600"
                  )}
                >
                  <div className="flex items-center">
                    {priceImpactDiff.isZero ? "" : isBuying ? "+" : "-"}
                    <FractionFormatter
                      fractionalPrice={formatFractionalPrice(priceImpactDiff) as FormattedFractionalPrice}
                    />
                    &nbsp;{COIN_SYMBOL}
                  </div>
                  <ImpactBadge
                    isPositive={isBuying}
                    isZero={priceImpactDiff.isZero}
                    percentage={
                      estimatedNextTokenPriceImpactDifferenceFormattedPercentage
                    }
                  />
                </div>
              </TransactionConfirmDetailRow>

              {isBuying && (
                <TransactionConfirmDetailRow label="Protocol Token Reward">
                  ~{protocolTokenReward}
                </TransactionConfirmDetailRow>
              )}
            </div>
          )}

          {!detailsShown && (
            <button
              onClick={() => setDetailsShown(true)}
              className="text-sm text-[#4ecdc4] hover:text-white transition-colors"
            >
              Show Details
            </button>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <WalletConnectBtn block />
          {activeAccount && (
            <Button
              className={cn(
                "w-full py-4 px-6 rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                loadingTransaction || isInsufficientBalance
                  ? "bg-white/10 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5 active:translate-y-0"
              )}
              size="lg"
              disabled={loadingTransaction || isInsufficientBalance}
              onClick={() => placeTokenTradeOrder(token)}
            >
              {loadingTransaction ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Confirm in wallet</span>
                  {currentStepText && <span>{currentStepText}</span>}
                </div>
              ) : (
                "Place Order"
              )}
            </Button>
          )}
        </div>

        {onClose && (
          <Button
            variant="outline"
            size="lg"
            className="w-full mt-2 py-4 px-6 rounded-2xl border border-white/10 bg-white/10 text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/20"
            onClick={onClose}
          >
            Cancel
          </Button>
        )}

        {successTxData && (
          <div className="mt-4">
            <MessageBox
              title="Success"
              text=""
              color="success"
              closable
              onClose={resetFormState}
            >
              <div>
                <span>
                  {successTxData.isBuying ? "Bought" : "Sold"}{" "}
                  {successTxData.destAmount.prettify()} {successTxData.symbol}{" "}
                  for {successTxData.sourceAmount.prettify()} AE. New balance:{" "}
                  {successTxData.userBalance.prettify()}
                </span>
                {successTxData.protocolReward && (
                  <span className="ml-1">
                    Earned {successTxData.protocolReward.prettify()}{" "}
                    {successTxData.protocolSymbol}
                  </span>
                )}
              </div>
            </MessageBox>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      {settingsDialogVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 max-w-sm w-full mx-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
            <h3 className="text-lg font-semibold mb-4 text-white bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
              Settings
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Slippage Tolerance (%)
              </label>
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-white/10 rounded-xl bg-white/[0.05] text-white placeholder-white/40 backdrop-blur-[10px] focus:outline-none focus:border-[#4ecdc4] transition-colors"
                step="0.1"
                min="0"
                max="50"
              />
            </div>
            <Button
              variant="default"
              onClick={() => setSettingsDialogVisible(false)}
              className="w-full py-4 px-6 rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] shadow-[0_8px_25px_rgba(255,107,107,0.4)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
