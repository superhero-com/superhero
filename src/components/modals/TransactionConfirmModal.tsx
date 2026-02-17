import React from 'react';
import AeButton from '../AeButton';
import { IconWallet } from '../../icons';

interface TransactionConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const TransactionConfirmModal = ({
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

export default TransactionConfirmModal;
