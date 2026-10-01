import { fireEvent, render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { ShortsLikeButton } from '../shorts-like-button';

describe('Animated Like feedback', () => {
  it('announces the exact count and celebrates only a new confirmed Like', () => {
    const onLike = vi.fn();
    const { container, rerender } = render(<ShortsLikeButton count={9} liked={false} disabled={false} onLike={onLike} />);
    expect(container.querySelector('.is-changing')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(onLike).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('9 Likes');
    rerender(<ShortsLikeButton count={10} liked disabled={false} onLike={onLike} />);
    expect(screen.getByRole('button', { name: 'Liked' })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('10 Likes');
    expect(container.querySelector('.sv-like-old')).toHaveTextContent('9');
    expect(container.querySelector('.sv-like-new')).toHaveTextContent('10');
    expect(container.querySelector('.sv-like-ring')).toBeInTheDocument();
    const digits = container.querySelector('.sv-like-digits');
    rerender(<ShortsLikeButton count={10} liked disabled={false} onLike={onLike} />);
    expect(container.querySelector('.sv-like-digits')).toBe(digits);
    rerender(<ShortsLikeButton count={11} liked disabled={false} onLike={onLike} />);
    expect(container.querySelector('.sv-like-old')).toHaveTextContent('10');
    expect(container.querySelector('.sv-like-new')).toHaveTextContent('11');
    expect(container.querySelector('.sv-like-ring')).toBeNull();
  });

  it('does not celebrate existing Likes and displays canonical decreases correctly', () => {
    const onLike = vi.fn();
    const { container, rerender } = render(<ShortsLikeButton count={2} liked disabled={false} onLike={onLike} />);
    expect(container.querySelector('.sv-like-pop')).toBeNull();
    rerender(<ShortsLikeButton count={1} liked={false} disabled onLike={onLike} />);
    expect(screen.getByRole('status')).toHaveTextContent('1 Like');
    expect(container.querySelector('.is-decreasing')).toBeInTheDocument();
    expect(container.querySelector('.sv-like-new')).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('button'));
    expect(onLike).not.toHaveBeenCalled();
  });
});
