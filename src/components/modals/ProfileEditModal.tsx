import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLinkedBio,
  getLinkedXUsername,
  patchAccountCacheEntry,
  profileAggregateFromSources,
  ProfileAggregate,
  SuperheroApi,
} from '@/api/backend';
import { CONFIG } from '@/config';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useProfile } from '@/hooks/useProfile';
import {
  buildXAuthorizeUrl,
  generateCodeVerifier,
  generateOAuthState,
  getXCallbackRedirectUri,
  storeXOAuthPKCE,
} from '@/utils/xOAuth';
import { useQueryClient } from '@tanstack/react-query';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { Check, Globe } from 'lucide-react';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import Spinner from '@/components/Spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ToastProvider';

type EditableFormState = {
  bio: string;
  website: string;
  chain_name: string;
};

type PreservedProfileState = {
  fullname: string;
  username: string;
};

type OwnedChainNameOption = {
  name: string;
  expiresAt: number | null;
};

const EMPTY_FORM: EditableFormState = {
  bio: '',
  website: '',
  chain_name: '',
};

const EMPTY_PRESERVED: PreservedProfileState = {
  fullname: '',
  username: '',
};

const NONE_CHAIN_NAME_VALUE = '__none_chain_name__';

const CHAIN_NAME_LABEL_CLASS = 'text-white/70 text-[11px] tracking-wider font-semibold';
const FIELD_LABEL_CLASS = 'text-white/70 text-[11px] uppercase tracking-wider font-semibold';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      fill="currentColor"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.734l7.73-8.835L1.254 2.25H8.08l4.264 5.634zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </svg>
);

const formatChainNameLabel = (name: string) => (
  name.endsWith('.chain') ? name : `${name}.chain`
);

const GLASS_CARD_STYLE = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
} as const;

const NEON_ACTION_BUTTON_STYLE = {
  background: 'rgba(0,255,157,0.1)',
  borderColor: 'rgba(0,255,157,0.35)',
  color: 'var(--neon-teal)',
} as const;

const normalizeChainName = (value: unknown): string => String(value || '').trim().toLowerCase();
const toExpiryNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) && typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
};

function extractOwnedChainNames(payload: any): OwnedChainNameOption[] {
  const byName = new Map<string, OwnedChainNameOption>();
  const addCandidate = (nameLike: unknown, expiryLike?: unknown) => {
    const name = normalizeChainName(nameLike);
    if (!name) return;
    const expiry = toExpiryNumber(expiryLike);
    const prev = byName.get(name);
    if (!prev || ((!prev.expiresAt || prev.expiresAt <= 0) && expiry)) {
      byName.set(name, { name, expiresAt: expiry });
    }
  };

  const parseEntry = (entry: unknown) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      addCandidate(entry);
      return;
    }
    if (typeof entry !== 'object') return;
    const obj = entry as Record<string, unknown>;
    addCandidate(
      obj.name ?? obj.chain_name ?? obj.chainName ?? obj.label,
      obj.approximate_expire_time
        ?? obj.approximateExpireTime
        ?? obj.approximate_expiration_time
        ?? obj.approximateExpirationTime
        ?? obj.expire_time
        ?? obj.expireTime
        ?? obj.expires_at
        ?? obj.expiresAt
        ?? obj.expire_height
        ?? obj.expireHeight
        ?? obj.expiration
        ?? obj.height,
    );
  };

  const parseCollection = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(parseEntry);
      return;
    }
    if (typeof value !== 'object') return;
    const obj = value as Record<string, unknown>;
    parseEntry(obj);
    Object.entries(obj).forEach(([key, entryValue]) => {
      if (typeof key === 'string' && key.includes('.')) {
        if (entryValue && typeof entryValue === 'object') {
          const asObj = entryValue as Record<string, unknown>;
          addCandidate(
            key,
            asObj.approximate_expire_time
              ?? asObj.approximateExpireTime
              ?? asObj.approximate_expiration_time
              ?? asObj.approximateExpirationTime
              ?? asObj.expire_time
              ?? asObj.expireTime
              ?? asObj.expires_at
              ?? asObj.expiresAt
              ?? asObj.expire_height
              ?? asObj.expireHeight,
          );
        } else {
          addCandidate(key, entryValue);
        }
      } else {
        parseEntry(entryValue);
      }
    });
  };

  parseCollection(payload?.names);
  parseCollection(payload?.chain_names);
  parseCollection(payload?.chainNames);
  parseCollection(payload?.owned_names);
  parseCollection(payload?.ownedNames);
  parseCollection(payload?.aens_names);
  parseCollection(payload?.aensNames);
  addCandidate(payload?.chain_name, payload?.chain_expires_at);

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function extractOwnedChainNamesFromMdw(payload: any): OwnedChainNameOption[] {
  const rows: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const byName = new Map<string, OwnedChainNameOption>();
  rows.forEach((row) => {
    const name = normalizeChainName(row?.name);
    if (!name) return;
    const expiresAt = toExpiryNumber(
      row?.info?.approximate_expire_time
        ?? row?.info?.approximateExpireTime
        ?? row?.approximate_expire_time
        ?? row?.approximateExpireTime
        ?? row?.info?.expire_time
        ?? row?.info?.expireTime
        ?? row?.info?.expires_at
        ?? row?.info?.expiresAt
        ?? row?.info?.expire_height
        ?? row?.info?.expireHeight
        ?? row?.expires_at
        ?? row?.expire_height,
    );
    const prev = byName.get(name);
    if (!prev || ((!prev.expiresAt || prev.expiresAt <= 0) && expiresAt)) {
      byName.set(name, { name, expiresAt });
    }
  });
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadOwnedChainNamesFromMdw(address: string): Promise<OwnedChainNameOption[]> {
  const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
  if (!base || !address) return [];

  const byName = new Map<string, OwnedChainNameOption>();
  const toCursorUrl = (cursor: string): string => {
    if (cursor.startsWith('http')) return cursor;
    if (cursor.startsWith('/mdw/')) {
      try {
        const { origin } = new URL(base);
        return `${origin}${cursor}`;
      } catch {
        return `${base}${cursor}`;
      }
    }
    return `${base}${cursor.startsWith('/') ? '' : '/'}${cursor}`;
  };

  const loadPage = async (cursor: string, remainingPages: number): Promise<void> => {
    if (!cursor || remainingPages <= 0) return;
    const res = await fetch(toCursorUrl(cursor), { cache: 'no-cache' });
    if (!res.ok) return;
    const json = await res.json();
    const page = extractOwnedChainNamesFromMdw(json);
    page.forEach((item) => {
      const prev = byName.get(item.name);
      if (!prev || ((!prev.expiresAt || prev.expiresAt <= 0) && item.expiresAt)) {
        byName.set(item.name, item);
      }
    });
    const { next } = json || {};
    if (typeof next === 'string' && next.length > 0) {
      await loadPage(next, remainingPages - 1);
    }
  };

  await loadPage(`/v2/names?owned_by=${encodeURIComponent(address)}&state=active&limit=100`, 300);

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const ProfileEditModal = ({
  open,
  onClose,
  address,
  initialBio,
  initialSection = 'profile',
}: {
  open: boolean;
  onClose: (updatedProfile?: ProfileAggregate) => void;
  address?: string;
  initialBio?: string;
  initialSection?: 'profile' | 'x';
}) => {
  const { t } = useTranslation('common');
  const {
    getProfile,
    getProfileOnChain,
    setProfile,
    linkBio,
    unlinkBio,
    canEdit,
  } = useProfile(address);
  const [connectingX, setConnectingX] = useState(false);
  const { push } = useToast();
  const { activeAccount } = useAeSdk();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditableFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<EditableFormState>(EMPTY_FORM);
  const [preservedProfile, setPreservedProfile] = useState<PreservedProfileState>(EMPTY_PRESERVED);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasXVerified, setHasXVerified] = useState(false);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xSectionReady, setXSectionReady] = useState(false);
  const [availableChainNames, setAvailableChainNames] = useState<OwnedChainNameOption[]>([]);
  const [chainPickerOpen, setChainPickerOpen] = useState(false);
  const [pickerChainName, setPickerChainName] = useState(NONE_CHAIN_NAME_VALUE);
  const xSectionRef = useRef<HTMLDivElement | null>(null);
  const connectXButtonRef = useRef<HTMLButtonElement | null>(null);

  const trimmedForm = useMemo(() => ({
    bio: form.bio.trim(),
    website: form.website.trim(),
    chain_name: form.chain_name.trim().toLowerCase(),
  }), [form]);
  const selectedChainOption = useMemo(
    () => availableChainNames.find((item) => item.name === trimmedForm.chain_name) || null,
    [availableChainNames, trimmedForm.chain_name],
  );

  useEffect(() => {
    async function load() {
      if (!open) return;
      setFormError(null);
      if ((CONFIG as any).X_OAUTH_CLIENT_ID) setXSectionReady(false);
      const targetAddress = (address as string) || (activeAccount as string);
      if (!targetAddress) return;

      // Prefill from on-chain first (source of truth for fullname, bio, avatarurl, username)
      let fullname = '';
      let bio = '';
      let avatarurl = '';
      let username = '';
      let chainName = '';
      let chainNameExpiresAt: number | null = null;

      let chainProfile: Awaited<ReturnType<typeof getProfileOnChain>> | null = null;
      try {
        chainProfile = await getProfileOnChain(targetAddress);
        if (chainProfile) {
          fullname = String(chainProfile.fullname ?? '');
          avatarurl = String(chainProfile.avatarurl ?? '');
          username = String(chainProfile.username ?? '');
          chainName = normalizeChainName(chainProfile.chain_name ?? '');
          chainNameExpiresAt = toExpiryNumber(chainProfile.chain_expires_at);
        }
      } catch {
        // ignore
      }

      let xName: string | null = null;
      let accountRecord: Awaited<ReturnType<typeof SuperheroApi.getAccount>> | null = null;
      try {
        accountRecord = await SuperheroApi.getAccount(targetAddress);
        xName = getLinkedXUsername(accountRecord);
        const linkedBio = getLinkedBio(accountRecord);
        if (linkedBio) bio = linkedBio;
      } catch {
        // ignore account fetch errors; X section falls back to unlinked
      }

      // Use profile API only to fill any missing profile fields
      try {
        const acct = await getProfile(targetAddress);
        if (fullname === '' && (acct?.profile?.fullname ?? '') !== '') fullname = String(acct.profile.fullname);
        if (bio === '') {
          const linkedBio = getLinkedBio(acct);
          if (linkedBio) bio = linkedBio;
          else if ((acct?.profile?.bio ?? '') !== '') bio = String(acct.profile.bio ?? initialBio ?? '');
        }
        if (avatarurl === '' && (acct?.profile?.avatarurl ?? '') !== '') avatarurl = String(acct.profile.avatarurl);
        if (username === '' && (acct?.profile?.username ?? '') !== '') {
          username = String(acct.profile.username);
        }
        if (chainName === '' && (acct?.profile?.chain_name ?? '') !== '') {
          chainName = normalizeChainName(acct.profile.chain_name);
        }
      } catch {
        if (bio === '' && initialBio) bio = String(initialBio);
      }

      if (bio === '' && chainProfile?.bio) {
        bio = String(chainProfile.bio);
      }

      let ownedChainNames: OwnedChainNameOption[] = [];
      try {
        ownedChainNames = await loadOwnedChainNamesFromMdw(targetAddress);
      } catch {
        // ignore middleware loading errors and fallback to legacy account payload shape
      }
      if (!ownedChainNames.length && accountRecord) {
        ownedChainNames = extractOwnedChainNames(accountRecord);
      }
      if (!ownedChainNames.length) {
        try {
          const acct = await getProfile(targetAddress);
          ownedChainNames = extractOwnedChainNames(acct);
        } catch {
          // ignore fallback loading errors and keep the form usable
        }
      }
      if (chainName && !ownedChainNames.some((item) => item.name === chainName)) {
        ownedChainNames = [
          { name: chainName, expiresAt: chainNameExpiresAt },
          ...ownedChainNames,
        ];
      }
      setAvailableChainNames(ownedChainNames);

      setHasXVerified(Boolean(xName));
      setXUsername(xName);
      setPreservedProfile({ fullname, username });
      setForm({
        bio,
        website: avatarurl,
        chain_name: chainName,
      });
      setInitialForm({
        bio,
        website: avatarurl,
        chain_name: chainName,
      });
      if ((CONFIG as any).X_OAUTH_CLIENT_ID) setXSectionReady(true);
    }
    load();
  }, [open, address, getProfile, getProfileOnChain, initialBio, activeAccount]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFormError(null);
      setChainPickerOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || initialSection !== 'x') return;
    window.setTimeout(() => {
      xSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      connectXButtonRef.current?.focus();
    }, 120);
  }, [open, initialSection, xSectionReady, hasXVerified]);

  const validateForm = (): string | null => {
    if (trimmedForm.bio.length > 200) return t('messages.invalidBioLength');
    if (trimmedForm.website) {
      if (trimmedForm.website.length > 500) return t('messages.invalidAvatarUrl');
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedForm.website);
      } catch {
        return t('messages.invalidAvatarUrl');
      }
    }
    return null;
  };

  const openChainPicker = () => {
    setPickerChainName(form.chain_name || NONE_CHAIN_NAME_VALUE);
    setChainPickerOpen(true);
  };

  const applyChainPicker = () => {
    setForm((prev) => ({
      ...prev,
      chain_name: pickerChainName === NONE_CHAIN_NAME_VALUE ? '' : pickerChainName,
    }));
    setChainPickerOpen(false);
  };

  const resolveErrorMessage = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error || '');
    const lower = msg.toLowerCase();
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) return t('messages.tooManyRequests');
    if (lower.includes('attestation') || lower.includes('address link') || lower.includes('verification_token')) {
      return t('messages.failedAddressLink');
    }
    if (lower.includes('profile_registry_contract_address')) return t('messages.profileContractNotConfigured');
    return msg || t('messages.failedToUpdateProfile');
  };

  const handleClose = () => onClose();
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
    }
  };

  async function onSave() {
    try {
      const targetAddress = (address as string) || (activeAccount as string);
      if (!targetAddress || !activeAccount) {
        const msg = t('messages.connectWalletToEditProfile');
        setFormError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        return;
      }
      const validationError = validateForm();
      if (validationError) {
        setFormError(validationError);
        push(<div style={{ color: '#ffb3b3' }}>{validationError}</div>);
        return;
      }
      const bioChanged = trimmedForm.bio !== initialForm.bio.trim();
      const otherChanged = (
        trimmedForm.website !== initialForm.website.trim()
        || trimmedForm.chain_name !== initialForm.chain_name.trim().toLowerCase()
      );
      if (!bioChanged && !otherChanged) {
        const msg = t('messages.profileNothingToUpdate');
        setFormError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        return;
      }
      setLoading(true);
      setFormError(null);
      if (bioChanged) {
        if (trimmedForm.bio) {
          await linkBio({ address: targetAddress, bio: trimmedForm.bio });
        } else {
          await unlinkBio(targetAddress);
        }
      }
      if (otherChanged) {
        await setProfile({
          fullname: preservedProfile.fullname,
          bio: '',
          avatarurl: trimmedForm.website,
          username: preservedProfile.username,
          chainName: trimmedForm.chain_name,
          chainExpiresAt: selectedChainOption?.expiresAt ?? null,
        });
      }
      const prevProfile = queryClient.getQueryData<ProfileAggregate | null>(
        ['SuperheroApi.getProfile', targetAddress],
      );
      const [profileResult, accountResult] = await Promise.allSettled([
        SuperheroApi.getProfile(targetAddress),
        SuperheroApi.getAccount(targetAddress),
      ]);
      const accountRecord = accountResult.status === 'fulfilled' ? accountResult.value : null;
      const profileFromApi = profileResult.status === 'fulfilled' ? profileResult.value : null;

      if (accountRecord) {
        queryClient.setQueryData(['AccountsService.getAccount', targetAddress], accountRecord);
      }

      let updated: ProfileAggregate;
      if (accountRecord) {
        updated = profileAggregateFromSources(
          { address: targetAddress, ...accountRecord },
          profileFromApi ?? prevProfile,
        );
      } else if (profileFromApi) {
        updated = profileFromApi;
      } else if (prevProfile) {
        updated = prevProfile;
      } else {
        updated = profileAggregateFromSources(
          { address: targetAddress, links: { bio: trimmedForm.bio || null } },
          null,
        );
      }

      if (bioChanged) {
        updated = {
          ...updated,
          profile: {
            ...updated.profile,
            bio: trimmedForm.bio,
          },
        };
      }

      if (!updated?.address) {
        throw new Error(t('messages.failedToRefreshProfile'));
      }

      queryClient.setQueryData(['SuperheroApi.getProfile', targetAddress], updated);
      queryClient.setQueryData(
        ['AccountsService.getAccount', targetAddress],
        (prev: Record<string, unknown> | undefined) => patchAccountCacheEntry(prev, {
          updatedProfile: updated,
          bioChanged,
          formBio: trimmedForm.bio,
        }),
      );
      let successMessage = t('messages.profileUpdated');
      if (bioChanged && !otherChanged) {
        successMessage = trimmedForm.bio
          ? t('messages.bioLinkSuccess')
          : t('messages.bioUnlinkSuccess');
      }
      push(<div>{successMessage}</div>);
      onClose(updated);
    } catch (e) {
      const msg = resolveErrorMessage(e);
      setFormError(msg);
      push(
        <div style={{ color: '#ffb3b3' }}>
          {msg}
        </div>,
      );
    } finally {
      setLoading(false);
    }
  }

  const targetAddress = (address as string) || (activeAccount as string);
  const selectedChainLabel = trimmedForm.chain_name
    ? formatChainNameLabel(trimmedForm.chain_name)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={[
            'w-[95vw] max-w-sm mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          ].join(' ')}
        >
          <div className="relative rounded-3xl overflow-hidden" style={GLASS_CARD_STYLE}>
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
            />
            <div
              className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, var(--neon-teal) 0%, transparent 70%)', filter: 'blur(32px)' }}
            />

            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <DialogHeader>
                <DialogTitle className="text-white font-bold text-base tracking-tight">
                  {t('titles.editSuperheroId')}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-4">
              {targetAddress ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-2xl opacity-60 blur-xl"
                      style={{ background: 'var(--neon-teal)' }}
                    />
                    <AddressAvatarWithChainName
                      address={targetAddress}
                      size={72}
                      showAddressAndChainName={false}
                      className="relative"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <Label className={CHAIN_NAME_LABEL_CLASS}>.chain name</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2 min-w-0">
                    {selectedChainLabel ? (
                      <>
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--neon-teal)' }}
                        >
                          {selectedChainLabel}
                        </span>
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--neon-teal)' }} />
                      </>
                    ) : (
                      <span className="text-sm text-white/40 italic">SuperheroUser.chain</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openChainPicker}
                    className="shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold border border-solid transition-colors whitespace-nowrap"
                    style={NEON_ACTION_BUTTON_STYLE}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,157,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = NEON_ACTION_BUTTON_STYLE.background;
                    }}
                  >
                    {selectedChainLabel ? t('buttons.changeChainName') : t('buttons.buyChainName')}
                  </button>
                </div>
              </div>

              {(CONFIG as any).X_OAUTH_CLIENT_ID ? (
                <div ref={xSectionRef}>
                  <Label className={FIELD_LABEL_CLASS}>X (Twitter)</Label>
                  {!xSectionReady && (
                    <div className="mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-6">
                      <Spinner className="w-5 h-5 text-white/60" />
                      <span className="text-xs text-white/50">{t('messages.loading')}</span>
                    </div>
                  )}
                  {xSectionReady && !hasXVerified && (
                    <button
                      ref={connectXButtonRef}
                      type="button"
                      disabled={connectingX || !canEdit}
                      className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2.5 text-sm text-white/60 hover:text-white hover:border-white/40 hover:bg-white/[0.04] transition-all disabled:opacity-50 disabled:pointer-events-none"
                      onClick={async () => {
                        const targetAddr = (address as string) || (activeAccount as string);
                        if (!targetAddr) return;
                        setConnectingX(true);
                        try {
                          const redirectUri = getXCallbackRedirectUri();
                          const state = generateOAuthState();
                          const codeVerifier = generateCodeVerifier();
                          storeXOAuthPKCE({
                            state,
                            codeVerifier,
                            address: targetAddr,
                            redirectUri,
                          });
                          const url = await buildXAuthorizeUrl({
                            clientId: (CONFIG as any).X_OAUTH_CLIENT_ID,
                            redirectUri,
                            state,
                            codeVerifier,
                          });
                          window.location.href = url;
                        } catch (e) {
                          setFormError(resolveErrorMessage(e));
                        } finally {
                          setConnectingX(false);
                        }
                      }}
                    >
                      <XIcon className="w-4 h-4 fill-current" />
                      {connectingX ? t('messages.connectingX') : 'Link account'}
                    </button>
                  )}
                  {xSectionReady && hasXVerified && xUsername && (
                    <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2">
                      <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--neon-teal)' }} aria-hidden />
                      <span className="text-sm text-white/90">
                        {`@${xUsername.replace(/^@/u, '')}`}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <Label className={FIELD_LABEL_CLASS}>Website</Label>
                <div className="relative mt-1.5">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                  <Input
                    value={form.website}
                    onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yoursite.com"
                    className="pl-8 bg-white/[0.06] border border-white/12 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)] placeholder:text-white/30 text-sm"
                    maxLength={200}
                  />
                </div>
              </div>

              <div>
                <Label className={FIELD_LABEL_CLASS}>Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell the world about yourself…"
                  className="mt-1.5 bg-white/[0.06] border border-white/12 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)] placeholder:text-white/30 text-sm resize-none min-h-[72px]"
                  maxLength={200}
                />
                <div className="mt-1 text-right text-[10px] text-white/35">
                  {form.bio.length}
                  /200
                </div>
              </div>

              {formError ? <p className="text-xs text-red-300">{formError}</p> : null}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={onSave}
                  disabled={loading || !canEdit}
                  className="flex-1 rounded-xl font-semibold disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-teal) 0%, #00c97e 100%)',
                    color: '#0a0a0a',
                  }}
                >
                  {loading ? t('messages.savingProfile') : t('buttons.save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chainPickerOpen} onOpenChange={setChainPickerOpen}>
        <DialogContent
          className={[
            'w-[95vw] max-w-sm mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          ].join(' ')}
        >
          <div className="relative rounded-3xl overflow-hidden" style={GLASS_CARD_STYLE}>
            <div className="px-5 py-5 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-white font-bold text-base tracking-tight">
                  {t('titles.selectChainName')}
                </DialogTitle>
              </DialogHeader>

              <div>
                <Label className={CHAIN_NAME_LABEL_CLASS}>.chain name</Label>
                <AppSelect
                  value={pickerChainName}
                  onValueChange={setPickerChainName}
                  triggerClassName="mt-1.5 w-full h-10 px-3 bg-white/[0.06] border border-white/12 text-white rounded-xl focus:ring-0 focus:border-[var(--neon-teal)] text-sm"
                  contentClassName="z-[110] bg-[#10131a] border border-white/20 text-white shadow-2xl backdrop-blur-none"
                  itemClassName="text-white focus:bg-white/10 data-[state=checked]:bg-white/10"
                  placeholder={t('placeholders.selectChainName')}
                >
                  <AppSelectItem value={NONE_CHAIN_NAME_VALUE}>{t('labels.none')}</AppSelectItem>
                  {availableChainNames.map((item) => (
                    <AppSelectItem key={item.name} value={item.name}>
                      {item.name}
                    </AppSelectItem>
                  ))}
                </AppSelect>
                {!availableChainNames.length && (
                  <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
                    {t('messages.noChainNamesFound')}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setChainPickerOpen(false)}
                  className="flex-1 border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl"
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={applyChainPicker}
                  className="flex-1 rounded-xl font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-teal) 0%, #00c97e 100%)',
                    color: '#0a0a0a',
                  }}
                >
                  {t('buttons.apply')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileEditModal;
