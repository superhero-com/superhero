import { act, renderHook } from '@testing-library/react';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import { usePostImages } from './usePostImages';

const state = vi.hoisted(() => ({
  current: { current: 'ak_alice' }, authenticate: vi.fn(), upload: vi.fn(), request: vi.fn(),
}));
vi.mock('@/features/profile-images/useImageSession', () => ({ useImageSession: () => ({ activeAccount: state.current.current, current: state.current, authenticate: state.authenticate }) }));
vi.mock('@/features/profile-images/direct-upload', () => ({ uploadProfileImage: state.upload }));
vi.mock('@/features/profile-images/api', async (original) => ({ ...await original<typeof import('@/features/profile-images/api')>(), imageRequest: state.request }));
vi.mock('../utils/postImages', async (original) => ({ ...await original<typeof import('../utils/postImages')>(), compressPostImage: vi.fn(async () => new Blob(['compressed'])) }));

beforeEach(() => {
  vi.clearAllMocks(); state.current.current = 'ak_alice';
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
});
const photo = () => new File(['image'], 'photo.png', { type: 'image/png' });

it('enforces the four-image limit for picker and paste calls without other media', () => {
  const { result } = renderHook(usePostImages);
  act(() => result.current.select(Array.from({ length: 5 }, photo)));
  expect(result.current.images).toHaveLength(0);
  expect(result.current.error).toContain('four');
  act(() => result.current.select(Array.from({ length: 4 }, photo)));
  expect(result.current.images).toHaveLength(4);
  act(() => result.current.select([photo()]));
  expect(result.current.images).toHaveLength(4);
  expect(result.current.error).toContain('four');
});

it('enforces the combined four-item limit and releases previews on removal and unmount', () => {
  const { result, unmount } = renderHook(usePostImages);
  act(() => result.current.select([photo(), photo(), photo(), photo()], 1));
  expect(result.current.images).toHaveLength(0);
  expect(result.current.error).toContain('four');
  act(() => result.current.select([photo(), photo()], 1));
  expect(result.current.images).toHaveLength(2);
  act(() => result.current.remove(result.current.images[0].id));
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

it('discards selected files and prevents uploading if the wallet changes during approval', async () => {
  let resolve!: (session: { address: string; token: string }) => void;
  state.authenticate.mockReturnValue(new Promise((done) => { resolve = done; }));
  const { result, rerender } = renderHook(usePostImages);
  act(() => result.current.select([photo()], 0));
  let upload!: Promise<unknown>;
  act(() => { upload = result.current.prepare().catch((error) => error); });
  state.current.current = 'ak_bob'; rerender();
  expect(result.current.images).toHaveLength(0);
  await act(async () => { resolve({ address: 'ak_alice', token: 'session' }); await upload; });
  expect(await upload).toBeInstanceOf(Error);
  expect(state.upload).not.toHaveBeenCalled();
  expect(state.request).not.toHaveBeenCalled();
});
