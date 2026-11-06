import {
  fireEvent, render, screen, waitFor, cleanup,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ProfileImageProvider, useImageActions } from './ProfileImageProvider';
import { ProfileImageButton } from './ProfileImageButton';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  sign: vi.fn(),
  upload: vi.fn(),
  wallet: {
    activeAccount: 'ak_alice', current: { current: 'ak_alice' }, signMessage: vi.fn(), authenticate: vi.fn(),
  },
  notifications: {
    notifySubmitted: vi.fn(), notifyPending: vi.fn(), notifyConfirmed: vi.fn(), notifyError: vi.fn(),
  },
}));
vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), imageRequest: mocks.request }));
vi.mock('./direct-upload', () => ({ uploadProfileImage: mocks.upload }));
vi.mock('./useImageSession', () => ({ useImageSession: () => mocks.wallet }));
vi.mock('./useProfileImages', () => ({ useImageConfig: () => ({ data: { enabled: true } }) }));
vi.mock('@/utils/signLinkMessage', () => ({ signAndVerifyLinkMessage: mocks.sign }));
vi.mock('@/features/transaction-notification', () => ({ TxPayloadType: { UpdateProfile: 'update_profile' }, useTransactionNotification: () => mocks.notifications }));
vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat' }, API_BASE_URL: 'https://profiles.example' }));

const cid = `bafy${'a'.repeat(55)}`;
const id = '11111111-1111-4111-8111-111111111111';
const Controls = () => {
  const actions = useImageActions();
  return (
    <>
      <ProfileImageButton imageRole="avatar" />
      <ProfileImageButton imageRole="cover" />
      <button type="button" onClick={() => { actions.change('avatar', new Blob(['test'])).catch(() => {}); }}>Save</button>
      <button type="button" onClick={() => { actions.resume(); }}>Resume</button>
      <p data-testid="pending">{actions.pending?.id}</p>
      <p role="status">{actions.message}</p>
      <p role="alert">{actions.error}</p>
    </>
  );
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><ProfileImageProvider><Controls /></ProfileImageProvider></QueryClientProvider>) };
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); mocks.wallet.activeAccount = 'ak_alice'; mocks.wallet.current.current = 'ak_alice';
  mocks.wallet.authenticate.mockResolvedValue({ token: 'session', address: 'ak_alice', expiresAt: Date.now() + 300000 });
  mocks.sign.mockResolvedValue('signature');
  mocks.upload.mockResolvedValue(cid);
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/claim') return { id, nonce: 4, message: `link:ak_alice:avatar:ipfs_superhero_images_${cid}:4` };
    return {
      id, role: 'avatar', cid, status: 'submitted',
    };
  });
});
afterEach(cleanup);

describe('recoverable profile changes', () => {
  it('leaves the current image alone when the wallet rejects the link signature', async () => {
    mocks.sign.mockRejectedValue(new Error('Wallet declined'));
    mount(); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Wallet declined'));
    expect(mocks.request.mock.calls.some(([path]) => path === '/submit')).toBe(false);
    expect(localStorage.length).toBe(0);
    expect(screen.getByTestId('pending').textContent).toBe('');
  });
  it('keeps a journal ID after a lost submission response and never creates a replacement', async () => {
    const base = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string) => { if (path === '/submit') throw new Error('Timeout'); return base(path); });
    mount(); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe(id));
    expect(JSON.parse(localStorage.getItem('profile-image-write:ae_uat:ak_alice')!).id).toBe(id);
    fireEvent.click(screen.getByText('Save'));
    expect(mocks.request.mock.calls.filter(([path]) => path === '/claim')).toHaveLength(1);
    expect(mocks.notifications.notifyConfirmed).not.toHaveBeenCalled();
  });
  it('clears the operation only after authoritative confirmation', async () => {
    const { client } = mount(); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe(id));
    client.setQueryData(['profile-image-write', 'profile-image-write:ae_uat:ak_alice', id], {
      id, role: 'avatar', cid, status: 'confirmed',
    });
    await waitFor(() => expect(screen.getByTestId('pending').textContent).toBe(''));
    expect(localStorage.length).toBe(0); expect(mocks.notifications.notifyConfirmed).toHaveBeenCalledOnce();
    expect(mocks.sign).toHaveBeenCalledWith('ak_alice', mocks.wallet.signMessage, `link:ak_alice:avatar:ipfs_superhero_images_${cid}:4`);
  });
  it('recovers a completed cover after reload without authentication or another write', async () => {
    localStorage.setItem('profile-image-write:ae_uat:ak_alice', JSON.stringify({ id, role: 'cover' }));
    mocks.request.mockResolvedValue({ id, role: 'cover', status: 'confirmed' });
    mount();
    await waitFor(() => expect(mocks.notifications.notifyConfirmed).toHaveBeenCalledOnce());
    expect(screen.getByTestId('pending').textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Change avatar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Change cover' })).toBeEnabled();
    expect(localStorage.getItem('profile-image-write:ae_uat:ak_alice')).toBeNull();
    expect(mocks.request).toHaveBeenCalledWith(`/writes/${id}/status?address=ak_alice`, undefined, undefined, expect.any(AbortSignal));
    expect(mocks.wallet.authenticate).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('retains a pending operation through a network failure and retries without a wallet prompt', async () => {
    localStorage.setItem('profile-image-write:ae_uat:ak_alice', JSON.stringify({ id, role: 'avatar' }));
    mocks.request.mockRejectedValue(new Error('Offline'));
    mount();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not check'));
    expect(screen.getByTestId('pending')).toHaveTextContent(id);
    expect(screen.getByRole('button', { name: 'Change avatar' })).toBeDisabled();
    expect(localStorage.getItem('profile-image-write:ae_uat:ak_alice')).not.toBeNull();
    mocks.request.mockResolvedValue({ id, role: 'avatar', status: 'confirmed' });
    fireEvent.click(screen.getByText('Resume'));
    await waitFor(() => expect(mocks.notifications.notifyConfirmed).toHaveBeenCalledOnce());
    expect(localStorage.getItem('profile-image-write:ae_uat:ak_alice')).toBeNull();
    expect(mocks.wallet.authenticate).not.toHaveBeenCalled();
  });
  it('unlocks a failed operation after reload and shows the failure', async () => {
    localStorage.setItem('profile-image-write:ae_uat:ak_alice', JSON.stringify({ id, role: 'avatar' }));
    mocks.request.mockResolvedValue({ id, role: 'avatar', status: 'failed' });
    mount();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The image change failed'));
    expect(localStorage.getItem('profile-image-write:ae_uat:ak_alice')).toBeNull();
    expect(mocks.notifications.notifyConfirmed).not.toHaveBeenCalled();
  });
  it('does not clear another wallet’s operation when an earlier status request finishes', async () => {
    const otherId = '22222222-2222-4222-8222-222222222222';
    const aliceKey = 'profile-image-write:ae_uat:ak_alice';
    const bobKey = 'profile-image-write:ae_uat:ak_bob';
    localStorage.setItem(aliceKey, JSON.stringify({ id, role: 'avatar' }));
    localStorage.setItem(bobKey, JSON.stringify({ id: otherId, role: 'cover' }));
    let finish!: (value: unknown) => void;
    mocks.request.mockImplementation((path: string) => (path.includes('ak_alice')
      ? new Promise((resolve) => { finish = resolve; })
      : Promise.resolve({ id: otherId, role: 'cover', status: 'submitted' })));
    const { client, rerender } = mount();
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce());
    mocks.wallet.activeAccount = 'ak_bob'; mocks.wallet.current.current = 'ak_bob';
    rerender(<QueryClientProvider client={client}><ProfileImageProvider><Controls /></ProfileImageProvider></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent(otherId));
    finish({ id, role: 'avatar', status: 'confirmed' });
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent(otherId));
    expect(localStorage.getItem(aliceKey)).not.toBeNull();
    expect(localStorage.getItem(bobKey)).not.toBeNull();
    expect(mocks.notifications.notifyConfirmed).not.toHaveBeenCalled();
  });
  it('refuses a mismatched claim before asking the wallet to sign', async () => {
    const base = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string) => (path === '/claim' ? { id, nonce: 4, message: 'link:another:avatar:wrong:4' } : base(path)));
    mount(); fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Invalid image change'));
    expect(mocks.sign).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });
});
