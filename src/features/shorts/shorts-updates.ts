import { io } from 'socket.io-client';

export function subscribeShortsUpdates(
  api: string,
  network: string,
  contract: string,
  refresh: () => void,
) {
  let stopped = false;
  const changed = (event: { network?: string; contract?: string } | null) => {
    if (!stopped && event?.network === network && event.contract === contract) refresh();
  };
  const base = api.replace(/\/$/, '');
  // A dedicated manager/path keeps Shorts admission and cleanup independent of
  // token/social graph sockets, even when both use the same API origin.
  const endpoint = new URL(base);
  const socket = io(`${endpoint.origin}/shorts`, {
    path: `${endpoint.pathname.replace(/\/$/, '')}/shorts/socket.io`,
    autoConnect: false,
    forceNew: true,
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
  });
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const reconnect = () => {
    if (stopped || retry) return;
    const ceiling = Math.min(30000, 2000 * (2 ** attempt));
    attempt = Math.min(attempt + 1, 4);
    const delay = Math.ceil(ceiling * (0.75 + 0.25 * Math.random()));
    retry = setTimeout(() => { retry = undefined; if (!stopped) socket.connect(); }, delay);
  };
  const connected = () => {
    if (stopped) return;
    attempt = 0;
    if (retry) clearTimeout(retry);
    retry = undefined;
    refresh();
  };
  socket.on('shorts-updated', changed);
  socket.on('connect', connected);
  socket.on('connect_error', reconnect);
  socket.on('disconnect', reconnect);
  socket.connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket.off('shorts-updated', changed); socket.off('connect', connected);
    socket.off('connect_error', reconnect); socket.off('disconnect', reconnect);
    socket.disconnect();
  };
}

// Collapse bursts and never overlap background refetches. An update arriving
// mid-request gets one trailing refresh, including after reconnect.
export function createShortsRefresh(refresh: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;
  let stopped = false;
  const schedule = () => {
    if (stopped) return;
    if (running) { again = true; return; }
    if (timer) return;
    timer = setTimeout(async () => {
      timer = undefined;
      if (stopped) return;
      running = true;
      try { await refresh(); } catch { /* The hook owns error presentation. */ } finally {
        running = false;
        if (again) { again = false; schedule(); }
      }
    }, 200);
  };
  return { schedule, stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
}
