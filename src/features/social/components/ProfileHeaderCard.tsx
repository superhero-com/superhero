import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
// eslint-disable-next-line import/no-named-as-default
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import ProfileActionBar from './ProfileActionBar';
import ProfileBand from './ProfileBand';
import ProfileCoverActions from './ProfileCoverActions';
import ProfileIdentity from './ProfileIdentity';
import ProfileSocialStats from './ProfileSocialStats';

interface ProfileHeaderCardProps {
  address: string;
  displayName: string;
  handle?: string | null;
  isVerified: boolean;
  verifiedUsername?: string | null;
  bio?: string;
  site?: string | null;
  ownProfile: boolean;
  followersCount?: number | null;
  followingCount?: number | null;
  countsStatus?: 'loading' | 'ready' | 'error';
  postsCount?: number | null;
  onBack: () => void;
  onEdit: () => void;
  onEditBio: () => void;
  onTip: () => void;
  onPostsClick: () => void;
  errorSlotRef?: RefObject<HTMLElement | null>;
}

// 3 px page-ground border; identicon only — avatarurl is never rendered because
// there is no write path to set or clear one.
const Avatar = ({ address, size, className }: {
  address: string;
  size: number;
  className?: string;
}) => (
  <div
    className={`relative z-10 w-fit shrink-0 rounded-[20px] ring-[3px] ring-[var(--background-color)] bg-[var(--background-color)] ${className || ''}`}
  >
    <AddressAvatarWithChainName
      address={address}
      size={size}
      showAddressAndChainName={false}
      avatarBorderRadius="20px"
      isHoverEnabled
      className="rounded-[20px] overflow-hidden"
    />
  </div>
);

/** Blocks 1-4 as one card: band (with back + share/more over it) -> identity -> counts. */
const ProfileHeaderCard = ({
  address,
  displayName,
  handle,
  isVerified,
  verifiedUsername,
  bio,
  site,
  ownProfile,
  followersCount,
  followingCount,
  countsStatus,
  postsCount,
  onBack,
  onEdit,
  onEditBio,
  onTip,
  onPostsClick,
  errorSlotRef,
}: ProfileHeaderCardProps) => {
  const { t } = useTranslation('common');

  return (
    <section
      data-testid="profile-header-card"
      className="mb-4 overflow-hidden rounded-2xl border border-solid border-white/10 bg-white/[0.02]"
    >
      {/* Cover band with the back button (left) and share / more (right) over it. */}
      <div className="relative">
        <ProfileBand address={address} className="h-[86px] md:h-[132px]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 md:p-4">
          <button
            type="button"
            onClick={onBack}
            data-testid="profile-back-button"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-solid border-white/20 bg-black/30 px-3 text-[13px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-black/45 focus:outline-none focus-visible:border-white/40"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('labels.back')}
          </button>
          <ProfileCoverActions address={address} />
        </div>
      </div>

      <div className="px-4 pb-4 md:px-6 md:pb-5">
        {/* Give the complete address the identity row's width at every breakpoint.
            Actions always sit below it, including on desktop. */}
        <div className="relative -mt-[30px] flex flex-col gap-3 md:-mt-11">
          <div className="flex min-w-0 items-center gap-3 md:flex-1 md:gap-4">
            <Avatar address={address} size={60} className="flex md:hidden" />
            <Avatar address={address} size={88} className="hidden md:flex" />
            <div className="min-w-0 flex-1">
              <ProfileIdentity
                address={address}
                displayName={displayName}
                handle={handle}
                isVerified={isVerified}
                verifiedUsername={verifiedUsername}
                bio={bio}
                site={site}
                ownProfile={ownProfile}
                onEditBio={onEditBio}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <ProfileSocialStats
              address={address}
              followersCount={followersCount}
              followingCount={followingCount}
              countsStatus={countsStatus}
              postsCount={postsCount}
              onPostsClick={onPostsClick}
              className="min-w-0 flex-wrap"
            />
            <div className="ml-auto max-w-full grow min-[480px]:grow-0">
              <ProfileActionBar
                address={address}
                ownProfile={ownProfile}
                onEdit={onEdit}
                onTip={onTip}
                errorSlotRef={errorSlotRef}
              />
            </div>
          </div>
        </div>

        {/* Follow / unfollow errors render full width here, under the header. */}
        <div ref={errorSlotRef as RefObject<HTMLDivElement>} className="mt-3 empty:mt-0" />
      </div>
    </section>
  );
};

export default ProfileHeaderCard;
