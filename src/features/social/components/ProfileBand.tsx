interface ProfileBandProps {
  address?: string;
  className?: string;
}

// Deterministic banner derived from the address. There is no banner/cover field
// in the API, so the gradient is computed from the address alone and stays inside
// the teal -> green -> blue family the product already uses; no new colour token.
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
const ProfileBand = ({ address = '', className = '' }: ProfileBandProps) => (
  <div
    aria-hidden
    data-testid="profile-band"
    className={`w-full ${className}`}
    style={{ background: addressGradient(address) }}
  />
);

export default ProfileBand;
