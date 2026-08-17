/**
 * PWA-optimized signature approval sheet.
 *
 * Shows signature requests (message signing, transaction signing) in a
 * mobile-friendly bottom sheet in PWA mode, centered modal in browser.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import PwaWalletApprovalSheet from './PwaWalletApprovalSheet';

interface PwaSignPromptSheetProps {
  /** Type of signature: 'message' | 'transaction' | 'nft-signature' */
  signType: 'message' | 'transaction' | 'nft-signature';
  /** Message or transaction summary to sign */
  content: string;
  /** Optional sender/signer address */
  fromAddress?: string;
  /** Optional recipient/target address */
  toAddress?: string;
  onApprove: () => void | Promise<void>;
  onReject: () => void;
  onClose: () => void;
  loading?: boolean;
}

const PwaSignPromptSheet: React.FC<PwaSignPromptSheetProps> = ({
  signType,
  content,
  fromAddress,
  toAddress,
  onApprove,
  onReject,
  onClose,
  loading = false,
}) => {
  const { t } = useTranslation();

  // Build title and action based on sign type
  const getTitleAndAction = () => {
    switch (signType) {
      case 'message':
        return {
          title: t('common.modals.signMessage', {
            defaultValue: 'Sign Message',
          }),
          action: 'Sign Message',
          description: 'Review and approve this message signature request.',
        };
      case 'transaction':
        return {
          title: t('common.modals.signTransaction', {
            defaultValue: 'Sign Transaction',
          }),
          action: 'Sign Transaction',
          description: 'Review transaction details before signing.',
        };
      case 'nft-signature':
        return {
          title: t('common.modals.signNft', {
            defaultValue: 'Sign NFT Operation',
          }),
          action: 'Sign NFT Operation',
          description: 'Approve this NFT-related operation.',
        };
      default:
        return {
          title: 'Sign Request',
          action: 'Sign',
          description: 'Review and approve this request.',
        };
    }
  };

  const titleAndAction = getTitleAndAction();

  return (
    <PwaWalletApprovalSheet
      title={titleAndAction.title}
      description={titleAndAction.description}
      action={titleAndAction.action}
      onApprove={onApprove}
      onReject={onReject}
      onClose={onClose}
      loading={loading}
    >
      {/* Content preview */}
      <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 max-h-[200px] overflow-y-auto">
        <p className="text-xs font-mono text-white/70 break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Address details if provided */}
      {(fromAddress || toAddress) && (
        <div className="space-y-2 text-sm text-white/60">
          {fromAddress && (
            <div>
              <p className="text-xs text-white/40 mb-1">From:</p>
              <p className="text-xs font-mono text-white/70 break-all">{fromAddress}</p>
            </div>
          )}
          {toAddress && (
            <div>
              <p className="text-xs text-white/40 mb-1">To:</p>
              <p className="text-xs font-mono text-white/70 break-all">{toAddress}</p>
            </div>
          )}
        </div>
      )}
    </PwaWalletApprovalSheet>
  );
};

export default PwaSignPromptSheet;
