import React from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import AeButton from '../AeButton';
import { IconWallet } from '../../icons';

interface TransactionConfirmModalProps {
  transaction: Encoded.Transaction;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export default function TransactionConfirmModal({ 
  transaction, 
  open,
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[var(--secondary-color)] border-white/20">
        <DialogHeader>
          <DialogTitle className="text-center text-white">Confirm Transaction</DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6 py-4">
          <div className="flex justify-center">
            <IconWallet className="w-12 h-12 text-indigo-400" />
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed">
              Please check your wallet and confirm the transaction to proceed.
            </p>
          </div>
          
          <div className="flex gap-3 justify-center pt-2">
            <AeButton 
              variant="secondary" 
              onClick={handleCancel}
              size="md"
              className="flex-1"
            >
              Cancel
            </AeButton>
            <AeButton 
              variant="primary" 
              onClick={handleConfirm}
              size="md"
              className="flex-1"
              green
            >
              Open Wallet
            </AeButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
