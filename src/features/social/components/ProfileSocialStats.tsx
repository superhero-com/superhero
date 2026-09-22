import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../../../hooks';

interface ProfileSocialStatsProps {
  address: string;
  followersCount?: number | null;
  followingCount?: number | null;
  postsCount?: number | null;
  onPostsClick?: () => void;
  className?: string;
}

const ProfileSocialStats = ({
  address, followersCount, followingCount, postsCount, onPostsClick, className = '',
}: ProfileSocialStatsProps) => {
  const { t } = useTranslation('common');
  const { openModal } = useModal();

  const hasFollowers = typeof followersCount === 'number';
  const hasFollowing = typeof followingCount === 'number';
  const hasPosts = typeof postsCount === 'number';
  // A null count renders nothing — never a zero, never a dash.
  if (!hasFollowers && !hasFollowing && !hasPosts) return null;

  const open = (initialTab: 'followers' | 'following') => openModal({
    name: 'follow-connections',
    props: {
      address, initialTab, followersCount, followingCount,
    },
  });

  const segment = (
    count: number,
    label: string,
    testid: string,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-baseline gap-1.5 px-1 -mx-1 py-3 -my-3 underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:underline"
    >
      <span
        className="text-[15px] font-extrabold text-white tabular-nums"
        data-testid={testid}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[13px] text-white/55">
        {label}
      </span>
    </button>
  );

  const divider = <span className="h-3.5 w-px bg-white/15" aria-hidden />;

  const segments: ReactElement[] = [];
  if (hasFollowers) {
    segments.push(segment(
      followersCount as number,
      t('socialGraph.followers'),
      'profile-followers-count',
      () => open('followers'),
    ));
  }
  if (hasFollowing) {
    segments.push(segment(
      followingCount as number,
      t('socialGraph.followingCount'),
      'profile-following-count',
      () => open('following'),
    ));
  }
  if (hasPosts) {
    segments.push(segment(
      postsCount as number,
      t('socialGraph.posts'),
      'profile-posts-count',
      () => onPostsClick?.(),
    ));
  }

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      data-testid="profile-social-stats"
    >
      {segments.map((seg, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && divider}
          {seg}
        </span>
      ))}
    </div>
  );
};

export default ProfileSocialStats;
