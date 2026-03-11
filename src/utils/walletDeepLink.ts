import { createDeepLinkUrl } from '@/utils/url';

export type SignMessageCallbackPayload = {
  requestId: string;
  signature?: string;
  address?: string;
  cancelled: boolean;
};

export function buildSignMessageDeepLink(params: {
  message: string;
  requestId: string;
  callbackOrigin?: string;
}) {
  const callbackOrigin = params.callbackOrigin || window.location.origin;
  const successUrl = `${callbackOrigin}/?wallet_sign_req=${params.requestId}&wallet_sign_signature={signature}&wallet_sign_address={address}`;
  const cancelUrl = `${callbackOrigin}/?wallet_sign_req=${params.requestId}&wallet_sign_cancelled=1`;
  return createDeepLinkUrl({
    type: 'sign-message',
    message: params.message,
    'x-success': successUrl,
    'x-cancel': cancelUrl,
  });
}

export function parseSignMessageCallback(url: string): SignMessageCallbackPayload | null {
  const params = new URL(url).searchParams;
  const requestId = params.get('wallet_sign_req');
  if (!requestId) return null;
  return {
    requestId,
    signature: params.get('wallet_sign_signature') || undefined,
    address: params.get('wallet_sign_address') || undefined,
    cancelled: params.get('wallet_sign_cancelled') === '1',
  };
}

