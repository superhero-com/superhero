import { useTranslation } from 'react-i18next';
import { useModal } from '../../../hooks';

interface ProfileSocialStatsProps {
  address: string;
  followersCount?: number | null;
  followingCount?: number | null;
  className?: string;
}

const ProfileSocialStats = ({
  address, followersCount, followingCount, className = '',
}: ProfileSocialStatsProps) => {
  const { t } = useTranslation('common');
  const { openModal } = useModal();

  const hasFollowers = typeof followersCount === 'number';
  const hasFollowing = typeof followingCount === 'number';
  if (!hasFollowers && !hasFollowing) return null;

  const open = (initialTab: 'followers' | 'following') => openModal({
    name: 'follow-connections',
    props: {
      address, initialTab, followersCount, followingCount,
    },
  });

  const segment = (
    count: number,
    label: string,
    tab: 'followers' | 'following',
    testid: string,
  ) => (
    <button
      type="button"
      onClick={() => open(tab)}
      aria-haspopup="dialog"
      className="group flex items-baseline gap-1.5 px-1 -mx-1 py-3 -my-3 underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:underline"
    >
      <span
        className="text-sm font-bold text-white tabular-nums"
        data-testid={testid}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[13px] text-white/55">
        {label}
      </span>
    </button>
  );

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      data-testid="profile-social-stats"
    >
      {hasFollowers && segment(
        followersCount as number,
        t('socialGraph.followers'),
        'followers',
        'profile-followers-count',
      )}
      {hasFollowers && hasFollowing && (
        <span className="h-3.5 w-px bg-white/15" aria-hidden />
      )}
      {hasFollowing && segment(
        followingCount as number,
        t('socialGraph.followingCount'),
        'following',
        'profile-following-count',
      )}
    </div>
  );
};

export default ProfileSocialStats;
