import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownLeft, Check, Copy, Share2,
} from 'lucide-react';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import AeButton from '../AeButton';
import QrCode from '../QrCode';
import { useChainName } from '../../hooks/useChainName';
import { copyToClipboard } from '../../utils/address';

/**
 * Receive sheet — the "show me my address" half of profile send/receive.
 *
 * The QR encodes the bare `ak_…` address rather than a URI scheme: that is what
 * Superhero Wallet and every æternity scanner we have tested read back, and a
 * scheme prefix silently fails on some of them.
 */
const ReceiveModal = ({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { chainName } = useChainName(address);
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(address);
    if (!ok) return;
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 2000);
  };

  // Web Share is the natural hand-off on the installed PWA (AirDrop, Messages,
  // …). It is absent on most desktop browsers, so the button only appears when
  // the API is really there.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async () => {
    try {
      await navigator.share({ title: t('common.modals.receive.title'), text: address });
    } catch {
      // A dismissed share sheet rejects — that is a user action, not an error.
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-4 mb-4 border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl">
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
          style={{ background: 'radial-gradient( circle at 30% 30%, #00ff9d 0%, rgba(0,255,157,0) 60% )' }}
        />
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 grid place-items-center">
            <ArrowDownLeft className="w-5 h-5 text-[var(--neon-teal)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-lg font-semibold leading-tight">
              {t('common.modals.receive.title')}
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              {t('common.modals.receive.subtitle')}
            </div>
          </div>
        </div>
      </div>

      {/* QR card */}
      <div className="rounded-2xl p-4 border border-white/10 bg-white/[0.03] backdrop-blur-lg flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
          <QrCode
            value={address}
            size={200}
            title={t('common.modals.receive.qrAlt')}
            className="block h-[200px] w-[200px]"
          />
        </div>

        <div className="flex items-center gap-3 mt-4 w-full">
          <AddressAvatarWithChainName
            address={address}
            size={36}
            showAddressAndChainName={false}
            isHoverEnabled={false}
          />
          <div className="min-w-0 flex-1">
            {chainName && (
              <div className="text-white/90 text-xs font-semibold truncate">{chainName}</div>
            )}
            <div className="font-mono text-[11px] text-white/70 break-all leading-snug">
              {address}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-white/50">
        {t('common.modals.receive.networkWarning')}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <AeButton
          onClick={handleCopy}
          className="inline-flex items-center gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t('common.buttons.copied') : t('common.modals.receive.copyAddress')}
        </AeButton>
        {canShare && (
          <AeButton variant="ghost" onClick={handleShare} className="inline-flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            {t('common.modals.receive.share')}
          </AeButton>
        )}
        <AeButton variant="ghost" onClick={onClose}>
          {t('common.buttons.close')}
        </AeButton>
      </div>
    </div>
  );
};

export default ReceiveModal;
