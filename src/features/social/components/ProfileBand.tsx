import { useState } from 'react';
import { imageUrl } from '@/features/profile-images/api';
import { useProfileImages } from '@/features/profile-images/useProfileImages';

interface ProfileBandProps {
  address?: string;
  className?: string;
}

// Address-derived fallback while a cover is unavailable.
function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash * 31 + address.charCodeAt(i)) % 1_000_000_007;
  }
  return hash;
}

export function addressGradient(address: string): string {
  const hash = hashAddress(address || 'ak_');
  const hue1 = 150 + (hash % 80); // 150..229 — teal through blue
  const hue2 = 150 + (Math.floor(hash / 128) % 80);
  const angle = 105 + (hash % 40); // 105..144deg
  return `linear-gradient(${angle}deg, hsl(${hue1} 55% 24%), hsl(${hue2} 48% 15%) 68%, hsl(${(hue2 + 18) % 360} 42% 12%))`;
}

/** Block 1 — the address-derived header band. Height is set by the parent. */
const ProfileBand = ({ address = '', className = '' }: ProfileBandProps) => {
  const images = useProfileImages(address);
  const url = imageUrl(images.data?.cover_ref || images.data?.coverurl);
  const [failed, setFailed] = useState<string>();
  return (
    <div
      aria-hidden
      data-testid="profile-band"
      className={`w-full overflow-hidden ${className}`}
      style={{ background: addressGradient(address) }}
    >
      {url && failed !== url && <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(url)} />}
    </div>
  );
};

export default ProfileBand;
