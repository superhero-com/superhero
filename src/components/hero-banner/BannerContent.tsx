import React from 'react';
import { Link } from 'react-router-dom';

interface BannerContentProps {
  title: string;
  description: string;
  chips: string[];
  primaryButtonText: string;
  primaryButtonLink?: string;
  primaryButtonOnClick?: () => void;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

const BannerContent = ({
  title,
  description,
  chips,
  primaryButtonText,
  primaryButtonLink,
  primaryButtonOnClick,
  secondaryButtonText,
  secondaryButtonLink,
}: BannerContentProps) => {
  const renderTitle = () => {
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
    <div className="hero-banner__inner">
      <h1 className="banner-h1">{renderTitle()}</h1>
      <p className="banner-lede">{description}</p>

      <ul className="banner-chips" aria-label="Key features">
        {chips.map((chip) => (
          <li key={chip} className="banner-chip">
            {chip}
          </li>
        ))}
      </ul>

      <div className="banner-cta">
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
  );
};

export default BannerContent;
