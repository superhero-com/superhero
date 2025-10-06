import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Identicon from './Identicon';
import { Badge } from './ui/badge';
import { AeCard, AeCardContent } from './ui/ae-card';
import { cn } from '@/lib/utils';
import { formatAddress } from '../utils/address';
export default function UserBadge(
  { address, showAvatar = true, linkTo = 'profile', shortAddress = false, chainName }: {
    address: string;
    showAvatar?: boolean;
    linkTo?: 'profile' | 'account';
    shortAddress?: boolean;
    chainName?: string;
  }
) {
  const navigate = useNavigate();
  const name = chainName || 'Fellow superhero';
  const [profile, setProfile] = useState<any>(null);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLAnchorElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hover) { setVisible(false); return; }
    const id = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(id);
  }, [hover]);


  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target as Node)) return;
      if (ref.current && ref.current.contains(e.target as Node)) return;
      setVisible(false);
    }
    if (visible) document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [visible]);

  const hrefPath = linkTo === 'account' ? `/trending/accounts/${address}` : `/users/${address}`;

  return (
    <span className="relative inline-flex items-center">
      <a
        ref={ref}
        href={hrefPath}
        className="author inline-flex items-center gap-2 text-inherit no-underline min-w-0 hover:text-foreground transition-colors"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(hrefPath); }}
      >
        {showAvatar && (
          <div className="flex-shrink-0">
            <Identicon address={address} size={24} name={name} />
          </div>
        )}
        <div className="flex flex-col items-start min-w-0">
          <span className="chain-name text-sm font-bold transition-colors hover:text-foreground">
            {name}
          </span>
          <span
            className={cn(
              "address text-muted-foreground/40 font-mono tracking-wide underline decoration-muted-foreground/20 decoration-1 underline-offset-2 whitespace-nowrap min-w-0 flex-shrink",
              // Smaller + lighter font for full ak_ addresses; prevent ellipsis for them
              address.startsWith('ak_') ? "text-[11px] font-light max-w-none overflow-visible" : "text-xs font-semibold overflow-hidden text-ellipsis max-w-[200px]"
            )}
            title={address}
          >
            {formatAddress(address)}
          </span>
        </div>
      </a>
      
      {visible && (
        <AeCard
          ref={cardRef}
          variant="glass"
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[280px] max-w-[420px] shadow-card"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <AeCardContent className="p-3">
            <div className="flex gap-3 mb-3">
              <div className="flex-shrink-0">
                <Identicon address={address} size={56} name={name} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-foreground mb-1">
                  {profile?.preferredChainName || name}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {address}
                </div>
                {profile?.location && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {profile.location}
                  </div>
                )}
              </div>
            </div>
            {profile?.biography && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.biography}
              </div>
            )}
          </AeCardContent>
        </AeCard>
      )}
    </span>
  );
}


