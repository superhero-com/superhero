import { useEffect, useMemo, useState } from "react";

const DEFAULT_BREAKPOINT = 768;

export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT) {
  const query = useMemo(() => `(max-width: ${breakpoint - 1}px)`, [breakpoint]);

  const getMatches = () => {
    if (typeof window === "undefined") return false;
    if (typeof window.matchMedia === "function") {
      return window.matchMedia(query).matches;
    }
    return window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia(query);
      const handleChange = () => setIsMobile(mediaQuery.matches);

      handleChange();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleChange);
      } else {
        mediaQuery.addListener?.(handleChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleChange);
        } else {
          mediaQuery.removeListener?.(handleChange);
        }
      };
    }

    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint, query]);

  return isMobile;
}
