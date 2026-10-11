import { io } from 'socket.io-client';
import { API_BASE_URL } from '@/config';
import websocket from '@/libs/WebSocketClient';

export function subscribeShortsUpdates(api: string, network: string, contract: string, refresh: () => void) {
  const changed = (event: { network?: string; contract?: string } | null) => {
    if (event?.network === network && event.contract === contract) refresh();
  };
  if (api.replace(/\/$/, '') === API_BASE_URL?.replace(/\/$/, '')) {
    const stopUpdates = websocket.subscribeForShortsUpdates(changed);
    const stopConnection = websocket.subscribeForConnection(refresh);
    return () => { stopUpdates(); stopConnection(); };
  }
  // A separately hosted Shorts API must not reconnect the application's main
  // socket to another origin. This connection exists only while Shorts is open.
  const socket = io(api, { autoConnect: false });
  socket.on('shorts-updated', changed);
  socket.on('connect', refresh);
  socket.connect();
  return () => { socket.off('shorts-updated', changed); socket.off('connect', refresh); socket.disconnect(); };
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
