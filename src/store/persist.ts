import type { RootState } from './store';

const KEY = 'sh-react:state';

export function loadState(): Partial<RootState> | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function saveState(state: RootState) {
  const subset = {
    root: {
      selectedCurrency: state.root.selectedCurrency,
      address: state.root.address,
      balance: state.root.balance,
      tokenBalances: state.root.tokenBalances,
      tokenPrices: state.root.tokenPrices,
      cookiesConsent: state.root.cookiesConsent,
    },
  } as Partial<RootState>;
  localStorage.setItem(KEY, JSON.stringify(subset));
}

export function listenCrossTabSync(onUpdate: (state: Partial<RootState>) => void) {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try { onUpdate(JSON.parse(e.newValue)); } catch { /* ignore */ }
  });
}


