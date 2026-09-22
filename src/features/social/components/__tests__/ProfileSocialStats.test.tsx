import { render, screen, fireEvent } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import ProfileSocialStats from '../ProfileSocialStats';

const openModal = vi.hoisted(() => vi.fn());
vi.mock('../../../../hooks', () => ({ useModal: () => ({ openModal }) }));

const ADDR = 'ak_alice0000000000000000000000000000000000000000000000';

describe('ProfileSocialStats', () => {
  it('renders nothing when every count is null', () => {
    const { container } = render(
      <ProfileSocialStats
        address={ADDR}
        followersCount={null}
        followingCount={null}
        postsCount={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the Posts segment from the passed total, not a page length', () => {
    render(<ProfileSocialStats address={ADDR} postsCount={284} />);
    const posts = screen.getByTestId('profile-posts-count');
    expect(posts).toHaveTextContent('284');
    expect(screen.getByText('Posts')).toBeInTheDocument();
  });

  it('shows a zero count but never invents one for a null', () => {
    render(<ProfileSocialStats address={ADDR} followersCount={0} followingCount={null} />);
    expect(screen.getByTestId('profile-followers-count')).toHaveTextContent('0');
    expect(screen.queryByTestId('profile-following-count')).toBeNull();
  });

  it('opens the followers list and fires the posts callback', () => {
    const onPostsClick = vi.fn();
    render(
      <ProfileSocialStats
        address={ADDR}
        followersCount={1284}
        followingCount={312}
        postsCount={96}
        onPostsClick={onPostsClick}
      />,
    );
    fireEvent.click(screen.getByTestId('profile-followers-count'));
    expect(openModal).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'follow-connections' }),
    );
    fireEvent.click(screen.getByTestId('profile-posts-count'));
    expect(onPostsClick).toHaveBeenCalledTimes(1);
  });
});
