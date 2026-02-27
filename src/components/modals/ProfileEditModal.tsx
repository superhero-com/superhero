import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ProfileAggregate,
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
import { getStoredXInviteCode } from '@/utils/xInvite';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
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

type ProfileFormState = {
  fullname: string;
  bio: string;
  avatarurl: string;
  username: string;
  chain_name: string;
};

type OwnedChainNameOption = {
  name: string;
  expiresAt: number | null;
};

const EMPTY_FORM: ProfileFormState = {
  fullname: '',
  bio: '',
  avatarurl: '',
  username: '',
  chain_name: '',
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]{2,32}$/;
const NONE_CHAIN_NAME_VALUE = '__none_chain_name__';

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
    canEdit,
  } = useProfile(address);
  const [connectingX, setConnectingX] = useState(false);
  const { push } = useToast();
  const { activeAccount } = useAeSdk();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasXVerified, setHasXVerified] = useState(false);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xSectionReady, setXSectionReady] = useState(false);
  const [availableChainNames, setAvailableChainNames] = useState<OwnedChainNameOption[]>([]);
  const xInviteCode = getStoredXInviteCode();
  const xSectionRef = useRef<HTMLDivElement | null>(null);
  const connectXButtonRef = useRef<HTMLButtonElement | null>(null);

  const trimmedForm = useMemo(() => ({
    fullname: form.fullname.trim(),
    bio: form.bio.trim(),
    avatarurl: form.avatarurl.trim(),
    username: form.username.trim(),
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
      let onChain: {
        x_username?: string | null;
        chain_name?: string | null;
        chain_expires_at?: number | null;
      } | null = null;

      try {
        const chain = await getProfileOnChain(targetAddress);
        onChain = chain;
        if (chain) {
          fullname = String(chain.fullname ?? '');
          bio = String(chain.bio ?? '');
          avatarurl = String(chain.avatarurl ?? '');
          username = String(chain.username ?? '');
          chainName = normalizeChainName(chain.chain_name ?? '');
          chainNameExpiresAt = toExpiryNumber(chain.chain_expires_at);
        }
      } catch {
        // ignore
      }

      // Use API only to fill any missing fields and X verification state
      let xVerified = !!(onChain?.x_username ?? '').trim();
      let xName: string | null = (onChain?.x_username ?? '').trim() || null;
      try {
        const acct = await getProfile(targetAddress);
        if (fullname === '' && (acct?.profile?.fullname ?? '') !== '') fullname = String(acct.profile.fullname);
        if (bio === '' && (acct?.profile?.bio ?? '') !== '') bio = String(acct.profile.bio ?? initialBio ?? '');
        if (avatarurl === '' && (acct?.profile?.avatarurl ?? '') !== '') avatarurl = String(acct.profile.avatarurl);
        if (username === '' && (acct?.profile?.username ?? '') !== '') {
          username = String(acct.profile.username);
        }
        if (chainName === '' && (acct?.profile?.chain_name ?? '') !== '') {
          chainName = normalizeChainName(acct.profile.chain_name);
        }
        const apiX = (acct?.profile?.x_username ?? '').trim();
        if (apiX) {
          xVerified = true;
          if (!xName) xName = apiX;
        }
      } catch {
        if (bio === '' && initialBio) bio = String(initialBio);
      }

      let ownedChainNames: OwnedChainNameOption[] = [];
      try {
        ownedChainNames = await loadOwnedChainNamesFromMdw(targetAddress);
      } catch {
        // ignore middleware loading errors and fallback to legacy account payload shape
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

      setHasXVerified(xVerified);
      setXUsername(xName);
      setForm({
        fullname,
        bio,
        avatarurl,
        username,
        chain_name: chainName,
      });
      setInitialForm({
        fullname,
        bio,
        avatarurl,
        username,
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
    if (trimmedForm.fullname.length > 64) return t('messages.invalidFullname');
    if (trimmedForm.bio.length > 280) return t('messages.invalidBioLength');
    if (trimmedForm.avatarurl) {
      if (trimmedForm.avatarurl.length > 500) return t('messages.invalidAvatarUrl');
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedForm.avatarurl);
      } catch {
        return t('messages.invalidAvatarUrl');
      }
    }
    if (trimmedForm.username && !USERNAME_REGEX.test(trimmedForm.username)) return t('messages.invalidUsername');
    return null;
  };

  const resolveErrorMessage = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error || '');
    const lower = msg.toLowerCase();
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) return t('messages.tooManyRequests');
    if (lower.includes('attestation')) return t('messages.failedXAttestation');
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
      const hasChanges = (
        trimmedForm.fullname !== initialForm.fullname.trim()
        || trimmedForm.bio !== initialForm.bio.trim()
        || trimmedForm.avatarurl !== initialForm.avatarurl.trim()
        || trimmedForm.username !== initialForm.username.trim()
        || trimmedForm.chain_name !== initialForm.chain_name.trim().toLowerCase()
      );
      if (!hasChanges) {
        const msg = t('messages.profileNothingToUpdate');
        setFormError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        return;
      }
      setLoading(true);
      setFormError(null);
      await setProfile({
        fullname: trimmedForm.fullname,
        bio: trimmedForm.bio,
        avatarurl: trimmedForm.avatarurl,
        username: trimmedForm.username,
        chainName: trimmedForm.chain_name,
        chainExpiresAt: selectedChainOption?.expiresAt ?? null,
      });
      const updated = await getProfile(targetAddress);
      if (!updated) {
        throw new Error(t('messages.failedToRefreshProfile'));
      }
      queryClient.setQueryData(['AccountsService.getAccount', targetAddress], (prev: any) => ({
        ...prev,
        bio: updated?.profile?.bio ?? prev?.bio,
        fullname: updated?.profile?.fullname ?? prev?.fullname,
        avatarurl: updated?.profile?.avatarurl ?? prev?.avatarurl,
        username: updated?.profile?.username ?? prev?.username,
        chain_name: updated?.profile?.chain_name ?? prev?.chain_name,
        x_username: updated?.profile?.x_username ?? prev?.x_username,
      }));
      push(<div>{t('messages.profileUpdated')}</div>);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] shadow-[var(--glass-shadow)]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {t('titles.editProfile')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-white/80">{t('labels.username')}</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder={t('placeholders.username')}
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)]"
              maxLength={32}
            />
          </div>
          <div>
            <Label className="text-white/80">{t('labels.chainName')}</Label>
            <AppSelect
              value={form.chain_name || NONE_CHAIN_NAME_VALUE}
              onValueChange={(value) => setForm((prev) => ({
                ...prev,
                chain_name: value === NONE_CHAIN_NAME_VALUE ? '' : value,
              }))}
              triggerClassName="mt-1 w-full h-10 px-3 bg-white/7 border border-white/14 text-white rounded-xl focus:ring-0 focus:border-[var(--neon-teal)]"
              contentClassName="z-[100] bg-[#10131a] border border-white/20 text-white shadow-2xl backdrop-blur-none"
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
              <p className="mt-1 text-[11px] text-white/50">{t('messages.noChainNamesFound')}</p>
            )}
          </div>
          {(CONFIG as any).X_OAUTH_CLIENT_ID ? (
            <div ref={xSectionRef}>
              {xSectionReady && (
                <Label className="text-white/80">
                  {hasXVerified ? t('labels.xAccount') : t('labels.connectX')}
                </Label>
              )}
              {!xSectionReady && (
                <div className="mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/14 px-3 py-6">
                  <Spinner className="w-5 h-5 text-white/60" />
                  <span className="text-xs text-white/50">{t('messages.loading')}</span>
                </div>
              )}
              {xSectionReady && !hasXVerified && (
                <>
                  {xInviteCode && (
                    <div className="mb-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
                      You were invited by a friend. Connect X to complete the invite mission.
                    </div>
                  )}
                  <p className="text-xs text-white/60 mt-0.5 mb-2">
                    {t('messages.connectXHint')}
                  </p>
                  <Button
                    ref={connectXButtonRef}
                    type="button"
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    disabled={connectingX || !canEdit}
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
                    {connectingX ? t('messages.connectingX') : t('buttons.connectX')}
                  </Button>
                </>
              )}
              {xSectionReady && hasXVerified && xUsername && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/14 px-3 py-2">
                  <Check className="w-4 h-4 shrink-0 text-[var(--neon-teal)]" aria-hidden />
                  <span className="text-sm text-white/90">
                    {`@${xUsername.replace(/^@/u, '')}`}
                  </span>
                </div>
              )}
            </div>
          ) : null}
          <div>
            <Label className="text-white/80">{t('labels.fullname')}</Label>
            <Input
              value={form.fullname}
              onChange={(e) => setForm((prev) => ({ ...prev, fullname: e.target.value }))}
              placeholder={t('placeholders.fullname')}
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)]"
              maxLength={64}
            />
          </div>
          <div>
            <Label className="text-white/80">{t('labels.bio')}</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder={t('placeholders.bio')}
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)]"
              maxLength={280}
            />
            <div className="mt-1 text-white/50 text-xs text-right">
              {form.bio.length}
              /
              280
            </div>
          </div>
          <div>
            <Label className="text-white/80">{t('labels.avatarurl')}</Label>
            <Input
              value={form.avatarurl}
              onChange={(e) => setForm((prev) => ({ ...prev, avatarurl: e.target.value }))}
              placeholder={t('placeholders.avatarurl')}
              className="mt-1 bg-white/7 border border-white/14 text-white rounded-xl focus-visible:ring-0 focus:border-[var(--neon-teal)]"
              maxLength={500}
            />
          </div>
          {formError ? <p className="text-xs text-red-300">{formError}</p> : null}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={onSave} disabled={loading || !canEdit}>
              {loading ? t('messages.savingProfile') : t('buttons.saveProfile')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
