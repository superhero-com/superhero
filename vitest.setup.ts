import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
// Provide a default CONFIG for tests unless overridden
import { CONFIG } from './src/config';

(global as any).CONFIG = CONFIG;

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
