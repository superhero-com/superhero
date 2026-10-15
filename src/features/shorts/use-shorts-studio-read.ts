import { useEffect, useState } from 'react';
import { request } from './api';

export function studioContentQuery(search: string, days: number) {
  const params = new URLSearchParams(search);
  const status = params.get('status') || 'all';
  const sort = params.get('sort') || 'newest';
  const query = new URLSearchParams({
    q: (params.get('q') || '').trim(),
    days: String(days),
    status: ['all', 'published', 'draft', 'withdrawn'].includes(status) ? status : 'all',
    sort: ['newest', 'oldest', 'likes', 'likes-asc', 'views', 'views-asc'].includes(sort) ? sort : 'newest',
  });
  if (params.get('cursor')) query.set('cursor', params.get('cursor')!);
  return query.toString();
}

// Scope includes the wallet and deployment. Old responses must never populate a
// new account, period, filter or detail page, even if a transport ignores abort.
export function useShortsStudioRead<T>(path: string | undefined, token: string | undefined, scope: string, revision: number) {
  const key = path && token ? JSON.stringify([path, token, scope]) : undefined;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error: string; loading: boolean }>();
  useEffect(() => {
    if (!key || !path || !token) { setState(undefined); return undefined; }
    let active = true;
    const controller = new AbortController();
    setState((current) => ({
      key, data: current?.key === key ? current.data : undefined, error: '', loading: true,
    }));
    // Debounce rapid searches; retain the same page during background refresh.
    const timer = setTimeout(() => {
      request<T>(path, undefined, token, { signal: controller.signal, timeout: 30000 }).then((data) => {
        if (active) {
          setState({
            key, data, error: '', loading: false,
          });
        }
      }).catch((error) => {
        if (active) {
          setState((current) => ({
            key, data: current?.key === key ? current.data : undefined, loading: false, error: error instanceof Error ? error.message : 'Studio couldn’t load this page.',
          }));
        }
      });
    }, 150);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [key, path, token, revision, retry]);
  const current = state?.key === key ? state : undefined;
  return {
    data: current?.data,
    error: current?.error || '',
    loading: !!key && (!current || current.loading),
    retry: () => setRetry((value) => value + 1),
  };
}
