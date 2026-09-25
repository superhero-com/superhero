import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Bot, ChevronLeft, ChevronRight, Globe2, Hash, MessageCircle, Smartphone, Sparkles, Users,
} from 'lucide-react';
import BannerNew from './BannerNew';
import BannerA from './BannerA';
import BannerB from './BannerB';
import BannerC from './BannerC';
import BannerD from './BannerD';
import BannerLanguages from './BannerLanguages';
import './banner.styles.css';
import '../layout/RailCards.css';
import './HeroCarousel.css';

const DISMISS_KEY = 'hero_banner_dismissed_until';
const SLIDE_KEYS = ['bannerB', 'bannerA', 'bannerC', 'bannerD', 'bannerLanguages', 'bannerNew'];
const SLIDE_ICONS = [Hash, MessageCircle, Users, Bot, Globe2, Smartphone];
const LANGUAGE_COLLECTIONS = [
  { label: 'English', collection: 'WORDS', lang: 'en' },
  { label: '中文', collection: 'CHINESE', lang: 'zh' },
  { label: 'Русский', collection: 'RUSSIAN', lang: 'ru' },
  { label: 'العربية', collection: 'ARABIC', lang: 'ar' },
];

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
  const { t, i18n } = useTranslation();
  const direction = i18n.dir() as 'ltr' | 'rtl';
  const { t: tSocial } = useTranslation('social');
  const { t: tBanners } = useTranslation('banners');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Fresh Autoplay instance every time we toggle between expanded/collapsed.
  // Reusing one instance across the mount/unmount churn leaves it pointing at a
  // destroyed Embla engine ("internalEngine undefined"), which is what made the
  // carousel mis-measure and peek after a few dismiss/expand cycles.
  const autoplayPlugin = React.useMemo(
    () => Autoplay({
      delay: 10000, stopOnInteraction: false, stopOnLastSnap: false, playOnInit: !reducedMotion,
    }),
    // `collapsed` is intentional: force a brand-new plugin each toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed, reducedMotion],
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
    direction,
  }), [direction]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    emblaOptions,
    emblaPlugins,
  );

  // Separate carousel instance for the dismissed / collapsed one-line state,
  // so it keeps its own autoplay + swipe just like the expanded version. It
  // loops (stable with the centered peek layout) and dwells long enough on
  // each card to read the title before advancing.
  const collapsedAutoplay = React.useMemo(
    () => Autoplay({
      delay: 12000, stopOnInteraction: false, stopOnLastSnap: false, playOnInit: !reducedMotion,
    }),
    // `collapsed` is intentional: force a brand-new plugin each toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed, reducedMotion],
  );
  const collapsedPlugins = React.useMemo(() => [collapsedAutoplay], [collapsedAutoplay]);
  const collapsedOptions = React.useMemo(() => ({
    loop: true,
    duration: 20,
    align: 'center' as const,
    containScroll: false as const,
    direction,
  }), [direction]);
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
      text: `${tBanners('bannerB.title')} ${tBanners('bannerB.titleAccent')}`,
      cta: tBanners('bannerB.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'a',
      text: `${tBanners('bannerA.title')} ${tBanners('bannerA.titleAccent')}`,
      cta: tBanners('bannerA.primaryButton'),
      onClick: onStartPosting,
    },
    {
      key: 'c',
      text: `${tBanners('bannerC.title')} ${tBanners('bannerC.titleAccent')}`,
      cta: tBanners('bannerC.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'd',
      text: `${tBanners('bannerD.title')} ${tBanners('bannerD.titleAccent')}`,
      cta: tBanners('bannerD.primaryButton'),
      link: '/landing',
    },
    {
      key: 'languages',
      badge: tSocial('feedAnnouncement.new'),
      text: `${tBanners('bannerLanguages.title')} ${tBanners('bannerLanguages.titleAccent')}`,
      cta: tBanners('bannerLanguages.primaryButton'),
      link: '/trends/create',
    },
    {
      key: 'new',
      badge: tSocial('feedAnnouncement.new'),
      text: `${tBanners('bannerNew.title')} ${tBanners('bannerNew.titleAccent')}`,
      cta: tBanners('bannerNew.primaryButton'),
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
    if (!reducedMotion) emblaApi.plugins()?.autoplay?.play();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, reducedMotion]);

  // Track the centered slide in the collapsed carousel (for the active/dim state)
  useEffect(() => {
    if (!collapsedEmblaApi) {
      return () => {};
    }
    const onSelect = () => setCollapsedIndex(collapsedEmblaApi.selectedScrollSnap());
    collapsedEmblaApi.on('select', onSelect);
    onSelect();

    // Start collapsed autoplay once emblaApi is ready
    if (!reducedMotion) collapsedEmblaApi.plugins()?.autoplay?.play();

    return () => {
      collapsedEmblaApi.off('select', onSelect);
    };
  }, [collapsedEmblaApi, reducedMotion]);

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
    if (!reducedMotion) emblaApi?.plugins()?.autoplay?.play();
  }, [emblaApi, reducedMotion]);

  const handleCollapsedMouseEnter = useCallback(() => {
    collapsedEmblaApi?.plugins()?.autoplay?.stop();
  }, [collapsedEmblaApi]);

  const handleCollapsedMouseLeave = useCallback(() => {
    if (!reducedMotion) collapsedEmblaApi?.plugins()?.autoplay?.play();
  }, [collapsedEmblaApi, reducedMotion]);

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

  const slideClass = (index: number) => (
    `hero-carousel__slide${selectedIndex === index ? ' is-active' : ''}`
  );
  const MetadataIcon = SLIDE_ICONS[selectedIndex];
  const metadataKey = SLIDE_KEYS[selectedIndex];

  if (collapsed) {
    return (
      <div
        className="hero-collapsed hero-collapsed--blue"
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
    <section
      className="hero-carousel rail-card"
      aria-label={t('common.heroBanner.bannerAria')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hero-carousel__viewport" ref={emblaRef}>
        <div className="hero-carousel__container">
          <div
            className={slideClass(0)}
            inert={selectedIndex !== 0}
            aria-hidden={selectedIndex !== 0}
          >
            <BannerB />
          </div>
          <div
            className={slideClass(1)}
            inert={selectedIndex !== 1}
            aria-hidden={selectedIndex !== 1}
          >
            <BannerA onStartPosting={onStartPosting} />
          </div>
          <div
            className={slideClass(2)}
            inert={selectedIndex !== 2}
            aria-hidden={selectedIndex !== 2}
          >
            <BannerC />
          </div>
          <div
            className={slideClass(3)}
            inert={selectedIndex !== 3}
            aria-hidden={selectedIndex !== 3}
          >
            <BannerD />
          </div>
          <div
            className={slideClass(4)}
            inert={selectedIndex !== 4}
            aria-hidden={selectedIndex !== 4}
          >
            <BannerLanguages />
          </div>
          <div
            className={slideClass(5)}
            inert={selectedIndex !== 5}
            aria-hidden={selectedIndex !== 5}
          >
            <BannerNew />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.heroBanner.dismissAria')}
        className="hero-carousel__dismiss"
      >
        <span>{t('common.heroBanner.dismiss', 'Dismiss')}</span>
      </button>
      <footer className="hero-carousel__footer">
        <div className="hero-carousel__metadata">
          {selectedIndex === 4 ? LANGUAGE_COLLECTIONS.map(({ label, collection, lang }) => (
            <Link key={collection} to={`/trends/tokens?collection=${collection}`} lang={lang} dir="auto">
              {label}
            </Link>
          )) : (
            <>
              <MetadataIcon aria-hidden="true" />
              <span>{tBanners(`${metadataKey}.metaMain`)}</span>
              <i aria-hidden="true" />
              <span>{tBanners(`${metadataKey}.metaAccent`)}</span>
            </>
          )}
        </div>
        <div className="hero-carousel__navigation">
          <button
            type="button"
            onClick={scrollPrev}
            className="hero-carousel__arrow"
            aria-label={t('common.heroBanner.previousSlide')}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          {SLIDE_KEYS.map((key, index) => (
            <button
              type="button"
              key={key}
              onClick={() => scrollTo(index)}
              className="hero-carousel__dot"
              aria-current={selectedIndex === index ? 'true' : undefined}
              aria-label={t('common.heroBanner.goToSlide', { number: index + 1 })}
            >
              <span />
            </button>
          ))}
          <button
            type="button"
            onClick={scrollNext}
            className="hero-carousel__arrow"
            aria-label={t('common.heroBanner.nextSlide')}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>
  );
};

export default HeroBannerCarousel;
