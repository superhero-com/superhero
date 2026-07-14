import React from 'react';
import { Link } from 'react-router-dom';

interface BannerContentProps {
  eyebrow?: string;
  title: React.ReactNode;
  description: React.ReactNode;
  graphic?: React.ReactNode;
  primaryButtonText: string;
  primaryButtonLink?: string;
  primaryButtonOnClick?: () => void;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

const BannerContent = ({
  eyebrow,
  title,
  description,
  graphic,
  primaryButtonText,
  primaryButtonLink,
  primaryButtonOnClick,
  secondaryButtonText,
  secondaryButtonLink,
}: BannerContentProps) => {
  const renderTitle = () => {
    if (typeof title !== 'string') return title;
    // Insert a mobile-only line break after the first period
    const parts = title.split('. ');
    if (parts.length <= 1) return title;
    const first = parts.shift() as string;
    const rest = parts.join('. ');
    return (
      <>
        {first}
        .
        <br className="mobile-break" />
        {rest}
      </>
    );
  };

  return (
    <div className="banner-layout">
      <div className="banner-layout__top">
        <div className="banner-layout__text">
          {eyebrow && <span className="banner-eyebrow">{eyebrow}</span>}
          <h1 className="banner-h1">{renderTitle()}</h1>
          <p className="banner-lede">{description}</p>

          <div className="banner-cta banner-layout__actions">
            {primaryButtonOnClick ? (
              <button
                type="button"
                onClick={primaryButtonOnClick}
                className="banner-btn banner-btn--primary"
              >
                {primaryButtonText}
              </button>
            ) : (
              <Link to={primaryButtonLink || '#'} className="banner-btn banner-btn--primary">
                {primaryButtonText}
              </Link>
            )}
            <Link to={secondaryButtonLink} className="banner-btn banner-btn--ghost">
              {secondaryButtonText}
            </Link>
          </div>
        </div>

        {graphic && <div className="banner-layout__graphic">{graphic}</div>}
      </div>
    </div>
  );
};

export default BannerContent;
