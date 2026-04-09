const X_INVITE_QUERY_KEY = 'xInvite';
const LEGACY_INVITE_HASH_KEY = 'invite_code';
const LS_X_INVITE_CODE_KEY = 'x_invite_code';

function normalizeInviteCode(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function isLegacyAffiliateSecret(code: string): boolean {
  // Old affiliate links store a private key-like value in #invite_code.
  return code.startsWith('bb_') || code.startsWith('sk_');
}

export function parseXInviteCodeFromUrl(url: URL): string | undefined {
  const queryCode = normalizeInviteCode(url.searchParams.get(X_INVITE_QUERY_KEY));
  if (queryCode) return queryCode;

  const hashValue = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hashValue);
  const legacyCode = normalizeInviteCode(hashParams.get(LEGACY_INVITE_HASH_KEY));
  if (!legacyCode) return undefined;
  if (isLegacyAffiliateSecret(legacyCode)) return undefined;
  return legacyCode;
}

export function parseXInviteCodeFromWindow(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return parseXInviteCodeFromUrl(new URL(window.location.href));
}

export function storeXInviteCode(code: string | undefined) {
  if (typeof window === 'undefined') return;
  if (!code) {
    localStorage.removeItem(LS_X_INVITE_CODE_KEY);
    return;
  }
  localStorage.setItem(LS_X_INVITE_CODE_KEY, code);
}

export function getStoredXInviteCode(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return normalizeInviteCode(localStorage.getItem(LS_X_INVITE_CODE_KEY));
}

export function clearStoredXInviteCode() {
  storeXInviteCode(undefined);
}

export function buildFrontendXInviteLink(code: string): string {
  const safeCode = encodeURIComponent(code.trim());
  if (typeof window === 'undefined') return `/?xInvite=${safeCode}`;
  return `${window.location.origin}/?xInvite=${safeCode}`;
}

