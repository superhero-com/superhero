import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CONFIG } from '@/config';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import { TxPayloadType, useTransactionNotification } from '@/features/transaction-notification';
import { uploadProfileImage } from './direct-upload';
import {
  ImageRole, ImageWrite, ImageWriteStatus, imageRequest, profileImageReference,
} from './api';
import { useImageSession } from './useImageSession';

interface PendingImage { id: string; role: ImageRole }
interface SavedOperation { storageKey: string; entry: PendingImage }
interface ImageActions {
  change: (role: ImageRole, file: Blob | null) => Promise<void>;
  resume: () => Promise<void>;
  pending?: PendingImage;
  busy: boolean;
  checking: boolean;
  message: string;
  error: string;
}
const Context = createContext<ImageActions | null>(null);
export const useImageActions = () => useContext(Context)!;

export const ProfileImageProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useImageSession();
  const client = useQueryClient();
  const notifications = useTransactionNotification();
  const storageKey = `profile-image-write:${CONFIG.NETWORK}:${wallet.activeAccount || ''}`;
  const [savedOperation, setSavedOperation] = useState<SavedOperation>();
  const pending = savedOperation?.storageKey === storageKey ? savedOperation.entry : undefined;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const changing = useRef(false);
  useEffect(() => {
    setError(''); setMessage('');
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      setSavedOperation(saved && typeof saved.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.id) && ['avatar', 'cover'].includes(saved.role) ? { storageKey, entry: saved } : undefined);
    } catch { setSavedOperation(undefined); }
  }, [storageKey]);
  const status = useQuery({
    queryKey: ['profile-image-write', storageKey, pending?.id],
    queryFn: ({ signal }) => imageRequest<ImageWriteStatus>(`/writes/${pending!.id}/status?address=${encodeURIComponent(wallet.activeAccount!)}`, undefined, undefined, signal),
    enabled: !!pending && !!wallet.activeAccount,
    refetchInterval: 5000,
    retry: false,
  });
  useEffect(() => {
    const result = status.data;
    if (!result || result.id !== pending?.id || result.role !== pending?.role) return;
    if (result.status === 'confirmed' || result.status === 'failed') {
      localStorage.removeItem(storageKey); setSavedOperation(undefined);
      if (result.status === 'confirmed') {
        setMessage('Profile image updated.');
        notifications.notifyConfirmed({ type: TxPayloadType.UpdateProfile, fields: [result.role] });
        client.invalidateQueries({ queryKey: ['profile-images'] });
        client.invalidateQueries({ queryKey: ['profile'] });
      } else { const text = 'The image change failed. Please try again.'; setMessage(''); setError(text); notifications.notifyError(text); }
    } else setMessage('Your image change is confirming. You can close this window.');
  }, [status.data, pending?.id, pending?.role, storageKey, client, notifications]);

  const resume = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ['profile-image-write', storageKey] });
  }, [client, storageKey]);
  const change = useCallback(async (role: ImageRole, file: Blob | null) => {
    if (changing.current || pending) throw new Error('Wait for the current image change to finish.');
    changing.current = true; setBusy(true); setError(''); setMessage('Waiting for your wallet…');
    let recorded = false;
    const address = wallet.activeAccount;
    const payload = { type: TxPayloadType.UpdateProfile, fields: [role] };
    try {
      const auth = await wallet.authenticate();
      let cid: string | null = null;
      if (file) {
        setMessage('Uploading your image…');
        cid = await uploadProfileImage(file, role, address!, auth.token, () => {
          if (wallet.current.current !== address) throw new Error('Your wallet changed. Please try again.');
        }, setMessage);
      }
      if (wallet.current.current !== address) throw new Error('Your wallet changed. Please try again.');
      const claim = await imageRequest<{ id: string; message: string; nonce: number }>('/claim', { role, cid }, auth.token);
      const expected = cid ? `link:${address}:${role}:${profileImageReference(cid)}:${claim.nonce}` : `unlink:${address}:${role}:${claim.nonce}`;
      if (!Number.isSafeInteger(claim.nonce) || claim.nonce < 0 || claim.message !== expected) throw new Error('Invalid image change request.');
      notifications.notifySubmitted(payload); setMessage('Approve the image change in your wallet…');
      const signature = await signAndVerifyLinkMessage(address!, wallet.signMessage, claim.message);
      if (wallet.current.current !== address) throw new Error('Your wallet changed. Please try again.');
      const entry = { id: claim.id, role };
      // Save the non-secret operation ID before sending; a lost response is recoverable.
      localStorage.setItem(storageKey, JSON.stringify(entry)); recorded = true;
      setSavedOperation({ storageKey, entry });
      notifications.notifyPending(payload);
      const result = await imageRequest<ImageWrite>('/submit', { id: claim.id, signature }, auth.token);
      client.setQueryData(['profile-image-write', storageKey, claim.id], result);
      setMessage('Your image change is confirming. You can close this window.');
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : 'The image change failed.';
      if (recorded) { setMessage('Checking whether your image change was submitted…'); notifications.notifyPending(payload); } else { setError(text); setMessage(''); notifications.notifyError(text); }
      throw cause;
    } finally { changing.current = false; setBusy(false); }
  }, [pending, wallet, notifications, client, storageKey]);
  const checking = !!pending && status.isFetching;
  const statusError = pending && status.isError ? 'Could not check your image change. Please try again.' : '';
  const progress = pending && !message ? 'Checking your previous image change…' : message;
  const value = useMemo(() => ({
    change, resume, pending, busy, checking, message: progress, error: statusError || error,
  }), [change, resume, pending, busy, checking, progress, statusError, error]);
  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
};
