import { type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModal } from '../../../hooks';

interface ProfileSocialStatsProps {
  address: string;
  followersCount?: number | null;
  followingCount?: number | null;
  countsStatus?: 'loading' | 'ready' | 'error';
  postsCount?: number | null;
  onPostsClick?: () => void;
  className?: string;
}

const ProfileSocialStats = ({
  address, followersCount, followingCount, countsStatus,
  postsCount, onPostsClick, className = '',
}: ProfileSocialStatsProps) => {
  const { t } = useTranslation('common');
  const { openModal } = useModal();

  const hasFollowers = typeof followersCount === 'number';
  const hasFollowing = typeof followingCount === 'number';
  const hasPosts = typeof postsCount === 'number';
  const failed = countsStatus === 'error';
  const loading = countsStatus === 'loading' || (!countsStatus && (!hasFollowers || !hasFollowing));

  const open = (initialTab: 'followers' | 'following') => openModal({
    name: 'follow-connections',
    props: {
      address, initialTab, followersCount, followingCount,
    },
  });

  const segment = (
    count: number | null | undefined,
    label: string,
    testid: string,
    onClick: () => void,
    graph = false,
  ) => {
    let value = typeof count === 'number' ? count.toLocaleString() : null;
    if (graph && failed) value = '-';
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={graph && (typeof count !== 'number' || failed)}
        aria-busy={graph && loading}
        aria-label={value === null ? label : `${value} ${label}`}
        className="group flex items-center gap-1.5 px-1 -mx-1 py-3 -my-3 underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:underline disabled:no-underline disabled:cursor-default"
      >
        <span
          className="text-[15px] font-extrabold text-white tabular-nums"
          data-testid={testid}
        >
          {value}
          {graph && loading && (
          <span role="status" aria-label={t('socialGraph.counts.loading', { label })} className="inline-flex align-middle ml-0.5">
            <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
          </span>
          )}
        </span>
        <span className="text-[13px] text-white/55">
          {label}
        </span>
      </button>
    );
  };

  const divider = <span className="h-3.5 w-px bg-white/15" aria-hidden />;

  const segments: ReactElement[] = [];
  segments.push(segment(
    followersCount,
    t('socialGraph.followers'),
    'profile-followers-count',
    () => open('followers'),
    true,
  ));
  segments.push(segment(
    followingCount,
    t('socialGraph.followingCount'),
    'profile-following-count',
    () => open('following'),
    true,
  ));
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
