import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check, Copy, Ellipsis, ExternalLink, Share2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { CONFIG } from '../../../config';
import { copyToClipboard } from '../../../utils/address';

interface ProfileCoverActionsProps {
  address: string;
}

// Round, translucent controls that read against the cover gradient.
const coverControl = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-solid border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/45 focus:outline-none focus-visible:border-white/40';

/** Share + overflow, floated over the top-right of the cover band. */
const ProfileCoverActions = ({ address }: ProfileCoverActionsProps) => {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const aescanUrl = `${(CONFIG.EXPLORER_URL || 'https://aescan.io').replace(/\/$/, '')}/accounts/${address}`;

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // fall through to clipboard on cancel/failure
      }
    }
    await copyToClipboard(url);
  };

  const copyAddress = async () => {
    const ok = await copyToClipboard(address);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openAescan = () => window.open(aescanUrl, '_blank', 'noopener,noreferrer');

  return (
    <div className="flex items-center gap-2" data-testid="profile-cover-actions">
      <button
        type="button"
        onClick={share}
        title={t('buttons.shareProfile')}
        aria-label={t('buttons.shareProfile')}
        data-testid="profile-share-button"
        className={coverControl}
      >
        <Share2 className="h-4 w-4" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('titles.moreActions')}
            data-testid="profile-overflow-trigger"
            className={coverControl}
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[184px]">
          <DropdownMenuItem onSelect={() => { share(); }} data-testid="profile-overflow-share">
            <Share2 className="h-4 w-4" />
            {t('buttons.shareProfile')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { copyAddress(); }} data-testid="profile-overflow-copy">
            {copied ? <Check className="h-4 w-4 text-[var(--neon-teal)]" /> : <Copy className="h-4 w-4" />}
            {t('buttons.copyAddress')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openAescan} data-testid="profile-overflow-aescan">
            <ExternalLink className="h-4 w-4" />
            {t('buttons.viewOnAescan')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProfileCoverActions;
