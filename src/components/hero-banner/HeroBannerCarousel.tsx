import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import BannerLanguages from './BannerLanguages';
import './banner.styles.css';
import './bannerLanguages.styles.css';

const DISMISS_KEY = 'hero_banner_dismissed_until';
const SLIDE_COUNT = 6;

interface HeroBannerCarouselProps {
  onStartPosting?: () => void;
}

/**
 * One line of collapsed text. When the text is too long to fit it slowly
 * scrolls to the end and back (ping-pong), with both edges faded so it reads
 * as "…text…". Short text that fits shows statically.
 */
const MarqueeText = ({ text }: { text: string }) => {
  const outerRef = React.useRef<HTMLSpanElement>(null);
  const innerRef = React.useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return undefined;
    const measure = () => {
      const overflow = inner.scrollWidth - outer.clientWidth;
      setDistance(overflow > 6 ? overflow : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text]);

  // Constant, readable scroll speed (~45px/s). The travel occupies ~41% of the
  // cycle each way, so scale the whole cycle with the overflow distance.
  const duration = Math.min(80, Math.max(16, Math.round(distance / 18)));

  return (
    <span
      ref={outerRef}
      className={`hero-collapsed__text ${distance ? 'is-marquee' : ''}`}
      style={distance ? ({
        '--marquee-x': `-${distance}px`,
        '--marquee-duration': `${duration}s`,
      } as React.CSSProperties) : undefined}
    >
      <span ref={innerRef} className="hero-collapsed__text-inner">{text}</span>
    </span>
  );
};

const HeroBannerCarousel = ({ onStartPosting }: HeroBannerCarouselProps = {}) => {
  const { t } = useTranslation();
  const { t: tSocial } = useTranslation('social');
  const { t: tBanners } = useTranslation('banners');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isIOSWebKit = React.useMemo(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('ios-webkit');
  }, []);

  // Fresh Autoplay instance every time we toggle between expanded/collapsed.
  // Reusing one instance across the mount/unmount churn leaves it pointing at a
  // destroyed Embla engine ("internalEngine undefined"), which is what made the
  // carousel mis-measure and peek after a few dismiss/expand cycles.
  const autoplayPlugin = React.useMemo(
    () => Autoplay({ delay: 10000, stopOnInteraction: false, stopOnLastSnap: false }),
    // `collapsed` is intentional: force a brand-new plugin each toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed],
  );

  const emblaPlugins = React.useMemo(() => [autoplayPlugin], [autoplayPlugin]);
  // loop must stay true: embla-carousel-autoplay's next() falls back to
  // `scrollTo(0)` once `canScrollNext()` is false, which without loop performs
  // a visible animated rewind back through every slide instead of wrapping.
  // (containScroll is a no-op once loop is on — embla only applies it when
  // `!loop`.)
  const emblaOptions = React.useMemo(() => ({
    loop: true,
    duration: 20,
    align: 'start' as const,
  }), []);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    emblaOptions,
    emblaPlugins,
  );

  // Separate carousel instance for the dismissed / collapsed one-line state,
  // so it keeps its own autoplay + swipe just like the expanded version. It
  // loops (stable with the centered peek layout) and dwells long enough on
  // each card to read the title before advancing.
  const collapsedAutoplay = React.useMemo(
    () => Autoplay({ delay: 12000, stopOnInteraction: false, stopOnLastSnap: false }),
    // `collapsed` is intentional: force a brand-new plugin each toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed],
  );
  const collapsedPlugins = React.useMemo(() => [collapsedAutoplay], [collapsedAutoplay]);
  const collapsedOptions = React.useMemo(() => ({
    loop: true,
    duration: 20,
    align: 'center' as const,
    containScroll: false as const,
  }), []);
  const [collapsedEmblaRef, collapsedEmblaApi] = useEmblaCarousel(
    collapsedOptions,
    collapsedPlugins,
  );
  const [collapsedIndex, setCollapsedIndex] = useState(0);

  // One-line version of every slide: title + its primary action as a text link.
  // Order mirrors the expanded carousel (last three slides moved to the front).
  const collapsedSlides = [
    {
      key: 'b',
      text: tBanners('bannerB.title'),
      cta: tBanners('bannerB.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'a',
      text: tBanners('bannerA.title'),
      cta: tBanners('bannerA.primaryButton'),
      onClick: onStartPosting,
    },
    {
      key: 'c',
      text: tBanners('bannerC.title'),
      cta: tBanners('bannerC.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'd',
      text: `${tBanners('bannerD.titleMain')} ${tBanners('bannerD.titleAccent')}`,
      cta: tBanners('bannerD.primaryButton'),
      link: '/landing',
    },
    {
      key: 'languages',
      badge: tSocial('feedAnnouncement.new'),
      text: tBanners('bannerLanguages.title'),
      cta: tBanners('bannerLanguages.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'new',
      badge: tSocial('feedAnnouncement.new'),
      text: tSocial('feedAnnouncement.text'),
      // installNow already ends in "→" for standalone use; strip it here since
      // .hero-collapsed__link::after appends its own arrow to every CTA.
      cta: tSocial('feedAnnouncement.installNow').replace(/\s*→\s*$/, ''),
      link: '/landing',
    },
  ];

  // Check if banner was dismissed (collapsed to the one-line bar), and keep it
  // in sync with *other* tabs via `storage` (which only ever fires in tabs
  // other than the one that wrote to localStorage — never this one — so it
  // can't race with this tab's own optimistic setCollapsed call below). Do NOT
  // also listen for our own heroBannerDismissed/heroBannerExpanded events
  // here: those fire in this same tab right after handleDismiss/handleExpand
  // already set `collapsed` optimistically, so re-deriving from localStorage
  // at that point would flip it right back if the write itself had failed
  // (private-mode storage, quota, etc.), undoing the action the user just took.
  useEffect(() => {
    const checkDismissed = () => {
      try {
        const until = localStorage.getItem(DISMISS_KEY);
        if (!until) {
          setCollapsed(false);
          return;
        }
        const ts = Date.parse(until);
        setCollapsed(!Number.isNaN(ts) && ts > Date.now());
      } catch {
        // Ignore localStorage read failures
      }
    };

    checkDismissed();

    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISS_KEY || e.key === null) checkDismissed();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
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

    // Start autoplay once emblaApi is ready
    emblaApi.plugins()?.autoplay?.play();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Track the centered slide in the collapsed carousel (for the active/dim state)
  useEffect(() => {
    if (!collapsedEmblaApi) {
      return () => {};
    }
    const onSelect = () => setCollapsedIndex(collapsedEmblaApi.selectedScrollSnap());
    collapsedEmblaApi.on('select', onSelect);
    onSelect();

    // Start collapsed autoplay once emblaApi is ready
    collapsedEmblaApi.plugins()?.autoplay?.play();

    return () => {
      collapsedEmblaApi.off('select', onSelect);
    };
  }, [collapsedEmblaApi]);

  // Carries the active slide index across a collapse/expand toggle (set by
  // handleDismiss/handleExpand just before switching). The expanded and
  // collapsed slide orders match (b, a, c, d, languages, new), so the index
  // maps over directly.
  const pendingIndexRef = React.useRef<number | null>(null);

  // After a collapse/expand toggle the carousel is freshly mounted; re-measure
  // it on the next frame (once it has real layout) and re-snap to the carried-
  // over slide (falling back to the fresh instance's own index, e.g. on the
  // initial dismissed-on-mount check) so it never rests a few px off, peeking
  // the neighbours, and never resets the user back to slide 0.
  useEffect(() => {
    const api = collapsed ? collapsedEmblaApi : emblaApi;
    if (!api) return undefined;
    const idx = pendingIndexRef.current ?? api.selectedScrollSnap();
    pendingIndexRef.current = null;
    const raf = requestAnimationFrame(() => {
      api.reInit();
      api.scrollTo(idx, true);
    });
    return () => cancelAnimationFrame(raf);
  }, [collapsed, emblaApi, collapsedEmblaApi]);

  // Pause on hover — read the live plugin from the API so it always targets the
  // current engine, not a stale instance from a previous mount.
  const handleMouseEnter = useCallback(() => {
    emblaApi?.plugins()?.autoplay?.stop();
  }, [emblaApi]);

  const handleMouseLeave = useCallback(() => {
    emblaApi?.plugins()?.autoplay?.play();
  }, [emblaApi]);

  const handleCollapsedMouseEnter = useCallback(() => {
    collapsedEmblaApi?.plugins()?.autoplay?.stop();
  }, [collapsedEmblaApi]);

  const handleCollapsedMouseLeave = useCallback(() => {
    collapsedEmblaApi?.plugins()?.autoplay?.play();
  }, [collapsedEmblaApi]);

  const handleDismiss = () => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      localStorage.setItem(DISMISS_KEY, expiresAt.toISOString());
    } catch {
      // Ignore localStorage write failures
    }
    pendingIndexRef.current = emblaApi ? emblaApi.selectedScrollSnap() : null;
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
    pendingIndexRef.current = collapsedEmblaApi ? collapsedEmblaApi.selectedScrollSnap() : null;
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
      <div
        className="hero-collapsed"
        onMouseEnter={handleCollapsedMouseEnter}
        onMouseLeave={handleCollapsedMouseLeave}
      >
        <div className="hero-collapsed__viewport" ref={collapsedEmblaRef}>
          <div className="hero-collapsed__container">
            {collapsedSlides.map((slide, index) => (
              <div
                className={`hero-collapsed__slide ${index === collapsedIndex ? 'is-active' : ''}`}
                key={slide.key}
              >
                {slide.badge && (
                  <span className="hero-collapsed__badge">
                    <Sparkles aria-hidden="true" />
                    {slide.badge}
                  </span>
                )}
                <MarqueeText text={slide.text} />
                {slide.onClick ? (
                  <button
                    type="button"
                    onClick={slide.onClick}
                    className="hero-collapsed__link"
                  >
                    {slide.cta}
                  </button>
                ) : (
                  <Link to={slide.link} className="hero-collapsed__link">
                    {slide.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
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
              <BannerB />
            </div>
            <div className="hero-banner__slide">
              <BannerA onStartPosting={onStartPosting} />
            </div>
            <div className="hero-banner__slide">
              <BannerC />
            </div>
            <div className="hero-banner__slide">
              <BannerD />
            </div>
            <div className="hero-banner__slide">
              <BannerLanguages />
            </div>
            <div className="hero-banner__slide">
              <BannerNew />
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
