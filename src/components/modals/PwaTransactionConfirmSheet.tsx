/**
 * PWA-optimized transaction confirmation sheet.
 *
 * Adapts existing transaction confirmation data into the PwaWalletApprovalSheet UI.
 * Handles: trade confirms, token creation, sends, tips.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import {
  isBuyingAtom,
  tokenAAtom,
  tokenBAtom,
  tokenTradeTokenAtom,
} from '@/atoms/tokenTradeAtoms';
import { createTokenDetailsAtom } from '@/atoms/transactionConfirmAtom';
import { COIN_SYMBOL } from '@/utils/constants';
import { Decimal } from '@/libs/decimal';
import PwaWalletApprovalSheet from './PwaWalletApprovalSheet';

interface PwaTransactionConfirmSheetProps {
  transactionType: 'trade' | 'create-token' | 'send' | 'tip' | 'post-comment';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  loading?: boolean;
}

const PwaTransactionConfirmSheet: React.FC<PwaTransactionConfirmSheetProps> = ({
  transactionType,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}) => {
  const { t } = useTranslation();

  // Trade flow
  const isBuying = useAtomValue(isBuyingAtom);
  const tokenA = useAtomValue(tokenAAtom);
  const tokenB = useAtomValue(tokenBAtom);
  const token = useAtomValue(tokenTradeTokenAtom);

  // Token creation flow
  const createTokenDetails = useAtomValue(createTokenDetailsAtom);

  // Build title and action text based on transaction type
  const getTransactionDisplay = () => {
    switch (transactionType) {
      case 'trade': {
        const fromSymbol = isBuying ? COIN_SYMBOL : token?.symbol;
        const toSymbol = isBuying ? token?.symbol : COIN_SYMBOL;
        const fromAmount = tokenA || 0;
        const toAmount = tokenB || 0;

        return {
          title: isBuying ? t('common.modals.confirmBuy') : t('common.modals.confirmSell'),
          action: `${isBuying ? 'Buy' : 'Sell'} ${Decimal.from(toAmount).prettify()} ${toSymbol}`,
          amount: `${Decimal.from(fromAmount).prettify()} ${fromSymbol}`,
          detail: `Receiving ~${Decimal.from(toAmount).prettify()} ${toSymbol}`,
        };
      }
      case 'create-token': {
        if (!createTokenDetails) {
          return {
            title: t('common.modals.createToken'),
            action: 'Create Token',
            amount: undefined,
            detail: undefined,
          };
        }
        const { tokenName, aeAmount, estimatedTokens } = createTokenDetails;
        return {
          title: t('common.modals.createToken'),
          action: `Create "${tokenName}"`,
          amount: `${aeAmount || '0'} AE`,
          detail: `Initial supply: ${Decimal.from(estimatedTokens || 0).prettify()} tokens`,
        };
      }
      case 'send': {
        return {
          title: t('common.modals.confirmSend'),
          action: 'Send AE',
          amount: undefined,
          detail: undefined,
        };
      }
      case 'tip': {
        return {
          title: t('common.modals.confirmTip'),
          action: 'Send Tip',
          amount: undefined,
          detail: undefined,
        };
      }
      case 'post-comment': {
        return {
          title: t('common.modals.confirmPost'),
          action: 'Post Comment',
          amount: undefined,
          detail: undefined,
        };
      }
      default:
        return {
          title: 'Confirm Transaction',
          action: 'Confirm',
          amount: undefined,
          detail: undefined,
        };
    }
  };

  const display = getTransactionDisplay();

  return (
    <PwaWalletApprovalSheet
      title={display.title}
      action={display.action}
      amount={display.amount}
      detail={display.detail}
      onApprove={onConfirm}
      onReject={onCancel}
      onClose={onClose}
      loading={loading}
    >
      {/* Render transaction details here as needed */}
      {transactionType === 'trade' && (
        <div className="space-y-2 text-sm text-white/60">
          <div className="flex justify-between items-center px-3 py-2 bg-white/5 rounded-lg">
            <span>Price Impact</span>
            <span className="text-white">–</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 bg-white/5 rounded-lg">
            <span>Slippage</span>
            <span className="text-white">–</span>
          </div>
        </div>
      )}
    </PwaWalletApprovalSheet>
  );
};

export default PwaTransactionConfirmSheet;
