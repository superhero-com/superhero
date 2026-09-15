import { useTranslation } from 'react-i18next';
import { useModal } from '../../../hooks';

interface ProfileSocialStatsProps {
  address: string;
  followersCount?: number | null;
  followingCount?: number | null;
  className?: string;
}

/**
 * Followers and following presented as one integrated inline unit that reads as
 * part of the profile identity — a count over its label, the two joined by a
 * hairline divider. Each segment opens the connections list for its tab. A
 * segment is omitted when its count is absent (social graph unavailable); the
 * whole unit renders nothing when neither count is present.
 */
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
    props: { address, initialTab },
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
      className="group flex items-baseline gap-1.5 rounded-md px-1 -mx-1 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-teal)]/50"
    >
      <span
        className="text-sm font-bold text-white tabular-nums group-hover:text-[var(--neon-teal)] transition-colors"
        data-testid={testid}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[13px] text-white/55 group-hover:text-white/80 transition-colors">
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
