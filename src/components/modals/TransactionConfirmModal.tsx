import React from 'react';
import { Encoded } from '@aeternity/aepp-sdk';
import AeButton from '../AeButton';

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
    <div>
      <h3>Confirm Transaction</h3>
      <div style={{ marginBottom: '16px' }}>
        <p>Please confirm this transaction to proceed:</p>
        <div style={{ 
          background: '#2f2f3b', 
          padding: '12px', 
          borderRadius: '4px', 
          marginTop: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          wordBreak: 'break-all'
        }}>
          {transaction}
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        justifyContent: 'flex-end' 
      }}>
        <AeButton 
          variant="secondary" 
          onClick={handleCancel}
        >
          Cancel
        </AeButton>
        <AeButton 
          variant="primary" 
          onClick={handleConfirm}
        >
          Confirm
        </AeButton>
      </div>
    </div>
  );
}
