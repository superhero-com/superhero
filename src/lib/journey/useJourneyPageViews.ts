import { useEffect, useRef } from 'react';
import { useLocation, type RouteObject } from 'react-router-dom';
import { toRoutePattern } from './routePattern';
import { pageViewEvents } from './pageViewEvents';
import { setJourneyPage, track } from './client';

/**
 * Mount once at the app root. Sends `page_view` with the route pattern on every route change,
 * plus `profile_view` / `token_view` on those pages. Only the pattern is used, never the path.
 */
export function useJourneyPageViews(routes: RouteObject[]): void {
  const { pathname, search } = useLocation();
  useEffect(() => {
    try {
      const pattern = toRoutePattern(pathname, routes);
      setJourneyPage(pattern);
      pageViewEvents(pattern).forEach((name) => track(name, { page: pattern }));
    } catch {
      // never break navigation
    }
  }, [pathname, routes]);

  // The wallet app sends a deep-link connect back with these params (deepLinkWalletConnect);
  // the modal that started it is gone by then, and only this hook is mounted exactly once.
  // That return is always a page load, so only the landing URL counts: Back to it is no connect.
  const landingSearch = useRef(search);
  useEffect(() => {
    const params = new URLSearchParams(landingSearch.current);
    if (params.get('address')?.startsWith('ak_') && params.get('networkId')) {
      track('wallet_connected');
    }
  }, []);
}
