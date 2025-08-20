import React from 'react';
import './MobileDexCard.scss';

interface MobileDexCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export default function MobileDexCard({
  title,
  subtitle,
  children,
  variant = 'default',
  padding = 'medium',
  clickable = false,
  onClick,
  loading = false,
  className = '',
}: MobileDexCardProps) {
  const cardClasses = [
    'mobile-dex-card',
    `mobile-dex-card--${variant}`,
    `mobile-dex-card--${padding}`,
    clickable ? 'mobile-dex-card--clickable' : '',
    loading ? 'mobile-dex-card--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (clickable && onClick && !loading) {
      onClick();
    }
  };

  return (
    <div className={cardClasses} onClick={handleClick}>
      {(title || subtitle) && (
        <div className="mobile-dex-card__header">
          {title && <h3 className="mobile-dex-card__title">{title}</h3>}
          {subtitle && <p className="mobile-dex-card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="mobile-dex-card__content">
        {loading ? (
          <div className="mobile-dex-card__skeleton">
            <div className="skeleton-line skeleton-line--short"></div>
            <div className="skeleton-line skeleton-line--medium"></div>
            <div className="skeleton-line skeleton-line--long"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
