/**
 * PWA-aware embedded wallet approval/sign UI.
 *
 * Shows as a bottom sheet in PWA/standalone mode, centered modal in browser.
 * Handles: approve/sign requests, transaction confirms, token creation, post comments.
 *
 * Uses isStandalone() to detect PWA mode and switches layout accordingly.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { isStandalone } from '@/utils/displayMode';

export interface PwaWalletApprovalSheetProps {
  title: string;
  description?: string;
  /** Action summary (e.g., "Approve 1,000 USDC", "Sign message") */
  action: string;
  /** Amount or detail to display prominently */
  amount?: string;
  /** Secondary detail (e.g., recipient address, token symbol) */
  detail?: string;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
  onClose: () => void;
  loading?: boolean;
  /** Optional custom content between title and action buttons */
  children?: React.ReactNode;
}

const PwaWalletApprovalSheet: React.FC<PwaWalletApprovalSheetProps> = ({
  title,
  description,
  action,
  amount,
  detail,
  onApprove,
  onReject,
  onClose,
  loading = false,
  children,
}) => {
  const { t } = useTranslation();
  const pwaMode = isStandalone();
  const [isApproving, setIsApproving] = React.useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
      onClose();
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  return (
    <div
      className={`w-full flex flex-col gap-4 ${
        pwaMode ? 'max-w-none' : 'max-w-md mx-auto'
      }`}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-white/60">{description}</p>
        )}
      </div>

      {/* Main action summary */}
      <div
        className="px-4 py-3 rounded-xl border bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20"
        style={{
          background:
            'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.08) 100%)',
        }}
      >
        <p className="text-sm text-white/70 mb-1">
          {t('common.modals.action', { defaultValue: 'Action' })}
        </p>
        <p className="text-lg font-semibold text-white">{action}</p>
        {amount && (
          <p className="text-xs text-white/50 mt-2">
            {t('common.modals.amount', { defaultValue: 'Amount' })}
            {': '}
            {amount}
          </p>
        )}
        {detail && (
          <p className="text-xs text-white/50 mt-1 break-words">
            {detail}
          </p>
        )}
      </div>

      {/* Custom content (e.g., transaction details, token info) */}
      {children && <div className="space-y-2">{children}</div>}

      {/* Action buttons */}
      <div
        className={`flex gap-3 ${
          pwaMode ? 'flex-col-reverse' : 'flex-col'
        } pt-2`}
      >
        <button
          type="button"
          onClick={handleReject}
          disabled={loading || isApproving}
          className="flex-1 px-4 py-3 font-medium rounded-lg border border-white/20 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="inline-block w-4 h-4 mr-2" />
          {t('common.buttons.reject', { defaultValue: 'Reject' })}
        </button>

        <button
          type="button"
          onClick={handleApprove}
          disabled={loading || isApproving}
          className="flex-1 px-4 py-3 font-bold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          }}
        >
          {isApproving ? (
            <>
              <span className="inline-block w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t('common.buttons.confirming', {
                defaultValue: 'Confirming...',
              })}
            </>
          ) : (
            <>
              <Check className="inline-block w-4 h-4 mr-2" />
              {t('common.buttons.approve', { defaultValue: 'Approve' })}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PwaWalletApprovalSheet;
