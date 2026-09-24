import {
  useEffect, useId, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight, Box, Droplets, MessageCircle, Pause, Play, Rocket, Search, Zap,
} from 'lucide-react';
import './QuickActionsCard.css';

const actions = [
  {
    key: 'exploreTrends', to: '/trends/tokens', title: 'exploreTrends', tone: 'explore', Icon: Search,
  },
  {
    key: 'tokenizeATrend', to: '/trends/create', title: 'tokenizeATrend', tone: 'create', Icon: Rocket,
  },
  {
    key: 'swapTokens', to: '/defi/swap', title: 'swapTokensOnDex', tone: 'swap', Icon: ArrowLeftRight,
  },
  {
    key: 'wrapAe', to: '/defi/wrap', title: 'wrapOrUnwrapAe', tone: 'wrap', Icon: Box,
  },
  {
    key: 'chat', to: 'https://quali.chat', title: 'openChat', tone: 'chat', Icon: MessageCircle,
  },
  {
    key: 'provideLiquidity', to: '/defi/pool', title: 'provideLiquidityToPools', tone: 'pool', Icon: Droplets,
  },
] as const;

const QuickActionsCard = () => {
  const { t } = useTranslation('common');
  const headingId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const motionLabel = t(motionPaused ? 'rightRail.resumeMotion' : 'rightRail.pauseMotion');

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={cardRef}
      className={[
        'quick-actions-card',
        hasEntered ? 'quick-actions-card--entered' : '',
        motionPaused ? 'quick-actions-card--paused' : '',
      ].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      <div className="quick-actions-card__heading">
        <span className="quick-actions-card__heading-mark" aria-hidden="true">
          <Zap />
        </span>
        <h4 id={headingId}>{t('rightRail.quickActions')}</h4>
        <span className="quick-actions-card__heading-line" aria-hidden="true" />
        <button
          type="button"
          className="quick-actions-card__motion-toggle"
          aria-label={motionLabel}
          title={motionLabel}
          onClick={() => setMotionPaused((paused) => !paused)}
        >
          {motionPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      </div>
      <div className="quick-actions-card__grid">
        {actions.map(({
          key, to, title, tone, Icon,
        }) => {
          const className = `quick-actions-card__action quick-actions-card__action--${tone}`;
          const content = (
            <>
              <span className="quick-actions-card__sheen" aria-hidden="true" />
              <span className="quick-actions-card__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="quick-actions-card__label">{t(`rightRail.${key}`)}</span>
            </>
          );

          return to.startsWith('https://') ? (
            <a
              key={key}
              href={to}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              title={t(`titles.${title}`)}
            >
              {content}
            </a>
          ) : (
            <Link key={key} to={to} className={className} title={t(`titles.${title}`)}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActionsCard;
