import { type RefObject } from 'react';
// eslint-disable-next-line import/no-named-as-default
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import ProfileActionBar from './ProfileActionBar';
import ProfileBand from './ProfileBand';
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
    className={`w-fit rounded-[20px] ring-[3px] ring-[var(--background-color)] bg-[var(--background-color)] ${className || ''}`}
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

/** Blocks 1-4 as one card: band -> identity -> counts -> action bar. */
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
  onEdit,
  onEditBio,
  onTip,
  onPostsClick,
  errorSlotRef,
}: ProfileHeaderCardProps) => (
  <section
    data-testid="profile-header-card"
    className="mb-4 overflow-hidden rounded-2xl border border-solid border-white/10 bg-white/[0.02]"
  >
    <ProfileBand address={address} className="h-[86px] md:h-[132px]" />

    <div className="px-4 pb-4 md:px-6 md:pb-5">
      {/* Avatar overlaps the band; identity and action bar sit below it. */}
      <Avatar address={address} size={72} className="-mt-[36px] md:hidden" />
      <Avatar address={address} size={88} className="-mt-[44px] hidden md:block" />

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 md:flex-1">
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
          <ProfileSocialStats
            address={address}
            followersCount={followersCount}
            followingCount={followingCount}
            postsCount={postsCount}
            onPostsClick={onPostsClick}
            className="mt-3"
          />
        </div>

        <ProfileActionBar
          address={address}
          ownProfile={ownProfile}
          onEdit={onEdit}
          onTip={onTip}
          errorSlotRef={errorSlotRef}
        />
      </div>

      {/* Follow / unfollow errors render full width here, under the header. */}
      <div ref={errorSlotRef as RefObject<HTMLDivElement>} className="mt-3 empty:mt-0" />
    </div>
  </section>
);

export default ProfileHeaderCard;
