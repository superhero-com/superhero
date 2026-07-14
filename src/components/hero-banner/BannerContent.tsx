import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BannerContentProps {
  title: React.ReactNode;
  description: React.ReactNode;
  chips?: string[];
  graphic?: React.ReactNode;
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
  graphic,
  primaryButtonText,
  primaryButtonLink,
  primaryButtonOnClick,
  secondaryButtonText,
  secondaryButtonLink,
}: BannerContentProps) => {
  const { t } = useTranslation('banners');
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
          <h1 className="banner-h1">{renderTitle()}</h1>
          <p className="banner-lede">{description}</p>

          {chips && chips.length > 0 && (
            <ul className="banner-chips" aria-label={t('keyFeatures')}>
              {chips.map((chip) => (
                <li key={chip} className="banner-chip">
                  {chip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {graphic && <div className="banner-layout__graphic">{graphic}</div>}
      </div>

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
  );
};

export default BannerContent;
