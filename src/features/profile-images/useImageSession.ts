import { useRef } from 'react';
import { useAeSdk } from '@/hooks/useAeSdk';
import { CONFIG } from '@/config';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import { imageRequest, ImageConfig, ImageSession } from './api';

export function useImageSession(purpose?: 'post') {
  const { activeAccount, signMessage, sdk } = useAeSdk();
  const current = useRef(activeAccount);
  current.current = activeAccount;
  const session = useRef<ImageSession | undefined>(undefined);
  if (session.current?.address !== activeAccount) session.current = undefined;
  const authenticate = async () => {
    const address = activeAccount;
    if (!address) throw new Error('Connect your wallet to continue.');
    const config = await imageRequest<ImageConfig>('/config');
    if (!config.enabled || (purpose === 'post' && !config.posts)) throw new Error('Image uploads are unavailable.');
    if (config.network !== CONFIG.NETWORK || (await sdk.getNodeInfo()).nodeNetworkId !== config.network) throw new Error('Switch your wallet to the website’s network.');
    if (config.origin !== window.location.origin) throw new Error('Profile image sign-in is unavailable on this origin.');
    if (session.current && session.current.expiresAt > Date.now() + 30000) return session.current;
    const challenge = await imageRequest<{ id: string; message: string; expiresAt: number }>('/auth/challenge', { address, purpose });
    const title = purpose === 'post' ? 'Superhero post images' : 'Superhero profile images';
    const action = purpose === 'post' ? 'Publishing a post requires a separate signature.' : 'Changing your avatar or cover requires a separate signature.';
    const expected = `${title}\nOrigin: ${config.origin}\nNetwork: ${config.network}\nContract: ${config.contract}\nAddress: ${address}\nNonce: ${challenge.id}\nExpires: ${new Date(challenge.expiresAt).toISOString()}\nAllow image uploads for 30 minutes. ${action} No tokens are transferred.`;
    if (challenge.message !== expected || !/^[a-f0-9]{48}$/.test(challenge.id) || challenge.expiresAt < Date.now()) throw new Error('Invalid image sign-in request.');
    const signature = await signAndVerifyLinkMessage(address, signMessage, challenge.message);
    if (current.current !== address) throw new Error('Your wallet changed. Please try again.');
    const result = await imageRequest<ImageSession>('/auth/verify', { id: challenge.id, signature });
    if (result.address !== address || current.current !== address) throw new Error('Your wallet changed. Please try again.');
    session.current = result;
    return result;
  };
  return {
    authenticate, activeAccount, signMessage, current,
  };
}
