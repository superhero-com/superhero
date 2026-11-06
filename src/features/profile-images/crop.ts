import type { Area } from 'react-easy-crop';
import type { ImageRole } from './api';

/** Export the library's pixel selection at the delivery size before uploading. */
export async function exportProfileCrop(
  image: ImageBitmap,
  area: Area,
  role: ImageRole,
): Promise<Blob> {
  if (!Object.values(area).every(Number.isFinite)
    || area.width <= 0 || area.height <= 0 || area.x < 0 || area.y < 0
    || area.x + area.width > image.width + 1 || area.y + area.height > image.height + 1) {
    throw new Error('The image selection is unavailable. Please choose the image again.');
  }
  const canvas = document.createElement('canvas');
  const width = role === 'avatar' ? 1024 : 1920;
  const height = role === 'avatar' ? 1024 : 720;
  const scale = Math.min(1, area.width / width, area.height / height);
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare the image. Please try again.'));
    }, 'image/webp', 0.94);
  });
}
