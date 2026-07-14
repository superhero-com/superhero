import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Sparkles } from 'lucide-react';
import SpaceEffects from './SpaceEffects';
import BannerNew from './BannerNew';
import BannerA from './BannerA';
import BannerB from './BannerB';
import BannerC from './BannerC';
import BannerD from './BannerD';
import './banner.styles.css';

const DISMISS_KEY = 'hero_banner_dismissed_until';
const SLIDE_COUNT = 5;

interface HeroBannerCarouselProps {
  onStartPosting?: () => void;
}

const HeroBannerCarousel = ({ onStartPosting }: HeroBannerCarouselProps = {}) => {
  const { t } = useTranslation();
  const { t: tSocial } = useTranslation('social');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isIOSWebKit = React.useMemo(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('ios-webkit');
  }, []);

  const autoplayPlugin = React.useRef(
    isIOSWebKit ? null : Autoplay({ delay: 8000, stopOnInteraction: false }),
  );

  const emblaPlugins = React.useMemo(() => (
    autoplayPlugin.current ? [autoplayPlugin.current] : []
  ), []);
  const emblaOptions = React.useMemo(() => ({
    loop: !isIOSWebKit,
    duration: isIOSWebKit ? 16 : 20,
    align: 'start' as const,
    containScroll: 'trimSnaps' as const,
  }), [isIOSWebKit]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    emblaOptions,
    emblaPlugins,
  );

  // Check if banner was dismissed (collapsed to the one-line bar)
  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (!until) return;
      const ts = Date.parse(until);
      if (!Number.isNaN(ts) && ts > Date.now()) setCollapsed(true);
    } catch {
      // Ignore localStorage read failures
    }
  }, []);

  // Update selected index when carousel changes
  useEffect(() => {
    if (!emblaApi) {
      return () => {};
    }

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Pause on hover
  const handleMouseEnter = useCallback(() => {
    if (autoplayPlugin.current) {
      autoplayPlugin.current.stop();
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (autoplayPlugin.current) {
      autoplayPlugin.current.play();
    }
  }, []);

  const handleDismiss = () => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      localStorage.setItem(DISMISS_KEY, expiresAt.toISOString());
    } catch {
      // Ignore localStorage write failures
    }
    setCollapsed(true);
    // Dispatch custom event so parent components can react
    window.dispatchEvent(new CustomEvent('heroBannerDismissed'));
  };

  const handleExpand = () => {
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // Ignore localStorage write failures
    }
    setCollapsed(false);
    window.dispatchEvent(new CustomEvent('heroBannerExpanded'));
  };

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  if (collapsed) {
    return (
      <div className="hero-collapsed">
        <span className="hero-collapsed__badge">
          <Sparkles aria-hidden="true" />
          {tSocial('feedAnnouncement.new')}
        </span>
        <span className="hero-collapsed__text">{tSocial('feedAnnouncement.text')}</span>
        <a href="/landing" className="hero-collapsed__link">
          {tSocial('feedAnnouncement.installNow')}
        </a>
        <button
          type="button"
          onClick={handleExpand}
          className="hero-collapsed__expand"
          aria-label={t('common.heroBanner.expandAria', 'Show banner')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="hero-banner-carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <section
        className={`hero-banner ${isIOSWebKit ? 'hero-banner--ios-safe' : ''}`}
        style={{
          background:
            'radial-gradient(1100px 520px at 85% -20%, rgba(0,229,255,.24), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #080c1c, #1b0c36, #0d0b28)',
        }}
        aria-label={t('common.heroBanner.bannerAria')}
      >
        <SpaceEffects
          supernovaColor="rgba(255,94,188,.55)"
          reduced={isIOSWebKit}
        />

        <div className="hero-banner__viewport" ref={emblaRef}>
          <div className="hero-banner__container">
            <div className="hero-banner__slide">
              <BannerNew />
            </div>
            <div className="hero-banner__slide">
              <BannerA onStartPosting={onStartPosting} />
            </div>
            <div className="hero-banner__slide">
              <BannerB />
            </div>
            <div className="hero-banner__slide">
              <BannerC />
            </div>
            <div className="hero-banner__slide">
              <BannerD />
            </div>
          </div>
        </div>
      </section>

      {/* Dismiss — text link (collapses to a one-line announcement) */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.heroBanner.dismissAria')}
        className="banner-dismiss"
      >
        {t('common.heroBanner.dismiss', 'Dismiss')}
      </button>

      {/* Navigation arrows */}
      <button
        type="button"
        onClick={scrollPrev}
        className="carousel-arrow carousel-arrow--prev"
        aria-label={t('common.heroBanner.previousSlide')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={scrollNext}
        className="carousel-arrow carousel-arrow--next"
        aria-label={t('common.heroBanner.nextSlide')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="carousel-controls">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => i).map((index) => (
          <button
            type="button"
            key={index}
            onClick={() => scrollTo(index)}
            className={`carousel-dot ${selectedIndex === index ? 'active' : ''}`}
            aria-label={t('common.heroBanner.goToSlide', { number: index + 1 })}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBannerCarousel;
