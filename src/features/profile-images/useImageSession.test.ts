import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import { useImageSession } from './useImageSession';

const mocks = vi.hoisted(() => ({
  activeAccount: 'ak_alice',
  request: vi.fn(),
  sign: vi.fn(),
  signMessage: vi.fn(),
  sdk: { getNodeInfo: vi.fn() },
}));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => mocks }));
vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat' } }));
vi.mock('./api', () => ({ imageRequest: mocks.request }));
vi.mock('@/utils/signLinkMessage', () => ({ signAndVerifyLinkMessage: mocks.sign }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activeAccount = 'ak_alice';
  mocks.sdk.getNodeInfo.mockResolvedValue({ nodeNetworkId: 'ae_uat' });
});

it.each(['/config', '/auth/challenge'])('stops sign-in before prompting a changed wallet after %s', async (stage) => {
  let finish!: (value: unknown) => void;
  const id = 'a'.repeat(48);
  const expiresAt = Date.now() + 60000;
  const config = {
    enabled: true, network: 'ae_uat', contract: 'ct_release', origin: window.location.origin,
  };
  const challenge = {
    id,
    expiresAt,
    message: `Superhero profile images\nOrigin: ${config.origin}\nNetwork: ae_uat\nContract: ct_release\nAddress: ak_alice\nNonce: ${id}\nExpires: ${new Date(expiresAt).toISOString()}\nAllow image uploads for 30 minutes. Changing your avatar or cover requires a separate signature. No tokens are transferred.`,
  };
  mocks.request.mockImplementation((path: string) => {
    if (path === stage) return new Promise((resolve) => { finish = resolve; });
    return Promise.resolve(path === '/config' ? config : challenge);
  });
  const { result, rerender } = renderHook(useImageSession);
  let pending!: Promise<unknown>;
  act(() => { pending = result.current.authenticate().catch((error) => error); });
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  mocks.activeAccount = 'ak_bob';
  rerender();
  await act(async () => {
    finish(stage === '/config' ? config : challenge);
    await pending;
  });
  expect(await pending).toMatchObject({ message: 'Your wallet changed. Please try again.' });
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.request.mock.calls.some(([path]) => path === '/auth/verify')).toBe(false);
});
