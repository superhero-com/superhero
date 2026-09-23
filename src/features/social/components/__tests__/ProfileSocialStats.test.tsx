import { render, screen, fireEvent } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import ProfileSocialStats from '../ProfileSocialStats';

const openModal = vi.hoisted(() => vi.fn());
vi.mock('../../../../hooks', () => ({ useModal: () => ({ openModal }) }));

const ADDR = 'ak_alice0000000000000000000000000000000000000000000000';

describe('ProfileSocialStats', () => {
  it('keeps both labels and accessible loading indicators visible before counts arrive', () => {
    render(
      <ProfileSocialStats
        address={ADDR}
        followersCount={null}
        followingCount={null}
        postsCount={null}
      />,
    );
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading Followers' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading Following' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Followers/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Following/ })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('profile-followers-count')).not.toHaveTextContent('0');
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
    expect(screen.getByTestId('profile-following-count')).not.toHaveTextContent('0');
    expect(screen.getByRole('status', { name: 'Loading Following' })).toBeInTheDocument();
  });

  it('replaces spinners with real counts, retains them during refresh, and shows only dashes on failure', () => {
    const { rerender } = render(<ProfileSocialStats address={ADDR} countsStatus="loading" />);
    rerender(<ProfileSocialStats address={ADDR} countsStatus="ready" followersCount={1} followingCount={0} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: '1 Followers' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '0 Following' })).toBeEnabled();
    rerender(<ProfileSocialStats address={ADDR} countsStatus="loading" followersCount={1} followingCount={0} />);
    expect(screen.getByTestId('profile-followers-count')).toHaveTextContent('1');
    expect(screen.getByRole('status', { name: 'Loading Followers' })).toBeInTheDocument();
    rerender(<ProfileSocialStats address={ADDR} countsStatus="error" followersCount={1} followingCount={0} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('Counts unavailable')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByTestId('profile-followers-count')).toHaveTextContent(/^-$/);
    expect(screen.getByTestId('profile-following-count')).toHaveTextContent(/^-$/);
    expect(screen.getByRole('button', { name: '- Followers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '- Following' })).toBeDisabled();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
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
