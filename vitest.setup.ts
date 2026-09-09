import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
// Provide a default CONFIG for tests unless overridden
import { CONFIG } from './src/config';
import './src/i18n';

(global as any).CONFIG = CONFIG;

// Test files run in parallel now, so a `waitFor` can lose its slice of the CPU for longer than
// the 1s default allows and time out on work that was going to settle. `waitFor` polls, so a
// higher ceiling costs nothing when the condition is already met.
configure({ asyncUtilTimeout: 5000 });

// jsdom implements no `matchMedia`, so every browser build of the app would hit `undefined`
// here. Tests used to inherit a stub that leaked out of whichever spec happened to define one
// first, which only worked while Vitest ran every file in a single process. Give all specs the
// same non-matching baseline instead; specs that care stub their own queries on top.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList),
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Ignore storage cleanup in environments where it is unavailable.
  }
});
