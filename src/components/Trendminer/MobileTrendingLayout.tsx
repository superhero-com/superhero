import React from 'react';
import './MobileTrendingLayout.scss';

interface MobileTrendingLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function MobileTrendingLayout({
  children,
  title,
  subtitle,
  className = '',
}: MobileTrendingLayoutProps) {
  return (
    <div className={`mobile-trending-layout ${className}`}>
      {(title || subtitle) && (
        <div className="mobile-trending-layout__header">
          {title && <h1 className="mobile-trending-layout__title">{title}</h1>}
          {subtitle && <p className="mobile-trending-layout__subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="mobile-trending-layout__content">
        {children}
      </div>
    </div>
  );
}
