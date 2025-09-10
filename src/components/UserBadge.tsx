import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Identicon from './Identicon';

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

  const hrefPath = linkTo === 'account' ? `/trendminer/accounts/${address}` : `/users/${address}`;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <a
        ref={ref}
        href={hrefPath}
        className="author"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(hrefPath); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none', minWidth: 0 }}
      >
        {showAvatar && (<Identicon address={address} size={24} name={name} />)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span className="chain-name" style={{ fontSize: 14, fontWeight: 800 }}>{name}</span>
          <span
            className="address"
            style={{
              fontSize: 8,
              color: 'rgba(195, 195, 199, 0.4)',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(195, 195, 199, 0.2)',
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200,
              minWidth: 0,
              flexShrink: 1
            }}
            title={address} // Show full address on hover
          >
            {formatAddress(address)}
          </span>
        </div>
      </a>
      {visible && (
        <div
          ref={cardRef}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            background: '#1c1c24',
            border: '1px solid #2f2f3b',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: 12,
            minWidth: 280,
            maxWidth: 420,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <Identicon address={address} size={56} name={name} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{profile?.preferredChainName || name}</div>
              <div style={{ fontSize: 12, color: '#c3c3c7' }}>{address}</div>
              {profile?.location && (
                <div style={{ fontSize: 12, color: '#c3c3c7', marginTop: 4 }}>{profile.location}</div>
              )}
            </div>
          </div>
          {profile?.biography && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#c3c3c7', whiteSpace: 'pre-wrap' }}>{profile.biography}</div>
          )}
        </div>
      )}
      <style>{`
        .chain-name { transition: color .2s ease; }
        a:hover .chain-name { color: #fff; }
      `}</style>
    </span>
  );
}


