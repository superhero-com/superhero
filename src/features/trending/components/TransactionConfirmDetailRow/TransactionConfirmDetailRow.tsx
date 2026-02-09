import React from 'react';

interface TransactionConfirmDetailRowProps {
  label: string;
  children: React.ReactNode;
}

const TransactionConfirmDetailRow = ({ label, children }: TransactionConfirmDetailRowProps) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-sm text-white/60">{label}</span>
    <span className="text-sm font-medium text-white">{children}</span>
  </div>
);

export default TransactionConfirmDetailRow;
