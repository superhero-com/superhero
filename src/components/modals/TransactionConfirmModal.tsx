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
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '20px' 
      }}>
        <IconWallet style={{ 
          width: '48px', 
          height: '48px', 
          color: '#6366f1' 
        }} />
      </div>
      
      <h3 style={{ 
        marginBottom: '16px', 
        fontSize: '20px',
        fontWeight: '600'
      }}>
        Confirm Transaction
      </h3>
      
      <div style={{ 
        marginBottom: '24px',
        color: '#6b7280',
        lineHeight: '1.5'
      }}>
        <p style={{ marginBottom: '12px' }}>
          Please check your wallet and confirm the transaction to proceed.
        </p>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center' 
      }}>
        <AeButton 
          variant="secondary" 
          onClick={handleCancel}
          size="md"
        >
          Cancel
        </AeButton>
        <AeButton 
          variant="primary" 
          onClick={handleConfirm}
          size="md"
        >
          Open Wallet
        </AeButton>
      </div>
    </div>
  );
}
