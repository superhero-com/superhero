import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface CopyTextProps {
  value: string;
  className?: string;
  bordered?: boolean;
}

export default function CopyText({ value, className = '', bordered = false }: CopyTextProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg bg-white/[0.05] transition-all duration-200",
      bordered && "border border-white/10",
      "hover:bg-white/[0.08]",
      className
    )}>
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={value}
          readOnly
          className="w-full bg-transparent text-white text-sm border-none outline-none font-mono"
        />
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
          copied
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
        )}
      >
        {copied ? (
          <span className="flex items-center gap-1">
            ✓ {t('buttons.copied')}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            📋 {t('buttons.copy')}
          </span>
        )}
      </button>
    </div>
  );
}
