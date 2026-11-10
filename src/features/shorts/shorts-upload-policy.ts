import type { Config } from './types';
import type { UploadSession } from './shorts-upload-session';

export const ORIGINAL_UPLOAD_MAX_BYTES = 100000000;
export const UPLOAD_PART_BYTES = 1048576;
export interface UploadCapability {
  version: 1;
  transport: 'direct-s3-v1';
  format: 'original-file-v1';
  maxBytes: number;
  partSize: number;
  minDuration: 2;
  maxDuration: 60;
  creation?: 'request-key-v1';
}
export interface UploadSource {
  bytes: number; sha256: string; maxBytes: number; format: UploadCapability['format'];
}
export interface SavedUpload { id: string; fingerprint: string; expires: number; source?: UploadSource }

function sourceValid(source: UploadSource) {
  return source?.format === 'original-file-v1'
    && Number.isSafeInteger(source.maxBytes) && source.maxBytes > 0 && source.maxBytes <= ORIGINAL_UPLOAD_MAX_BYTES
    && Number.isSafeInteger(source.bytes) && source.bytes > 0 && source.bytes <= source.maxBytes
    && typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256);
}

/** Only the hosted adaptive-original service can accept new uploads. */
export function uploadCapability(config?: Config) {
  const value = config?.uploads;
  if (value?.version !== 1 || value.format !== 'original-file-v1' || value.transport !== 'direct-s3-v1'
    || (value.creation !== undefined && value.creation !== 'request-key-v1')
    || !Number.isSafeInteger(value.maxBytes) || value.maxBytes < 1 || value.maxBytes > ORIGINAL_UPLOAD_MAX_BYTES
    || value.partSize !== UPLOAD_PART_BYTES || value.minDuration !== 2 || value.maxDuration !== 60) return undefined;
  return value;
}

export function uploadSourceSnapshot(source?: UploadSource) {
  if (!source || !sourceValid(source)) return undefined;
  return {
    bytes: source.bytes, sha256: source.sha256, maxBytes: source.maxBytes, format: source.format,
  };
}

export function readSavedUpload(key: string): SavedUpload | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (!value || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
      || typeof value.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.fingerprint)
      || !Number.isSafeInteger(value.expires)) return undefined;
    return {
      id: value.id, fingerprint: value.fingerprint, expires: value.expires, ...(sourceValid(value.source) ? { source: uploadSourceSnapshot(value.source) } : {}),
    };
  } catch { return undefined; }
}

// This only enables file selection. Server status and the full source hash must
// authorize resume before any bytes are transferred, even after a limit rollback.
export function uploadSelectionLimit(current: number, saved?: SavedUpload) {
  return Math.max(current, saved?.source && sourceValid(saved.source) ? saved.source.bytes : 0);
}
export function uploadSizeLabel(bytes: number) {
  if (bytes % UPLOAD_PART_BYTES === 0) return `${bytes / UPLOAD_PART_BYTES} MiB`;
  return bytes < 1000000 ? `${bytes} bytes` : `${Number((bytes / 1000000).toFixed(2))} MB`;
}

export function validateUploadSession(session: UploadSession, identity: { bytes: number; sha256: string }, id?: string) {
  const count = Math.ceil(identity.bytes / UPLOAD_PART_BYTES);
  if (!session || typeof session.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(session.id) || (id !== undefined && session.id !== id)
    || session.partSize !== UPLOAD_PART_BYTES || !Number.isSafeInteger(session.expires)
    || session.transport !== 'direct-s3-v1'
    || typeof session.complete !== 'boolean' || !['uploading', 'queued', 'processing', 'ready', 'failed'].includes(session.status)
    || !Array.isArray(session.parts) || session.parts.length > count || new Set(session.parts).size !== session.parts.length
    || session.parts.some((part) => !Number.isInteger(part) || part < 0 || part >= count)) throw new Error('Invalid upload session. Please reload and try again.');
  if (!session.source || !sourceValid(session.source)
    || session.source.bytes !== identity.bytes || session.source.sha256 !== identity.sha256) {
    throw new Error('The server did not confirm the selected original file.');
  }
  if (!session.complete && session.status === 'uploading' && session.expires <= Date.now()) throw new Error('This upload has expired. Please start again.');
}
