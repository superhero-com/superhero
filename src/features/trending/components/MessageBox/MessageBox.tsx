import React from 'react';
import { cn } from '../../../../lib/utils';

interface MessageBoxProps {
  title: string;
  text: string;
  color?: 'error' | 'success';
  closable?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function MessageBox({
  title, text, color = 'error', closable, onClose, children,
}: MessageBoxProps) {
  return (
    <div className={cn(
      'py-3 px-4 rounded-xl mb-5 text-center text-sm border backdrop-blur-[10px]',
      color === 'error'
        ? 'text-red-400 bg-red-400/10 border-red-400/20'
        : 'text-green-400 bg-green-400/10 border-green-400/20',
    )}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 text-left">
          <h4 className="font-medium">{title}</h4>
          {text && <p className="text-sm mt-1">{text}</p>}
          {children}
        </div>
        {closable && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white ml-2"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
