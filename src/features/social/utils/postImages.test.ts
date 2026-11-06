import {
  afterEach, expect, it, vi,
} from 'vitest';
import { compressPostImage, validatePostImage } from './postImages';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('rejects unsupported and oversized files before decoding them', () => {
  expect(() => validatePostImage(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }))).toThrow('JPEG');
  expect(() => validatePostImage({ type: 'image/jpeg', size: 11 * 1024 * 1024 } as File)).toThrow('10 MB');
});

it('compresses a landscape image to 2048 pixels, preserving its proportions and releasing the decoder', async () => {
  const bitmap = { width: 4096, height: 3072, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any);
  const output = new Blob(['compressed'], { type: 'image/webp' });
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function encodeBlob(callback) {
    expect(this.width).toBe(2048); expect(this.height).toBe(1536); callback(output);
  });
  expect(await compressPostImage(new File(['input'], 'image.jpg', { type: 'image/jpeg' }))).toBe(output);
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2048, 1536);
  expect(encode).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.86);
  expect(bitmap.close).toHaveBeenCalledOnce();
});

it('releases an oversized decoded image without trying to render it', async () => {
  const bitmap = { width: 6000, height: 6000, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  await expect(compressPostImage(new File(['input'], 'image.png', { type: 'image/png' }))).rejects.toThrow('24 megapixels');
  expect(bitmap.close).toHaveBeenCalledOnce();
});
