export const MAX_POST_IMAGES = 4;
export const POST_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export function validatePostImage(file: File) {
  if (!POST_IMAGE_ACCEPT.split(',').includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose images smaller than 10 MB each.');
}

/** Strip metadata and bound dimensions/bytes before any network upload. */
export async function compressPostImage(file: File): Promise<Blob> {
  validatePostImage(file);
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 24000000 || Math.max(image.width, image.height) > 8192
      || Math.min(image.width, image.height) < 32) throw new Error('Choose images from 32 pixels per side, up to 24 megapixels.');
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    if (Math.min(canvas.width, canvas.height) < 32) throw new Error('This image is too narrow. Choose a less panoramic image.');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob || blob.size > 3 * 1024 * 1024) reject(new Error('Could not compress this image. Choose a smaller image.'));
        else resolve(blob);
      }, 'image/webp', 0.86);
    });
  } finally { image.close(); }
}
