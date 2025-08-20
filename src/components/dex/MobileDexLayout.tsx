import React from 'react';
import './MobileDexLayout.scss';

interface MobileDexLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function MobileDexLayout({
  children,
  title,
  subtitle,
  className = '',
}: MobileDexLayoutProps) {
  return (
    <div className={`mobile-dex-layout ${className}`}>
      {(title || subtitle) && (
        <div className="mobile-dex-layout__header">
          {title && <h1 className="mobile-dex-layout__title">{title}</h1>}
          {subtitle && <p className="mobile-dex-layout__subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="mobile-dex-layout__content">
        {children}
      </div>
    </div>
  );
}
