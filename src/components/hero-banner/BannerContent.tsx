import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Diamond } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface BannerContentProps {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  graphic: React.ReactNode;
  icon?: LucideIcon;
  primaryButtonText: string;
  primaryButtonLink?: string;
  primaryButtonOnClick?: () => void;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

const BannerContent = ({
  eyebrow, title, accent, description, graphic, icon: Icon = Diamond,
  primaryButtonText, primaryButtonLink, primaryButtonOnClick,
  secondaryButtonText, secondaryButtonLink,
}: BannerContentProps) => (
  <article className="hero-slide">
    <div className="hero-slide__body">
      <div className="hero-slide__copy">
        <div className="hero-slide__eyebrow">
          <span className="hero-slide__badge"><Icon aria-hidden="true" /></span>
          <span>{eyebrow}</span>
        </div>
        <h2>
          {title}
          {' '}
          <span>{accent}</span>
        </h2>
        <p>{description}</p>
        <div className="hero-slide__actions">
          {primaryButtonOnClick ? (
            <button type="button" onClick={primaryButtonOnClick} className="hero-slide__primary">
              {primaryButtonText}
              <ArrowUpRight aria-hidden="true" />
            </button>
          ) : (
            <Link to={primaryButtonLink || '#'} className="hero-slide__primary">
              {primaryButtonText}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          )}
          <Link to={secondaryButtonLink} className="hero-slide__secondary">
            {secondaryButtonText}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      {graphic}
    </div>
  </article>
);

export default BannerContent;
