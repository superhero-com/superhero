import React from "react";
import { Link } from "react-router-dom";

interface BannerContentProps {
  title: string;
  description: string;
  chips: string[];
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

export default function BannerContent({
  title,
  description,
  chips,
  primaryButtonText,
  primaryButtonLink,
  secondaryButtonText,
  secondaryButtonLink,
}: BannerContentProps) {
  return (
    <div className="hero-banner__inner">
      <h1 className="banner-h1">{title}</h1>
      <p className="banner-lede">{description}</p>

      <ul className="banner-chips" aria-label="Key features">
        {chips.map((chip, index) => (
          <li key={index} className="banner-chip">
            {chip}
          </li>
        ))}
      </ul>

      <div className="banner-cta">
        <Link to={primaryButtonLink} className="banner-btn banner-btn--primary">
          {primaryButtonText}
        </Link>
        <Link to={secondaryButtonLink} className="banner-btn banner-btn--ghost">
          {secondaryButtonText}
        </Link>
      </div>

      <p className="banner-micro">Popularity game • Information market • Purpose-DAOs</p>
    </div>
  );
}

