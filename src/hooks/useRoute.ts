// src/hooks/useRoute.ts
import { useCallback, useEffect, useState } from 'react';
import {
  currentLocation,
  navigate,
  parseRoute,
  startHistoryListener,
  subscribeRoute,
  type NavigateOptions,
  type Route,
} from '../lib/router';

let historyStarted = false;

/**
 * Reactive view of the current URL. Subscribes to both programmatic navigation
 * and the browser's back/forward buttons.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => {
    const loc = currentLocation();
    return parseRoute(loc.path, loc.search);
  });

  useEffect(() => {
    if (!historyStarted) {
      historyStarted = true;
      startHistoryListener();
    }

    const sync = (loc: { path: string; search: string }) => setRoute(parseRoute(loc.path, loc.search));
    const unsubscribe = subscribeRoute(sync);
    // Re-sync in case the URL changed between render and subscription.
    sync(currentLocation());
    return unsubscribe;
  }, []);

  return route;
}

/** Stable navigation function accepting a path (`/cart`) or token (`category-cleanser`). */
export function useNavigate() {
  return useCallback((to: string, options?: NavigateOptions) => navigate(to, options), []);
}
