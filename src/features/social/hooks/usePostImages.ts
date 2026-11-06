import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useImageSession } from '@/features/profile-images/useImageSession';
import { imageRequest, imageReference } from '@/features/profile-images/api';
import { uploadProfileImage } from '@/features/profile-images/direct-upload';
import { compressPostImage, MAX_POST_IMAGES, validatePostImage } from '../utils/postImages';

interface Attachment { id: string; file: File; preview: string; compressed?: Blob }

export function usePostImages() {
  const { authenticate, activeAccount, current } = useImageSession('post');
  const [images, setImages] = useState<Attachment[]>([]);
  const selected = useRef<Attachment[]>([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const operation = useRef<AbortController | null>(null);
  const reset = useCallback(() => {
    operation.current?.abort();
    selected.current.forEach((item) => URL.revokeObjectURL(item.preview));
    selected.current = [];
    setImages([]); setError(''); setProgress('');
  }, []);
  useEffect(() => { reset(); return reset; }, [activeAccount, reset]);

  const select = (files: File[], otherCount = 0) => {
    if (operation.current || !files.length) return;
    setError('');
    try {
      if (selected.current.length + files.length + otherCount > MAX_POST_IMAGES) throw new Error('Attach up to four images per post.');
      files.forEach(validatePostImage);
      selected.current = [...selected.current, ...files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))];
      setImages([...selected.current]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open this image.'); }
  };
  const remove = (id: string) => {
    if (operation.current) return;
    selected.current.filter((item) => item.id === id).forEach((item) => URL.revokeObjectURL(item.preview));
    selected.current = selected.current.filter((item) => item.id !== id);
    setImages([...selected.current]); setError('');
  };
  const prepare = async (): Promise<string[]> => {
    if (!selected.current.length) return [];
    if (operation.current) throw new Error('Your images are already uploading.');
    const controller = new AbortController(); operation.current = controller;
    const address = activeAccount;
    const check = () => {
      controller.signal.throwIfAborted();
      if (!address || current.current !== address) throw new Error('Your wallet changed. Please try again.');
    };
    try {
      setProgress('Approve image uploads in your wallet…');
      const session = await authenticate(); check();
      const cids: string[] = [];
      const batch = [...selected.current];
      // eslint-disable-next-line no-restricted-syntax -- Upload sequentially within the server admission limit.
      for (const [index, item] of batch.entries()) {
        check();
        const label = `Image ${index + 1} of ${batch.length}`;
        setProgress(`${label}: compressing…`);
        // eslint-disable-next-line no-await-in-loop
        item.compressed ??= await compressPostImage(item.file);
        check(); setProgress(`${label}: uploading…`);
        // eslint-disable-next-line no-await-in-loop
        const cid = await uploadProfileImage(
          item.compressed,
          'post',
          session.address,
          session.token,
          check,
          () => setProgress(`${label}: preparing…`),
          controller.signal,
        );
        cids.push(cid);
      }
      check();
      const result = await imageRequest<{ media: string[] }>('/attachments', { cids: [...new Set(cids)] }, session.token, controller.signal);
      check();
      if (!Array.isArray(result.media) || result.media.length !== new Set(cids).size
        || result.media.some((reference, index) => reference !== imageReference([...new Set(cids)][index]))) throw new Error('Invalid image attachment response.');
      return result.media;
    } finally {
      if (operation.current === controller) { operation.current = null; setProgress(''); }
    }
  };
  return {
    images, error, progress, select, remove, reset, prepare,
  };
}
