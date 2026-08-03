import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Companion to the build gate (`scripts/verify-no-wallet-chunks.cjs`), which
 * proves the inline wallet emits no chunk with `INLINE_WALLET_ENABLED = false`.
 *
 * That gate can only see the flag-OFF build, so it cannot tell an import that was
 * correctly folded away from one that was accidentally deleted. This test covers
 * the other direction: with the flag ON the wallet surfaces must come back as
 * REAL lazy components, not the inert `NO_COMPONENT` stand-in the ternary picks
 * when the flag is off. Together they pin both halves of
 *
 *   const X = INLINE_WALLET_ENABLED ? lazy(() => import('…')) : NO_COMPONENT;
 *
 * so nobody can satisfy the bundle gate by breaking the feature.
 *
 * `routes.tsx` is the site under test because it is the only one of the three
 * that exports its gated bindings (via `routes`); the same ternary in
 * `AeSdkProvider.tsx` and `ConnectWalletButton.tsx` is covered by the build gate
 * only.
 */

const REACT_LAZY = Symbol.for('react.lazy');

type RouteLike = { path?: string; element?: { type?: unknown } };

const findRoute = (routes: RouteLike[], routePath: string) => routes
  .find((route) => route.path === routePath);

/** True for a `React.lazy()` result; false for a plain function component. */
const isLazyComponent = (type: unknown) => typeof type === 'object'
  && type !== null
  && (type as { $$typeof?: symbol }).$$typeof === REACT_LAZY;

describe('inline-wallet lazy imports are gated on INLINE_WALLET_ENABLED', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('./features/wallet/config');
    vi.doUnmock('@/features/wallet/config');
  });

  it('routes no wallet-lab / wallet-onboarding surface under the real (off) config', async () => {
    const { routes } = await import('@/routes');

    expect(findRoute(routes as RouteLike[], '/wallet-lab')).toBeUndefined();
    expect(findRoute(routes as RouteLike[], '/wallet-onboarding')).toBeUndefined();
  });

  it('restores REAL lazy components — not the inert stand-in — when the flag is on', async () => {
    vi.doMock('@/features/wallet/config', () => ({ INLINE_WALLET_ENABLED: true }));

    const { routes } = await import('@/routes');

    const walletLab = findRoute(routes as RouteLike[], '/wallet-lab');
    const walletOnboarding = findRoute(routes as RouteLike[], '/wallet-onboarding');

    expect(walletLab).toBeDefined();
    expect(walletOnboarding).toBeDefined();
    // The whole point: with the flag on these must be lazily-imported modules. A
    // plain function here would mean the ternary's false-branch stand-in leaked
    // into the enabled path and the surfaces silently render nothing.
    expect(isLazyComponent(walletLab?.element?.type)).toBe(true);
    expect(isLazyComponent(walletOnboarding?.element?.type)).toBe(true);
  });
});
