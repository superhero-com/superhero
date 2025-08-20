import React from 'react';
import styles from './MobileCard.module.scss';

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  clickable?: boolean;
  loading?: boolean;
  shadow?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  clickable = false,
  loading = false,
  shadow = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`mobile-card ${styles['mobile-card']} ${styles[variant]} ${styles[`padding-${padding}`]} ${clickable ? styles['clickable'] : ''} ${shadow ? styles['shadow'] : ''} ${loading ? styles['loading'] : ''} ${className}`}
      {...props}
    >
      {loading && (
        <div className={`mobile-card-loading ${styles['mobile-card-loading']}`}>
          <div className={`mobile-card-skeleton ${styles['mobile-card-skeleton']}`} />
        </div>
      )}
      <div className={`mobile-card-content ${styles['mobile-card-content']}`}>
        {children}
      </div>
    </div>
  );
};

export default MobileCard;
