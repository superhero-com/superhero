import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { shortsPricing, type ShortsPricing } from './shorts-pricing';

export const ShortsLikeButton = ({
  count, liked, disabled, onLike, pricing,
}: {
  count: number; liked: boolean; disabled: boolean; onLike: () => void;
  pricing?: ShortsPricing;
}) => {
  const payment = shortsPricing(pricing);
  const availableLabel = payment ? `Like for ${payment.price}` : 'Likes temporarily unavailable';
  const previous = useRef({ count, liked });
  const [motion, setMotion] = useState({ from: count, to: count, celebrate: false });
  useEffect(() => {
    if (previous.current.count === count && previous.current.liked === liked) return;
    setMotion({ from: previous.current.count, to: count, celebrate: liked && !previous.current.liked });
    previous.current = { count, liked };
  }, [count, liked]);
  const changing = motion.to === count && motion.from !== count;
  return (
    <div className="sv-action sv-like-action">
      <div className="sv-like-heart" key={liked ? 'liked' : 'unliked'}>
        <button
          type="button"
          className={`sv-action-button ${liked ? 'is-liked' : ''} ${motion.celebrate ? 'sv-like-pop' : ''}`}
          aria-label={liked ? 'Liked' : availableLabel}
          aria-pressed={liked}
          disabled={disabled || liked || !payment}
          onClick={onLike}
        >
          <Heart size={25} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        {motion.celebrate && liked && <span className="sv-like-ring" aria-hidden="true" />}
      </div>
      <strong className="sv-like-count" role="status" aria-live="polite" aria-atomic="true">
        <span className="sv-sr-only">
          {count}
          {' '}
          {count === 1 ? 'Like' : 'Likes'}
        </span>
        <span
          key={count}
          className={`sv-like-digits ${changing ? 'is-changing' : ''} ${motion.from > count ? 'is-decreasing' : ''}`}
          aria-hidden="true"
        >
          {changing && <span className="sv-like-old">{motion.from}</span>}
          <span className="sv-like-new">{count}</span>
        </span>
      </strong>
      <span>{liked ? 'Liked' : payment?.price || 'Unavailable'}</span>
    </div>
  );
};
