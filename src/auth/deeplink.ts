import { createDeepLinkUrl } from '../utils/url';
import { Backend } from '../api/backend';
import type { AppDispatch, RootState } from '../store/store';

const STORAGE_KEY = 'authedCall';

export function performAuthedCall(
  dispatch: AppDispatch,
  getState: () => RootState,
  { method, arg, to }: { method: keyof typeof Backend; arg?: any; to?: string },
) {
  const state = getState();
  const useSdkWallet = state.aeternity.useSdkWallet;
  const sdk = (window as any).__aeSdk;
  const address = state.root.address as string;
  return (async () => {
    const { challenge } = await (Backend as any)[method](address, arg);
    if (useSdkWallet) {
      const signature = (await sdk.signMessage(challenge)).toString('hex');
      const payload = { ...(arg || {}), challenge, signature };
      return (Backend as any)[method](address, payload);
    }
    const url = new URL(to || window.location.href);
    url.search = '';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ method, address, arg, challenge }));
    } catch {}
    window.location.href = createDeepLinkUrl({
      type: 'sign-message',
      message: challenge,
      'x-success': `${url}?method=${method}&address=${address}&challenge=${challenge}&signature={signature}`,
      'x-cancel': url.toString(),
    } as any);
    return null;
  })();
}

export function consumeAuthCallback(onSuccess?: (method: string) => void) {
  const params = new URLSearchParams(window.location.search);
  const method = params.get('method');
  const address = params.get('address');
  const challenge = params.get('challenge');
  const signature = params.get('signature');
  if (!method || !address || !challenge || !signature) return;
  let stored: any = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {}
  const baseArg = stored && stored.method === method && stored.address === address ? (stored.arg || {}) : {};
  const payload = { ...baseArg, challenge, signature };
  (Backend as any)[method](address, payload)
    .then(() => onSuccess?.(method))
    .finally(() => {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    });
}

// Helpers to trigger login and consent via deeplink
export function deeplinkLogin(callbackUrl?: string) {
  const cb = new URL(callbackUrl || window.location.href);
  cb.search = '';
  // Explicitly set x-success with address placeholder to let wallet return the address
  const url = new URL(`${cb}`);
  const xsuccess = `${url}?address={address}`;
  const xcancel = `${url}`;
  const deeplink = createDeepLinkUrl({ type: 'connect', 'x-success': xsuccess, 'x-cancel': xcancel } as any);
  // eslint-disable-next-line no-console
  console.info('[wallet] Redirecting to wallet deeplink', deeplink);
  window.location.href = deeplink;
}

export function deeplinkConsent({ scope }: { scope: string }) {
  const url = new URL(window.location.href);
  url.search = '';
  const href = createDeepLinkUrl({ type: 'sign-message', callbackUrl: url.toString(), scope } as any);
  // eslint-disable-next-line no-console
  console.info('[wallet] Redirecting to wallet deeplink (consent)', href);
  window.location.href = href;
}

// Tip deeplink removed in React port

export function deeplinkPost({ postId, text, parentId }: { postId: string; text: string; parentId?: string }) {
  const cb = new URL(window.location.href); cb.search = '';
  // Reuse legacy deeplink type to keep wallet compatibility while UI calls them posts
  const href = createDeepLinkUrl({ type: 'comment', id: postId, text, parentId, callbackUrl: cb.toString() } as any);
  // eslint-disable-next-line no-console
  console.info('[wallet] Redirecting to wallet deeplink (post)', href);
  window.location.href = href;
}

// Tip deeplink for sending value to a recipient with an optional message
export function deeplinkTip({ to, amount, text }: { to: string; amount: string | number; text?: string }) {
  const cb = new URL(window.location.href); cb.search = '';
  const href = createDeepLinkUrl({ type: 'tip', to, amount: String(amount), text, callbackUrl: cb.toString() } as any);
  // eslint-disable-next-line no-console
  console.info('[wallet] Redirecting to wallet deeplink (tip)', href);
  window.location.href = href;
}


