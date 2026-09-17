import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import AddressCopyChip from './AddressCopyChip';

interface ProfileIdentityProps {
  address: string;
  displayName: string;
  /** Resolved .chain handle. Teal, and only shown when it differs from the name. */
  handle?: string | null;
  isVerified: boolean;
  verifiedUsername?: string | null;
  bio?: string;
  site?: string | null;
  ownProfile: boolean;
  onEditBio?: () => void;
}

// Verified badge stays teal — teal is reserved for the handle, the badge and the
// primary action (D1).
const VerifiedBadge = ({ username }: { username?: string | null }) => {
  const { t } = useTranslation('common');
  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center justify-center align-middle relative -top-px"
      title={username ? t('account.xVerifiedTitle', { username }) : t('account.xVerified')}
      data-testid="profile-verified-badge"
    >
      <span
        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full"
        style={{ background: 'var(--neon-teal)' }}
      >
        <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] fill-black" aria-hidden>
          <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418l-9.373 9.393-3.373-3.375a1 1 0 1 0-1.414 1.417l4.08 4.083a1 1 0 0 0 1.415 0z" />
        </svg>
      </span>
    </span>
  );
};

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function ensureHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const WebsiteChip = ({ site }: { site: string }) => (
  <a
    href={ensureHref(site)}
    target="_blank"
    rel="nofollow noopener noreferrer"
    data-testid="profile-website-chip"
    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-solid border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] leading-none text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] focus:outline-none focus-visible:border-white/25"
  >
    <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    <span className="truncate">{stripScheme(site)}</span>
  </a>
);

// Bio clamps to three lines with an inline "more" that expands in place.
const ProfileBio = ({ text, ownProfile, onEditBio }: {
  text?: string;
  ownProfile: boolean;
  onEditBio?: () => void;
}) => {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  if (!text) {
    // On your own profile an empty bio prompts you to write one; on someone
    // else's it renders nothing.
    if (!ownProfile) return null;
    return (
      <button
        type="button"
        onClick={onEditBio}
        data-testid="profile-bio-empty"
        className="mt-2 text-left text-[14px] italic leading-relaxed text-white/45 transition-colors hover:text-white/70 focus:outline-none"
      >
        {t('account.emptyBioPrompt')}
      </button>
    );
  }

  return (
    <div className="mt-2 text-[14px] leading-relaxed text-white/80" data-testid="profile-bio">
      <p ref={ref} className={expanded ? '' : 'line-clamp-3'}>{text}</p>
      {!expanded && clamped && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-0.5 font-semibold text-[var(--neon-teal)] focus:outline-none"
        >
          {t('buttons.showMore')}
        </button>
      )}
    </div>
  );
};

/** Block 2 — identity: name (standard colour, D1), badge, handle, address chip, website, bio. */
const ProfileIdentity = ({
  address,
  displayName,
  handle,
  isVerified,
  verifiedUsername,
  bio,
  site,
  ownProfile,
  onEditBio,
}: ProfileIdentityProps) => {
  // The handle is the resolved .chain name; suppress it when it is already the
  // display name so the two lines do not duplicate.
  const showHandle = !!handle && handle.trim().toLowerCase() !== displayName.trim().toLowerCase();

  return (
    <div className="min-w-0">
      <h1
        title={displayName}
        data-testid="profile-display-name"
        className="flex items-center text-[21px] md:text-[27px] font-extrabold text-[var(--standard-font-color)] tracking-tight leading-tight"
      >
        <span className="truncate">{displayName}</span>
        {isVerified && <VerifiedBadge username={verifiedUsername} />}
      </h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {showHandle && (
          <span
            data-testid="profile-handle"
            className="text-sm font-semibold text-[var(--neon-teal)]"
          >
            {handle}
          </span>
        )}
        <AddressCopyChip address={address} />
      </div>

      {site && (
        <div className="mt-1.5">
          <WebsiteChip site={site} />
        </div>
      )}

      <ProfileBio text={bio} ownProfile={ownProfile} onEditBio={onEditBio} />
    </div>
  );
};

export default ProfileIdentity;
