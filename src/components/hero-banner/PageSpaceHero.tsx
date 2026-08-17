import React from 'react';
import SpaceEffects from './SpaceEffects';
import './banner.styles.css';
import './page-space-hero.css';

interface PageSpaceHeroProps {
  children: React.ReactNode;
  className?: string;
  /** Colour of the two nova bursts — pick one that suits the page accent. */
  supernovaColor?: string;
  /** Drop the heavier compositor layers (used automatically on iOS WebKit). */
  reduced?: boolean;
}

/**
 * A self-contained hero panel that reuses the expanded home-banner's cosmic
 * backdrop (drifting stars, aurora ribbon, nova bursts, orbiting-token planet
 * and signal grid) behind arbitrary page content. Unlike the carousel, it does
 * not tone the effects down, so the graphics read clearly on standalone pages.
 */
const PageSpaceHero = ({
  children,
  className = '',
  supernovaColor = 'rgba(122,92,255,.55)',
  reduced = false,
}: PageSpaceHeroProps) => {
  const isIOSWebKit = React.useMemo(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('ios-webkit');
  }, []);

  return (
    <div className={`page-space-hero ${isIOSWebKit ? 'page-space-hero--ios-safe' : ''} ${className}`}>
      <SpaceEffects supernovaColor={supernovaColor} reduced={reduced || isIOSWebKit} />
      <div className="page-space-hero__content">{children}</div>
    </div>
  );
};

export default PageSpaceHero;
