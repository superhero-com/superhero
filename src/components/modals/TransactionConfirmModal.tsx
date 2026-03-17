import {
  averageTokenPriceAtom,
  desiredSlippageAtom,
  estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom,
  isAllowSellingAtom,
  isBuyingAtom,
  priceImpactDiffAtom,
  tokenAAtom,
  tokenBAtom,
  tokenTradeTokenAtom,
} from '@/atoms/tokenTradeAtoms';
import { createTokenDetailsAtom, transactionTypeAtom } from '@/atoms/transactionConfirmAtom';
import FractionFormatter from '@/features/shared/components/FractionFormatter';
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { ImpactBadge } from '@/features/trending/components/ImpactBadge';
import { TransactionConfirmDetailRow } from '@/features/trending/components/TransactionConfirmDetailRow';
import { Decimal } from '@/libs/decimal';
import { formatFractionalPrice } from '@/utils/common';
import { COIN_SYMBOL, PROTOCOL_DAO_AFFILIATION_FEE, PROTOCOL_DAO_TOKEN_AE_RATIO } from '@/utils/constants';
import { useAtomValue } from 'jotai';
import { IconWallet } from '../../icons';
import AeButton from '../AeButton';

interface TransactionConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const TradeTransactionConfirm = ({
  onConfirm,
  onCancel,
  onClose,
}: TransactionConfirmModalProps) => {
  const tokenA = useAtomValue(tokenAAtom);
  const tokenB = useAtomValue(tokenBAtom);
  const token = useAtomValue(tokenTradeTokenAtom);
  const isBuying = useAtomValue(isBuyingAtom);
  const isAllowSelling = useAtomValue(isAllowSellingAtom);
  const desiredSlippage = useAtomValue(desiredSlippageAtom);
  const averageTokenPrice = useAtomValue(averageTokenPriceAtom);
  const priceImpactDiff = useAtomValue(priceImpactDiffAtom);
  const priceImpactPercent = useAtomValue(
    estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom,
  );

  const protocolTokenReward = (() => {
    const aeValue = isBuying ? tokenA || 0 : tokenB || 0;
    return Math.round(
      (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * aeValue * 100,
    ) / 100;
  })();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const tokenAFormatted = formatFractionalPrice(Decimal.from(tokenA ?? 0));
  const tokenBFormatted = formatFractionalPrice(Decimal.from(tokenB ?? 0));

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Title */}
      <h2 className="text-lg font-semibold text-white">
        {`Confirm ${isBuying ? 'Buy' : 'Sell'}`}
      </h2>

      {/* Token swap boxes */}
      <div className="relative flex flex-col gap-1">
        <div className="flex items-center justify-between px-3 py-3 border border-white/10 rounded-md bg-white/[0.03]">
          <span className="text-xl text-white">
            <FractionFormatter fractionalPrice={tokenAFormatted} />
          </span>
          <span className="text-sm font-bold uppercase text-white/80 truncate max-w-[120px]">
            {isBuying ? COIN_SYMBOL : token?.symbol}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-3 border border-white/10 rounded-md bg-white/[0.03]">
          <span className="text-xl text-white">
            <FractionFormatter fractionalPrice={tokenBFormatted} />
          </span>
          <span className="text-sm font-bold uppercase text-white/80 truncate max-w-[120px]">
            {isBuying ? token?.symbol : COIN_SYMBOL}
          </span>
        </div>

        {/* Arrow indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center border border-white/10 rounded bg-gray-900 text-white/60 text-xs">
          ↓
        </div>
      </div>

      {/* Estimated output */}
      <p className="text-sm text-white/80">
        {`Estimated output: ${tokenBFormatted.number} ${isBuying ? token?.symbol : COIN_SYMBOL}`}
      </p>

      {/* Order details */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Order Details</h3>
        <div className="space-y-0 divide-y divide-white/5">
          {!averageTokenPrice.isZero && !averageTokenPrice.infinite && (
            <TransactionConfirmDetailRow label="Avg. Token Price">
              <LivePriceFormatter aePrice={averageTokenPrice} watchPrice={false} />
            </TransactionConfirmDetailRow>
          )}

          <TransactionConfirmDetailRow label="Allowed Slippage">
            {`${Number(desiredSlippage ?? 0).toFixed(2)}%`}
          </TransactionConfirmDetailRow>

          <TransactionConfirmDetailRow label="Price Impact">
            <div className={`flex items-center gap-1 ${isBuying ? 'text-green-500' : 'text-red-500'}`}>
              <span className="flex items-center">
                {!priceImpactDiff.isZero && (isBuying ? '+' : '-')}
                <FractionFormatter fractionalPrice={formatFractionalPrice(priceImpactDiff)} />
                &nbsp;
                {COIN_SYMBOL}
              </span>
              <ImpactBadge
                isPositive={isBuying}
                isZero={priceImpactDiff.isZero}
                percentage={priceImpactPercent}
              />
            </div>
          </TransactionConfirmDetailRow>

          {isBuying && (
            <TransactionConfirmDetailRow label="Protocol Token Reward">
              {`~${Decimal.from(protocolTokenReward).prettify()}`}
            </TransactionConfirmDetailRow>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {!isBuying && (
          <AeButton
            variant="primary"
            onClick={handleConfirm}
            size="md"
            fullWidth
            disabled={!isAllowSelling}
            style={{ background: '#1161FE' }}
          >
            {`Allow Use of Token${!isAllowSelling ? ' ✓' : ''}`}
          </AeButton>
        )}
        <AeButton
          variant="primary"
          onClick={handleConfirm}
          size="md"
          fullWidth
          disabled={!isBuying && isAllowSelling}
          style={{ background: '#1161FE' }}
        >
          Place Order
        </AeButton>
        <AeButton
          variant="secondary"
          onClick={handleCancel}
          size="md"
          fullWidth
        >
          Cancel
        </AeButton>
      </div>
    </div>
  );
};

const DefaultTransactionConfirm = ({
  onConfirm,
  onCancel,
  onClose,
}: TransactionConfirmModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">Confirm Transaction</h2>
      </div>

      <div className="text-center space-y-4 sm:space-y-6 py-4">
        <div className="flex justify-center">
          <IconWallet className="w-12 h-12 text-indigo-400" />
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            Please check your wallet and confirm the transaction to proceed.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 pt-2">
          <AeButton
            variant="primary"
            onClick={handleConfirm}
            size="md"
            fullWidth
            className="text-sm sm:text-base"
            style={{ background: '#1161FE' }}
          >
            Confirm in Wallet
          </AeButton>
          <AeButton
            variant="secondary"
            onClick={handleCancel}
            size="md"
            fullWidth
            className="text-sm sm:text-base"
          >
            Cancel
          </AeButton>
        </div>
      </div>
    </div>
  );
};

const CreateTokenTransactionConfirm = ({
  onConfirm,
  onCancel,
  onClose,
}: TransactionConfirmModalProps) => {
  const details = useAtomValue(createTokenDetailsAtom);

  const handleConfirm = () => { onConfirm(); onClose(); };
  const handleCancel = () => { onCancel(); onClose(); };

  const hasInitialBuy = details?.inputMode === 'AE'
    ? Number(details.aeAmount || 0) > 0
    : Number(details?.tokenAmount || 0) > 0;

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-white">Confirm Token Creation</h2>

      {/* Token identity box */}
      <div className="flex items-center gap-3 px-4 py-3 border border-white/10 rounded-md bg-white/[0.03]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#4ecdc4] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {details?.tokenName?.[0] ?? '?'}
        </div>
        <div>
          <div className="text-white font-semibold text-base leading-tight">
            {details?.tokenName ?? '—'}
          </div>
          <div className="text-white/50 text-xs mt-0.5">New token</div>
        </div>
      </div>

      {/* Initial buy section */}
      {hasInitialBuy && (
        <div className="space-y-0 divide-y divide-white/5 border border-white/10 rounded-md px-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider pt-3 pb-2">
            Initial Buy
          </h3>

          {details?.inputMode === 'AE' ? (
            <>
              <TransactionConfirmDetailRow label="You spend">
                <span className="flex items-center gap-1">
                  <FractionFormatter
                    fractionalPrice={formatFractionalPrice(Decimal.from(details.aeAmount ?? 0))}
                  />
                  &nbsp;
                  {COIN_SYMBOL}
                </span>
              </TransactionConfirmDetailRow>
              {details.estimatedTokens && !details.estimatedTokens.isZero && (
                <TransactionConfirmDetailRow label="You receive ~">
                  <span className="flex items-center gap-1">
                    <FractionFormatter
                      fractionalPrice={formatFractionalPrice(details.estimatedTokens)}
                    />
                    &nbsp;
                    {details.tokenName}
                  </span>
                </TransactionConfirmDetailRow>
              )}
            </>
          ) : (
            <>
              <TransactionConfirmDetailRow label="You receive">
                <span className="flex items-center gap-1">
                  <FractionFormatter
                    fractionalPrice={formatFractionalPrice(Decimal.from(details?.tokenAmount ?? 0))}
                  />
                  &nbsp;
                  {details?.tokenName}
                </span>
              </TransactionConfirmDetailRow>
              {details?.estimatedCost && !details.estimatedCost.isZero && (
                <TransactionConfirmDetailRow label="Estimated cost ~">
                  <LivePriceFormatter
                    aePrice={details.estimatedCost}
                    watchPrice={false}
                  />
                </TransactionConfirmDetailRow>
              )}
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <AeButton
          variant="primary"
          onClick={handleConfirm}
          size="md"
          fullWidth
          style={{ background: '#1161FE' }}
        >
          Confirm in Wallet
        </AeButton>
        <AeButton
          variant="secondary"
          onClick={handleCancel}
          size="md"
          fullWidth
        >
          Cancel
        </AeButton>
      </div>
    </div>
  );
};

const TransactionConfirmModal = (props: TransactionConfirmModalProps) => {
  const transactionType = useAtomValue(transactionTypeAtom);

  if (transactionType === 'trade') {
    return <TradeTransactionConfirm {...props} />;
  }
  if (transactionType === 'create-token') {
    return <CreateTokenTransactionConfirm {...props} />;
  }
  return <DefaultTransactionConfirm {...props} />;
};

export default TransactionConfirmModal;
