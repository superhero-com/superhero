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
    className={`w-fit shrink-0 rounded-[20px] ring-[3px] ring-[var(--background-color)] bg-[var(--background-color)] ${className || ''}`}
  >
    <AddressAvatarWithChainName
      address={address}
      size={size}
      showAddressAndChainName={false}
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
        {/* Avatar overlaps the band and sits inline with the identity; the action
            bar shares the same row on desktop and drops below on mobile. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0 md:flex md:flex-1 md:items-center md:gap-4">
            <Avatar address={address} size={72} className="-mt-[36px] md:hidden" />
            <Avatar address={address} size={88} className="-mt-[44px] hidden md:block" />
            <div className="mt-3 min-w-0 md:mt-0">
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

          <ProfileActionBar
            address={address}
            ownProfile={ownProfile}
            onEdit={onEdit}
            onTip={onTip}
            errorSlotRef={errorSlotRef}
          />
        </div>

        <ProfileSocialStats
          address={address}
          followersCount={followersCount}
          followingCount={followingCount}
          postsCount={postsCount}
          onPostsClick={onPostsClick}
          className="mt-3"
        />

        {/* Follow / unfollow errors render full width here, under the header. */}
        <div ref={errorSlotRef as RefObject<HTMLDivElement>} className="mt-3 empty:mt-0" />
      </div>
    </section>
  );
};

export default ProfileHeaderCard;
