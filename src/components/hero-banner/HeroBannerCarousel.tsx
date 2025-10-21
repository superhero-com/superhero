import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import SpaceEffects from "./SpaceEffects";
import BannerA from "./BannerA";
import BannerB from "./BannerB";
import BannerC from "./BannerC";
// Removed BannerD to make the carousel 3 slides
import "./banner.styles.css";

const DISMISS_KEY = "hero_banner_dismissed_until";

export default function HeroBannerCarousel() {
  const [hidden, setHidden] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const autoplayPlugin = React.useRef(
    Autoplay({ delay: 8000, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 20 },
    [autoplayPlugin.current]
  );

  // Check if banner was dismissed
  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (!until) return;
      const ts = Date.parse(until);
      if (!Number.isNaN(ts) && ts > Date.now()) setHidden(true);
    } catch {}
  }, []);

  // Update selected index when carousel changes
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
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
    } catch {}
    setHidden(true);
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
    [emblaApi]
  );

  if (hidden) return null;

  return (
    <div
      className="hero-banner-carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <section
        className="hero-banner"
        style={{
          background:
            "radial-gradient(1100px 520px at 85% -20%, rgba(0,229,255,.24), transparent 60%), radial-gradient(900px 520px at -10% 80%, rgba(0,229,255,.18), transparent 60%), linear-gradient(120deg, #080c1c, #1b0c36, #0d0b28)",
        }}
        aria-label="Superhero banner"
      >
        <SpaceEffects supernovaColor="rgba(255,94,188,.55)" />

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            <div className="flex-[0_0_100%] min-w-0">
              <BannerA />
            </div>
            <div className="flex-[0_0_100%] min-w-0">
              <BannerB />
            </div>
            <div className="flex-[0_0_100%] min-w-0">
              <BannerC />
            </div>
            {/* 3 slides only */}
          </div>
        </div>
      </section>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="banner-dismiss"
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Navigation arrows */}
      <button
        type="button"
        onClick={scrollPrev}
        className="carousel-arrow carousel-arrow--prev"
        aria-label="Previous slide"
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
        aria-label="Next slide"
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
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollTo(index)}
            className={`carousel-dot ${selectedIndex === index ? "active" : ""}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

