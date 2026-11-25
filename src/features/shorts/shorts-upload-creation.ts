import { uploadSourceSnapshot, type UploadSource } from './shorts-upload-policy';

export interface UploadCreation {
  key: string; fingerprint: string; source: UploadSource; expectedFormat: UploadSource['format'];
}
export const uploadCreationKey = (key: string) => `${key}.creation.v1`;

export function uploadCreationSnapshot(value: UploadCreation): UploadCreation {
  const source = uploadSourceSnapshot(value?.source);
  if (!value || typeof value.key !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.key)
    || typeof value.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.fingerprint)
    || !source || value.expectedFormat !== source.format) throw new Error('Could not verify your pending upload. Clear upload recovery to start again.');
  return {
    key: value.key, fingerprint: value.fingerprint, source, expectedFormat: value.expectedFormat,
  };
}

export function readUploadCreation(key: string, strict = false): UploadCreation | undefined {
  try {
    const raw = localStorage.getItem(uploadCreationKey(key));
    return raw ? uploadCreationSnapshot(JSON.parse(raw)) : undefined;
  } catch {
    if (strict) throw new Error('Could not read upload recovery. Start a new upload to continue.');
    return undefined;
  }
}

export function saveUploadCreation(key: string, value: UploadCreation) {
  const encoded = JSON.stringify(uploadCreationSnapshot(value));
  try {
    localStorage.setItem(uploadCreationKey(key), encoded);
    if (localStorage.getItem(uploadCreationKey(key)) !== encoded) throw new Error('Recovery write failed');
  } catch { throw new Error('Could not save upload recovery. Allow browser storage before uploading.'); }
}

export function confirmUploadCreation(value: { requestKey?: string }, pending: UploadCreation) {
  if (value?.requestKey !== pending.key) throw new Error('The server did not confirm upload recovery. Retry when the connection is restored.');
}
