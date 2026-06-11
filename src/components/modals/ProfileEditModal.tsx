import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import {
  getLinkedBio,
  getLinkedPreferredAensName,
  getLinkedSite,
  getLinkedXUsername,
  patchAccountCacheEntry,
  profileAggregateFromSources,
  ProfileAggregate,
  type ChainNameClaimStatusResponse,
  type ChainNameSponsorshipResponse,
  SuperheroApi,
} from '@/api/backend';
import { CONFIG } from '@/config';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useModal } from '@/hooks/useModal';
import { useProfile } from '@/hooks/useProfile';
import { useClaimChainName } from '@/hooks/useClaimChainName';
import {
  CLAIMABLE_CHAIN_NAME_LABEL_REGEX,
  computeSelfFundedClaimAe,
  resolveClaimErrorMessage,
  resolveClaimNotificationStep,
} from '@/utils/claimChainName';
import { normalizeChainNameLabel } from '@/utils/chainNames';
import {
  TxPayloadType,
  useTransactionNotification,
} from '@/features/transaction-notification';
import {
  buildXAuthorizeUrl,
  generateCodeVerifier,
  generateOAuthState,
  getXCallbackRedirectUri,
  storeXOAuthPKCE,
} from '@/utils/xOAuth';
import { useQueryClient } from '@tanstack/react-query';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import {
  Check, Globe,
} from 'lucide-react';
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

type OwnedChainNameOption = {
  name: string;
  expiresAt: number | null;
};

const EMPTY_FORM: EditableFormState = {
  bio: '',
  website: '',
  chain_name: '',
};

const NONE_CHAIN_NAME_VALUE = '__none_chain_name__';

const AVAILABILITY_CHECK_DELAY_MS = 500;
const SPONSORSHIP_CHECK_DELAY_MS = 500;

type NameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable';
type SponsorshipStatus = 'idle' | 'checking' | 'resolved';

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
    linkBio,
    unlinkBio,
    linkSite,
    unlinkSite,
    linkPreferredAensName,
    unlinkPreferredAensName,
    canEdit,
  } = useProfile(address);
  const {
    claimSponsoredChainName,
    claimSelfFundedChainName,
    claimAddress,
    canClaim,
    checkNameAvailability,
  } = useClaimChainName(address);
  const {
    notifySubmitted,
    notifyPending,
    notifyConfirmed,
    notifyError,
  } = useTransactionNotification();
  const setChainNames = useSetAtom(chainNamesAtom);
  const [connectingX, setConnectingX] = useState(false);
  const { push } = useToast();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditableFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<EditableFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasXVerified, setHasXVerified] = useState(false);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [xSectionReady, setXSectionReady] = useState(false);
  const [availableChainNames, setAvailableChainNames] = useState<OwnedChainNameOption[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimValue, setClaimValue] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<NameAvailabilityStatus>('idle');
  const [lastCheckedValue, setLastCheckedValue] = useState('');
  const [sponsorship, setSponsorship] = useState<ChainNameSponsorshipResponse | null>(null);
  const [sponsorshipStatus, setSponsorshipStatus] = useState<SponsorshipStatus>('idle');
  const xSectionRef = useRef<HTMLDivElement | null>(null);
  const connectXButtonRef = useRef<HTMLButtonElement | null>(null);
  const submittedRef = useRef(false);
  const availabilityRequestIdRef = useRef(0);
  const sponsorshipRequestIdRef = useRef(0);

  const trimmedForm = useMemo(() => ({
    bio: form.bio.trim(),
    website: form.website.trim(),
    chain_name: form.chain_name.trim().toLowerCase(),
  }), [form]);
  useEffect(() => {
    async function load() {
      if (!open) return;
      setFormError(null);
      if ((CONFIG as any).X_OAUTH_CLIENT_ID) setXSectionReady(false);
      const targetAddress = (address as string) || (activeAccount as string);
      if (!targetAddress) return;

      // Prefill from profile API first (bio, website/site, chain name)
      let bio = '';
      let site = '';
      let chainName = '';
      let chainNameExpiresAt: number | null = null;

      let chainProfile: Awaited<ReturnType<typeof getProfileOnChain>> | null = null;
      try {
        chainProfile = await getProfileOnChain(targetAddress);
        if (chainProfile) {
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
        const linkedSite = getLinkedSite(accountRecord);
        if (linkedSite) site = linkedSite;
        const linkedPreferredName = getLinkedPreferredAensName(accountRecord);
        if (linkedPreferredName) chainName = linkedPreferredName;
      } catch {
        // ignore account fetch errors; X section falls back to unlinked
      }

      // Use profile API only to fill any missing profile fields
      try {
        const acct = await getProfile(targetAddress);
        if (bio === '') {
          const linkedBio = getLinkedBio(acct);
          if (linkedBio) bio = linkedBio;
          else if ((acct?.profile?.bio ?? '') !== '') bio = String(acct.profile.bio ?? initialBio ?? '');
        }
        if (chainName === '') {
          const linkedPreferredName = getLinkedPreferredAensName(acct);
          if (linkedPreferredName) chainName = linkedPreferredName;
          else if ((acct?.profile?.chain_name ?? '') !== '') {
            chainName = normalizeChainName(acct.profile.chain_name);
          }
        }
      } catch {
        if (bio === '' && initialBio) bio = String(initialBio);
      }

      if (bio === '' && chainProfile?.bio) {
        bio = String(chainProfile.bio);
      }
      if (chainName === '' && chainProfile?.chain_name) {
        chainName = normalizeChainName(chainProfile.chain_name);
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
      setForm({
        bio,
        website: site,
        chain_name: chainName,
      });
      setInitialForm({
        bio,
        website: site,
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
      setClaiming(false);
      setClaimValue('');
      setClaimError(null);
      setAvailabilityStatus('idle');
      setLastCheckedValue('');
      setSponsorship(null);
      setSponsorshipStatus('idle');
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
    // Only validate the website when the user actually changed it. An unchanged value
    // (e.g. an externally/legacy-set link) must not block unrelated edits like clearing the bio.
    const websiteChanged = trimmedForm.website !== initialForm.website.trim();
    if (websiteChanged && trimmedForm.website) {
      if (trimmedForm.website.length > 500) return t('messages.invalidWebsiteUrl');
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedForm.website);
      } catch {
        return t('messages.invalidWebsiteUrl');
      }
    }
    return null;
  };

  // When the user already owns names, they pick the preferred one from a dropdown.
  const handleChainNameSelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      chain_name: value === NONE_CHAIN_NAME_VALUE ? '' : value,
    }));
  };

  // When the user owns no names, they type one to claim it. Mirrors the standalone claim flow.
  const normalizedClaimValue = useMemo(() => normalizeChainNameLabel(claimValue), [claimValue]);
  const normalizedClaimValueLength = normalizedClaimValue.length;
  const validateClaimChainName = (name: string): string | null => {
    if (!name) return t('messages.chainNameClaimRequired');
    if (!CLAIMABLE_CHAIN_NAME_LABEL_REGEX.test(name)) return t('messages.chainNameClaimInvalidChars');
    if (name.length <= 12) return t('messages.chainNameClaimTooShort');
    return null;
  };
  const claimValidationError = validateClaimChainName(normalizedClaimValue);
  const isClaimTooShort = Boolean(normalizedClaimValue && normalizedClaimValueLength <= 12);

  // Price the user pays when claiming themselves (sponsor can't fund it), computed locally.
  const selfFundedPriceAe = useMemo(() => {
    if (!normalizedClaimValue || claimValidationError) return null;
    try {
      return computeSelfFundedClaimAe(`${normalizedClaimValue}.chain`).toFixed(4);
    } catch {
      return null;
    }
  }, [normalizedClaimValue, claimValidationError]);

  // Throttled availability check for the typed name (only relevant while claiming a new name).
  useEffect(() => {
    if (!open || availableChainNames.length > 0) return undefined;

    availabilityRequestIdRef.current += 1;
    const requestId = availabilityRequestIdRef.current;

    if (!normalizedClaimValue || claimValidationError) {
      setAvailabilityStatus('idle');
      setLastCheckedValue('');
      return undefined;
    }

    setAvailabilityStatus('checking');

    const timeoutId = window.setTimeout(() => {
      checkNameAvailability(normalizedClaimValue)
        .then((isAvailable) => {
          if (availabilityRequestIdRef.current !== requestId) return;
          setLastCheckedValue(normalizedClaimValue);
          setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');
          if (isAvailable) {
            setClaimError((currentError) => (
              currentError === t('messages.chainNameClaimNameTaken') ? null : currentError
            ));
            return;
          }
          setClaimError(t('messages.chainNameClaimNameTaken'));
        })
        .catch(() => {
          if (availabilityRequestIdRef.current !== requestId) return;
          setLastCheckedValue(normalizedClaimValue);
          setAvailabilityStatus('idle');
          setClaimError((currentError) => (
            currentError === t('messages.chainNameClaimNameTaken') ? null : currentError
          ));
        });
    }, AVAILABILITY_CHECK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    availableChainNames.length,
    checkNameAvailability,
    normalizedClaimValue,
    open,
    t,
    claimValidationError,
  ]);

  // Throttled check of whether the sponsor account can fund this name. Drives the
  // "Free" / price hint and decides whether the claim is sponsored or self-funded.
  useEffect(() => {
    if (!open || availableChainNames.length > 0) return undefined;

    sponsorshipRequestIdRef.current += 1;
    const requestId = sponsorshipRequestIdRef.current;

    if (!normalizedClaimValue || claimValidationError) {
      setSponsorship(null);
      setSponsorshipStatus('idle');
      return undefined;
    }

    setSponsorshipStatus('checking');

    const timeoutId = window.setTimeout(() => {
      SuperheroApi.checkChainNameSponsorship(normalizedClaimValue)
        .then((result) => {
          if (sponsorshipRequestIdRef.current !== requestId) return;
          setSponsorship(result);
          setSponsorshipStatus('resolved');
        })
        .catch(() => {
          if (sponsorshipRequestIdRef.current !== requestId) return;
          setSponsorship(null);
          setSponsorshipStatus('idle');
        });
    }, SPONSORSHIP_CHECK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [availableChainNames.length, normalizedClaimValue, open, claimValidationError]);

  const getClaimNotificationPayload = (
    name: string,
    claimStatus?: ChainNameClaimStatusResponse | null,
  ) => ({
    type: TxPayloadType.ClaimChainName,
    name,
    step: resolveClaimNotificationStep(claimStatus),
  });

  // Once a name is claimed (or its sponsored claim is submitted), surface it locally so the
  // section switches to the dropdown and the name is pre-selected as the preferred one to save.
  const applyClaimedName = (claimedNameLike: string) => {
    const claimedName = normalizeChainName(claimedNameLike);
    if (!claimedName) return;
    setAvailableChainNames((prev) => (
      prev.some((item) => item.name === claimedName)
        ? prev
        : [{ name: claimedName, expiresAt: null }, ...prev]
          .sort((a, b) => a.name.localeCompare(b.name))
    ));
    setForm((prev) => ({ ...prev, chain_name: claimedName }));
    setClaimValue('');
    setClaimError(null);
    setAvailabilityStatus('idle');
    setLastCheckedValue('');
    setSponsorship(null);
    setSponsorshipStatus('idle');
  };

  const onClaim = async () => {
    try {
      // Not logged in: don't block with an error — guide the visitor into onboarding.
      if (!activeAccount) {
        openModal({ name: 'onboarding' });
        return;
      }
      const targetClaimAddress = claimAddress;
      if (!targetClaimAddress || !canClaim) {
        const msg = t('messages.connectWalletToClaimChainName');
        setClaimError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        return;
      }

      if (claimValidationError) {
        setClaimError(claimValidationError);
        push(<div style={{ color: '#ffb3b3' }}>{claimValidationError}</div>);
        return;
      }

      submittedRef.current = false;
      setClaiming(true);
      setClaimError(null);
      let isNameAvailable = availabilityStatus === 'available'
        && lastCheckedValue === normalizedClaimValue;
      if (!isNameAvailable) {
        try {
          isNameAvailable = await checkNameAvailability(normalizedClaimValue);
        } catch (availabilityError) {
          const msg = resolveClaimErrorMessage(availabilityError, t);
          setClaimError(msg);
          notifyError(msg);
          push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
          setClaiming(false);
          return;
        }
      }
      if (!isNameAvailable) {
        const msg = t('messages.chainNameClaimNameTaken');
        setClaimError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        setClaiming(false);
        return;
      }

      // Decide whether the backend sponsor can fund this name, or the user has to pay.
      // Prefer the throttled result for the current value; otherwise fetch on demand.
      let resolvedSponsorship = sponsorship && sponsorship.name === `${normalizedClaimValue}.chain`
        ? sponsorship
        : null;
      if (!resolvedSponsorship) {
        try {
          resolvedSponsorship = await SuperheroApi.checkChainNameSponsorship(normalizedClaimValue);
        } catch {
          resolvedSponsorship = null;
        }
      }

      // Require a definitive answer before choosing a path. If the check failed or returned
      // nothing, abort with a clear error instead of silently starting the sponsored flow.
      if (!resolvedSponsorship || typeof resolvedSponsorship.sponsorable !== 'boolean') {
        const msg = t('messages.chainNameSponsorCheckFailed');
        setClaimError(msg);
        notifyError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        setClaiming(false);
        return;
      }

      if (!resolvedSponsorship.sponsorable) {
        // Self-funded path: run the standard AENS flow straight from the wallet.
        try {
          notifySubmitted({
            type: TxPayloadType.ClaimChainName,
            name: normalizedClaimValue,
            step: 'wallet',
          });
          const result = await claimSelfFundedChainName({
            name: normalizedClaimValue,
            onSignatureRequest: () => notifySubmitted({
              type: TxPayloadType.ClaimChainName,
              name: normalizedClaimValue,
              step: 'wallet',
            }),
            onProcessing: () => notifyPending({
              type: TxPayloadType.ClaimChainName,
              name: normalizedClaimValue,
            }),
          });
          const claimedName = String(result.name || `${normalizedClaimValue}.chain`).trim().toLowerCase();
          setChainNames((prev) => ({
            ...prev,
            [targetClaimAddress]: claimedName,
          }));
          queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', targetClaimAddress] });
          queryClient.invalidateQueries({ queryKey: ['AccountsService.getAccount', targetClaimAddress] });
          notifyConfirmed({
            type: TxPayloadType.ClaimChainName,
            name: normalizedClaimValue,
          });
          push(<div>{t('messages.chainNameClaimCompleted')}</div>);
          applyClaimedName(claimedName);
        } catch (selfFundedError) {
          const msg = resolveClaimErrorMessage(selfFundedError, t);
          setClaimError(msg);
          notifyError(msg);
          push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
        } finally {
          setClaiming(false);
        }
        return;
      }

      notifySubmitted({
        type: TxPayloadType.ClaimChainName,
        name: normalizedClaimValue,
        step: 'wallet',
      });

      const claimPromise = claimSponsoredChainName({
        name: normalizedClaimValue,
        onSubmitted: (claimStatus) => {
          submittedRef.current = true;
          setClaiming(false);
          notifyPending(getClaimNotificationPayload(normalizedClaimValue, claimStatus));
        },
        onStatusChange: (claimStatus) => {
          notifyPending(getClaimNotificationPayload(normalizedClaimValue, claimStatus));
        },
      });

      claimPromise.then((finalStatus) => {
        const claimedName = String(finalStatus.name || `${normalizedClaimValue}.chain`).trim().toLowerCase();
        setChainNames((prev) => ({
          ...prev,
          [targetClaimAddress]: claimedName,
        }));
        queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', targetClaimAddress] });
        queryClient.invalidateQueries({ queryKey: ['AccountsService.getAccount', targetClaimAddress] });
        notifyConfirmed({
          type: TxPayloadType.ClaimChainName,
          name: normalizedClaimValue,
        });
        push(<div>{t('messages.chainNameClaimCompleted')}</div>);
        applyClaimedName(claimedName);
      }).catch((claimError2) => {
        const msg = resolveClaimErrorMessage(claimError2, t);
        setClaimError(msg);
        notifyError(msg);
        push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
      }).finally(() => {
        if (!submittedRef.current) setClaiming(false);
      });
    } catch (claimError3) {
      const msg = resolveClaimErrorMessage(claimError3, t);
      setClaimError(msg);
      notifyError(msg);
      push(<div style={{ color: '#ffb3b3' }}>{msg}</div>);
      setClaiming(false);
    }
  };

  const resolveErrorMessage = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error || '');
    const lower = msg.toLowerCase();
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) return t('messages.tooManyRequests');
    if (lower.includes('attestation') || lower.includes('address link') || lower.includes('verification_token')) {
      return t('messages.failedAddressLink');
    }
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
        openModal({ name: 'onboarding' });
        return;
      }
      const validationError = validateForm();
      if (validationError) {
        setFormError(validationError);
        push(<div style={{ color: '#ffb3b3' }}>{validationError}</div>);
        return;
      }
      const bioChanged = trimmedForm.bio !== initialForm.bio.trim();
      const chainNameChanged = (
        trimmedForm.chain_name !== initialForm.chain_name.trim().toLowerCase()
      );
      const websiteChanged = trimmedForm.website !== initialForm.website.trim();
      if (!bioChanged && !chainNameChanged && !websiteChanged) {
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
      if (chainNameChanged) {
        if (trimmedForm.chain_name) {
          const isOwned = availableChainNames.some(
            (item) => item.name === trimmedForm.chain_name,
          );
          if (!isOwned) {
            throw new Error(t('messages.preferredNameNotOwned'));
          }
          await linkPreferredAensName({
            address: targetAddress,
            chainName: trimmedForm.chain_name,
          });
        } else {
          await unlinkPreferredAensName(targetAddress);
        }
      }
      if (websiteChanged) {
        if (trimmedForm.website) {
          await linkSite({ address: targetAddress, site: trimmedForm.website });
        } else {
          await unlinkSite(targetAddress);
        }
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
      if (chainNameChanged) {
        updated = {
          ...updated,
          public_name: trimmedForm.chain_name || null,
          profile: {
            ...updated.profile,
            chain_name: trimmedForm.chain_name || null,
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
          chainNameChanged,
          formChainName: trimmedForm.chain_name,
        }),
      );
      let successMessage = t('messages.profileUpdated');
      const onlyBio = bioChanged && !chainNameChanged && !websiteChanged;
      const onlyChainName = chainNameChanged && !bioChanged && !websiteChanged;
      const onlySite = websiteChanged && !bioChanged && !chainNameChanged;
      if (onlyBio) {
        successMessage = trimmedForm.bio
          ? t('messages.bioLinkSuccess')
          : t('messages.bioUnlinkSuccess');
      } else if (onlyChainName) {
        successMessage = trimmedForm.chain_name
          ? t('messages.preferredNameLinkSuccess')
          : t('messages.preferredNameUnlinkSuccess');
      } else if (onlySite) {
        successMessage = trimmedForm.website
          ? t('messages.siteLinkSuccess')
          : t('messages.siteUnlinkSuccess');
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
  const hasOwnedChainNames = availableChainNames.length > 0;
  // Guest: no wallet connected. The modal stays usable but every primary action funnels the
  // visitor into onboarding instead of attempting a real edit/link.
  const isGuest = !activeAccount;

  const isCheckingAvailability = availabilityStatus === 'checking';
  const isCheckingSponsorship = sponsorshipStatus === 'checking';
  // Resolving either availability or sponsorship blocks the claim: we can't decide the
  // claim path (sponsored vs self-funded) until both checks settle.
  const isCheckingStatus = isCheckingAvailability || isCheckingSponsorship;
  const isCurrentNameUnavailable = Boolean(
    availabilityStatus === 'unavailable'
    && lastCheckedValue === normalizedClaimValue,
  );
  const isClaimDisabled = Boolean(
    claiming
    || isCheckingStatus
    || !canClaim
    || claimValidationError
    || isCurrentNameUnavailable,
  );
  const isClaimLoading = claiming || isCheckingStatus;
  let claimButtonLabel = t('buttons.claimChainName');
  if (claiming) claimButtonLabel = t('messages.chainNameClaimLoading');
  else if (isCheckingStatus) claimButtonLabel = t('messages.chainNameClaimChecking');

  const sponsorshipForCurrentName = sponsorshipStatus === 'resolved'
    && sponsorship
    && sponsorship.name === `${normalizedClaimValue}.chain`
    ? sponsorship
    : null;
  // Only surface the price/free hint once the name is confirmed available to claim.
  const showSponsorshipHint = Boolean(
    sponsorshipForCurrentName
    && !claimValidationError
    && availabilityStatus === 'available'
    && lastCheckedValue === normalizedClaimValue,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={[
          'w-[95vw] max-w-sm mx-auto p-0 overflow-hidden border-0 bg-transparent shadow-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        ].join(' ')}
      >
        <div className="relative rounded-3xl overflow-hidden flex flex-col max-h-[90dvh]" style={GLASS_CARD_STYLE}>
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
          />
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--neon-teal) 0%, transparent 70%)', filter: 'blur(32px)' }}
          />

          <div className="flex items-center justify-between px-5 pt-5 pb-0 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-white font-bold text-base tracking-tight">
                {t('titles.editSuperheroId')}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-5 pt-4 pb-3 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
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
              {hasOwnedChainNames ? (
              // The user already owns one or more names — let them pick the preferred one.
                <AppSelect
                  value={trimmedForm.chain_name || NONE_CHAIN_NAME_VALUE}
                  onValueChange={handleChainNameSelect}
                  triggerClassName="mt-1.5 w-full h-10 px-3 bg-white/[0.06] border border-white/12 text-white rounded-xl focus:ring-0 focus:border-[var(--neon-teal)] text-sm"
                  contentClassName="z-[110] bg-[#10131a] border border-white/20 text-white shadow-2xl backdrop-blur-none"
                  itemClassName="text-white focus:bg-white/10 data-[state=checked]:bg-white/10"
                  placeholder={t('placeholders.selectChainName')}
                >
                  <AppSelectItem value={NONE_CHAIN_NAME_VALUE}>{t('labels.none')}</AppSelectItem>
                  {availableChainNames.map((item) => (
                    <AppSelectItem key={item.name} value={item.name}>
                      {formatChainNameLabel(item.name)}
                    </AppSelectItem>
                  ))}
                </AppSelect>
              ) : (
              // The user owns no names — let them type one to claim it directly.
                <>
                  <p className="mt-1.5 text-xs text-white/60">{t('messages.chainNameClaimHint')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={claimValue}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          const nextNormalizedValue = normalizeChainNameLabel(nextValue);
                          const nextValidationError = validateClaimChainName(nextNormalizedValue);

                          setClaimValue(nextValue);
                          setAvailabilityStatus(
                            nextNormalizedValue && !nextValidationError ? 'checking' : 'idle',
                          );
                          setLastCheckedValue('');
                          setSponsorship(null);
                          setSponsorshipStatus(
                            nextNormalizedValue && !nextValidationError ? 'checking' : 'idle',
                          );
                          if (claimError) setClaimError(null);
                        }}
                        placeholder={t('placeholders.claimChainName')}
                        className={[
                          'pr-16 bg-white/[0.06] text-white rounded-xl focus-visible:ring-0',
                          isClaimTooShort
                            ? 'border border-amber-400/70 focus:border-amber-300'
                            : 'border border-white/12 focus:border-[var(--neon-teal)]',
                        ].join(' ')}
                        maxLength={64}
                        disabled={claiming}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/45">
                        .chain
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={onClaim}
                      disabled={isClaimDisabled}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold whitespace-nowrap disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, var(--neon-teal) 0%, #00c97e 100%)',
                        color: '#0a0a0a',
                      }}
                    >
                      {isClaimLoading && <Spinner className="w-3.5 h-3.5" />}
                      {claimButtonLabel}
                    </Button>
                  </div>
                  {isClaimTooShort && (
                  <p className="mt-2 text-xs text-amber-300">
                    {normalizedClaimValueLength}
                    /13 characters before `.chain`
                  </p>
                  )}
                  {showSponsorshipHint && sponsorshipForCurrentName && (
                    sponsorshipForCurrentName.sponsorable ? (
                      <p className="mt-2 text-xs font-semibold text-green-400">
                        {t('messages.chainNameSponsorFree')}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-amber-300">
                          {t('messages.chainNameSponsorPrice', {
                            amount: selfFundedPriceAe ?? '0',
                          })}
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-300/70">
                          {t('messages.chainNameSponsorPriceHint')}
                        </p>
                      </div>
                    )
                  )}
                  {claimError && <p className="mt-2 text-xs text-red-300">{claimError}</p>}
                </>
              )}
            </div>

            {(CONFIG as any).X_OAUTH_CLIENT_ID ? (
              <div ref={xSectionRef}>
                <Label className={FIELD_LABEL_CLASS}>X (Twitter)</Label>
                {!xSectionReady && !isGuest && (
                <div className="mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/12 px-3 py-6">
                  <Spinner className="w-5 h-5 text-white/60" />
                  <span className="text-xs text-white/50">{t('messages.loading')}</span>
                </div>
                )}
                {(isGuest || (xSectionReady && !hasXVerified)) && (
                <button
                  ref={connectXButtonRef}
                  type="button"
                  disabled={connectingX || (!isGuest && !canEdit)}
                  className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2.5 text-sm text-white/60 hover:text-white hover:border-white/40 hover:bg-white/[0.04] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  onClick={async () => {
                    // Guest: route to onboarding, the same destination as Save in this mode.
                    if (isGuest) {
                      openModal({ name: 'onboarding' });
                      return;
                    }
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
          </div>

          <div className="px-5 pb-5 pt-2 shrink-0 border-t border-white/[0.06]">
            <div className="flex gap-2">
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
                // Keep Save active when logged out so the click can trigger onboarding;
                // only gate on edit permission once an account is actually connected.
                disabled={loading || (!!activeAccount && !canEdit)}
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
  );
};

export default ProfileEditModal;
