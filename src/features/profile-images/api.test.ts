import {
  afterEach, expect, it, vi,
} from 'vitest';
import { API_BASE_URL } from '@/config';
import {
  imageReference, profileImageReference, imageUrl, readProfileImages,
} from './api';

it('resolves full and preview references through the configured catalog and rejects malformed identities', () => {
  const cid = `bafy${'a'.repeat(55)}`;
  const route = `${API_BASE_URL}/profile-images/images/${cid}`;
  expect(imageUrl(imageReference(cid))).toBe(`${route}/image.webp`);
  expect(imageUrl(imageReference(cid, true))).toBe(`${route}/thumb.webp`);
  expect(imageUrl(imageReference(cid), 'preview')).toBe(`${route}/thumb.webp`);
  expect(imageUrl(profileImageReference(cid))).toBe(`${route}/image.webp`);
  expect(imageUrl(profileImageReference(cid), 'preview')).toBe(`${route}/thumb.webp`);
  expect(imageUrl(`https://superhero.stream/profile-images/images/${cid}/image.webp`, 'preview')).toBe(`${route}/thumb.webp`);
  ['', `${cid}/../other`, 'short', `${cid}?query`, `${cid}-preview/extra`].forEach((id) => {
    expect(imageUrl(`ipfs:superhero:images:${id}`)).toBeUndefined();
    expect(imageUrl(`ipfs_superhero_images_${id}`)).toBeUndefined();
  });
});

it('can change delivery domain and prefix without changing stored references', async () => {
  vi.stubEnv('VITE_PROFILE_MEDIA_PUBLIC_URL', 'https://new.example/assets/photos');
  vi.resetModules();
  try {
    const resolver = await import('./api');
    const cid = `bafy${'b'.repeat(55)}`;
    expect(resolver.imageUrl(imageReference(cid, true))).toBe(`https://new.example/assets/photos/images/${cid}/thumb.webp`);
    expect(resolver.imageUrl(`https://superhero.stream/profile-images/images/${cid}/image.webp`)).toBe(`https://new.example/assets/photos/images/${cid}/image.webp`);
  } finally { vi.unstubAllEnvs(); vi.resetModules(); }
});

afterEach(() => vi.unstubAllGlobals());
it('allows only catalog WebP URLs from the dedicated image route', () => {
  const valid = `${API_BASE_URL}/profile-images/images/bafy${'a'.repeat(55)}/image.webp`;
  expect(imageUrl(valid)).toBe(valid);
  [valid.replace(API_BASE_URL, 'https://attacker.example'), `${valid}?token=bad`, valid.replace('image.webp', 'manifest.json'), 'data:image/svg+xml,test', valid.replace('/profile-images/', '/api/profile-media/')].forEach((value) => expect(imageUrl(value)).toBeUndefined());
});
it('batches concurrent avatar lookups into one bounded request', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ address: 'ak_alice', avatarurl: '' }, { address: 'ak_bob', avatarurl: '' }] });
  vi.stubGlobal('fetch', fetcher);
  const values = await Promise.all([readProfileImages('ak_alice'), readProfileImages('ak_bob')]);
  expect(values.map((row) => row.address)).toEqual(['ak_alice', 'ak_bob']);
  expect(fetcher).toHaveBeenCalledOnce();
});
