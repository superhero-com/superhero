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

const MessageBox = ({
  title, text, color = 'error', closable, onClose, children,
}: MessageBoxProps) => (
  <div className={cn(
    'py-3 px-4 rounded-xl mb-5 text-center text-sm border backdrop-blur-[10px]',
    color === 'error'
      ? 'text-bear bg-bear/10 border-bear/20'
      : 'text-bull bg-bull/10 border-bull/20',
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
        type="button"
        onClick={onClose}
        className="text-white/60 hover:text-white ml-2"
      >
        ×
      </button>
      )}
    </div>
  </div>
);

export default MessageBox;
