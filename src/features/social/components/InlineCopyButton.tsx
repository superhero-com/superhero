import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { copyToClipboard } from '../../../utils/address';

interface InlineCopyButtonProps {
  value: string;
  className?: string;
}

const InlineCopyButton = ({ value, className = '' }: InlineCopyButtonProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        'inline-flex items-center justify-center rounded-sm text-white/45 transition-colors',
        'hover:text-white/80 focus-visible:outline-none focus-visible:text-white/80',
        copied ? 'text-bull' : '',
        className,
      ].join(' ')}
      aria-label={copied ? t('social.copiedAddress') : t('common.wallet.copyAddress')}
      title={copied ? t('common.buttons.copied') : t('common.wallet.copyAddress')}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
};

export default InlineCopyButton;
