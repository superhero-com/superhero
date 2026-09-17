import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '@/utils/address';

interface AddressCopyChipProps {
  address: string;
  className?: string;
}

/**
 * Block 2, D2 — the raw address is a copy chip, never a primary line and never
 * body text. The full address renders in the chip and goes to the clipboard on
 * tap; it wraps within the chip on narrow widths rather than truncating.
 */
const AddressCopyChip = ({ address, className = '' }: AddressCopyChipProps) => {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboard(address);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={address}
      aria-label={t('titles.copyAddress')}
      data-testid="profile-address-chip"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-solid border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[12px] leading-tight text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] focus:outline-none focus-visible:border-white/25 ${className}`}
    >
      <span className="tabular-nums break-all text-left">{address}</span>
      {copied
        ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--neon-teal)]" aria-hidden />
        : <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
    </button>
  );
};

export default AddressCopyChip;
