import { type RefObject, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check, Copy, Ellipsis, ExternalLink, Share2, Wallet,
} from 'lucide-react';
import AeButton from '../../../components/AeButton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { CONFIG } from '../../../config';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useSocialGraphConfig } from '../../../hooks/useSocialGraph';
import { IconDiamond } from '../../../icons';
import { copyToClipboard } from '../../../utils/address';
import ProfileSocialActions from './ProfileSocialActions';

interface ProfileActionBarProps {
  address: string;
  ownProfile: boolean;
  onEdit: () => void;
  onTip: () => void;
  errorSlotRef?: RefObject<HTMLElement | null>;
}

const controlBase = 'shrink-0 !rounded-full !h-11 md:!h-9 px-4 justify-center inline-flex items-center gap-2 text-[13px] font-semibold !border !border-solid !border-white/20 hover:!border-white/40 hover:!bg-white/10 transition-colors';
const iconControl = 'shrink-0 !rounded-full !h-11 !w-11 md:!h-9 md:!w-9 !p-0 justify-center inline-flex items-center !border !border-solid !border-white/20 hover:!border-white/40 hover:!bg-white/10 transition-colors';

/** Block 4 — the action bar. A full-width row of its own; own vs viewer swaps its controls. */
const ProfileActionBar = ({
  address, ownProfile, onEdit, onTip, errorSlotRef,
}: ProfileActionBarProps) => {
  const { t } = useTranslation('common');
  const { activeAccount } = useAeSdk();
  const { connectWallet, connectingWallet } = useWalletConnect();
  const { data: config } = useSocialGraphConfig();
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

  // The graph is configured on this backend but no wallet is connected: follow
  // becomes a connect prompt rather than an absence. When the graph is
  // unconfigured, follow stays silent (ProfileSocialActions renders nothing).
  const needsWallet = !ownProfile && !!config?.contract_address && !activeAccount;

  const overflow = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('titles.moreActions')}
          data-testid="profile-overflow-trigger"
          className={iconControl}
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
  );

  const shareButton = (
    <AeButton
      variant="ghost"
      size="sm"
      onClick={share}
      title={t('buttons.shareProfile')}
      aria-label={t('buttons.shareProfile')}
      data-testid="profile-share-button"
      className={iconControl}
    >
      <Share2 className="h-4 w-4" />
    </AeButton>
  );

  return (
    <div
      className="flex w-full items-center gap-2 md:w-auto md:shrink-0 md:justify-end"
      data-testid="profile-action-bar"
    >
      {ownProfile ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            data-testid="profile-edit-button"
            className={[
              'inline-flex h-11 md:h-9 flex-1 md:flex-none items-center justify-center gap-1.5 rounded-full border border-solid',
              'box-border whitespace-nowrap px-[18px] text-[13px] font-semibold leading-none',
              '!normal-case !tracking-normal !shadow-none !transform-none transition-colors',
            ].join(' ')}
            style={{
              background: 'rgba(0,255,157,0.08)',
              borderColor: 'rgba(0,255,157,0.3)',
              color: 'var(--neon-teal)',
            }}
          >
            ✦
            {' '}
            {t('buttons.editSuperheroId')}
          </button>
          {shareButton}
          {overflow}
        </>
      ) : (
        <>
          {needsWallet ? (
            <AeButton
              variant="ghost"
              size="sm"
              loading={connectingWallet}
              onClick={() => connectWallet()}
              data-testid="profile-connect-to-follow"
              className="flex-1 md:flex-none !rounded-full !h-11 md:!h-9 px-4 justify-center inline-flex items-center gap-2 text-[13px] font-semibold !border !border-dashed !border-white/30 hover:!border-white/50 hover:!bg-white/5 transition-colors"
            >
              {!connectingWallet && <Wallet className="h-4 w-4" />}
              {t('socialGraph.connectToFollow')}
            </AeButton>
          ) : (
            <ProfileSocialActions targetAddress={address} errorSlotRef={errorSlotRef} />
          )}
          {/* Tipping also needs a connected wallet, so the connect prompt stands in for it. */}
          {!needsWallet && (
            <AeButton
              variant="ghost"
              size="sm"
              onClick={onTip}
              title={t('titles.sendATip')}
              data-testid="profile-tip-button"
              className={controlBase}
            >
              <IconDiamond className="w-4 h-4 text-white" />
              {t('buttons.tip')}
            </AeButton>
          )}
          {shareButton}
          {overflow}
        </>
      )}
    </div>
  );
};

export default ProfileActionBar;
