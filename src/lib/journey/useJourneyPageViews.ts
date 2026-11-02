import { useEffect } from 'react';
import { useLocation, type RouteObject } from 'react-router-dom';
import { toRoutePattern } from './routePattern';
import { pageViewEvents } from './pageViewEvents';
import { setJourneyPage, track } from './client';

/**
 * Mount once at the app root. Sends `page_view` with the route pattern on every route change,
 * plus `profile_view` / `token_view` on those pages. Only the pattern is used, never the path.
 */
export function useJourneyPageViews(routes: RouteObject[]): void {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      const pattern = toRoutePattern(pathname, routes);
      setJourneyPage(pattern);
      pageViewEvents(pattern).forEach((name) => track(name, { page: pattern }));
    } catch {
      // never break navigation
    }
  }, [pathname, routes]);
}
