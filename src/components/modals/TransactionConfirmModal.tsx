import React from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import AeButton from '../AeButton';
import { IconWallet } from '../../icons';

interface TransactionConfirmModalProps {
  transaction: Encoded.Transaction;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export default function TransactionConfirmModal({ 
  transaction, 
  onConfirm, 
  onCancel, 
  onClose 
}: TransactionConfirmModalProps) {
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
        
        <div className="flex gap-2 sm:gap-3 justify-center pt-2">
          <AeButton 
            variant="secondary" 
            onClick={handleCancel}
            size="md"
            className="flex-1 text-sm sm:text-base"
          >
            Cancel
          </AeButton>
          <AeButton 
            variant="success" 
            onClick={handleConfirm}
            size="md"
            className="flex-1 text-sm sm:text-base"
          >
            Confirm on Wallet
          </AeButton>
        </div>
      </div>
    </div>
  );
}
