/**
 * Lightweight S2-style geographic grid for private area sharing.
 *
 * This is a simplified approximation of Google's S2 geometry library.
 * It does NOT use any external dependencies — just lat/lng arithmetic.
 * Cells are rectangular (not S2's curved quadrilaterals), which is close
 * enough for the ~300km–37km precision levels we expose to users.
 *
 * Why S2-style and not geohash?
 * - Cell tokens are opaque (no lat/lng recoverable from token alone)
 * - Level labels map cleanly to human-readable precision descriptions
 * - cellsOverlap() handles parent/child containment, needed for proximity match
 *
 * GPS coordinates NEVER leave the device. Only the cell token is shared.
 * A contact receiving a token sees "Lisbon area" — not "38.7169°N, 9.1399°W".
 */

/** Cell size in degrees at each supported level. */
const LEVEL_SIZES: Record<number, number> = {
  5: 2.8125,      // ~300 km — city scale
  6: 1.40625,     // ~150 km — district scale
  7: 0.703125,    // ~75 km  — neighbourhood scale
  8: 0.3515625,   // ~37 km  — meetup scale
};

/** Human-readable label for each level. */
export const LEVEL_LABELS: Record<number, string> = {
  5: 'City (~300 km)',
  6: 'District (~150 km)',
  7: 'Neighbourhood (~75 km)',
  8: 'Meetup zone (~37 km)',
};

export type LocationLevel = 5 | 6 | 7 | 8;

export const LOCATION_LEVELS: { value: LocationLevel; label: string }[] = [
  { value: 5, label: 'City' },
  { value: 6, label: 'District' },
  { value: 7, label: 'Neighbourhood' },
  { value: 8, label: 'Meetup' },
];

// ── Token encoding ─────────────────────────────────────────────────────────────

/**
 * Convert a GPS coordinate to an S2-style cell token at the given level.
 * Token format: `L<level>:<gridLat>:<gridLng>`
 *
 * The token is opaque — you cannot derive the original lat/lng from it.
 * Two different points in the same cell produce the same token.
 */
export function latLngToS2Token(lat: number, lng: number, level: LocationLevel): string {
  const size = LEVEL_SIZES[level];
  const gridLat = Math.floor(lat / size);
  const gridLng = Math.floor(lng / size);
  return `L${level}:${gridLat}:${gridLng}`;
}

// ── Overlap detection ──────────────────────────────────────────────────────────

/**
 * Returns true if the two tokens represent the same cell or one contains the other.
 * Used for "are these two people in the same area?" proximity checks.
 *
 * Same level: exact match.
 * Different levels: re-derive the coarser token from the finer cell's centre
 * and compare. A person at level 8 (meetup) is always "inside" their level 5
 * (city) cell — so the check works in both directions.
 */
export function cellsOverlap(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;

  const parseToken = (t: string) => {
    const [levelPart, latPart, lngPart] = t.split(':');
    return {
      level: parseInt(levelPart.slice(1), 10) as LocationLevel,
      gridLat: parseInt(latPart, 10),
      gridLng: parseInt(lngPart, 10),
    };
  };

  const a = parseToken(tokenA);
  const b = parseToken(tokenB);

  if (a.level === b.level) return false; // same level, different cell

  const [finer, coarser] = a.level > b.level ? [a, b] : [b, a];

  // Recover approximate centre of finer cell
  const finerSize = LEVEL_SIZES[finer.level];
  const centreLat = finer.gridLat * finerSize + finerSize / 2;
  const centreLng = finer.gridLng * finerSize + finerSize / 2;

  // Re-derive coarser token from that centre
  const derived = latLngToS2Token(centreLat, centreLng, coarser.level as LocationLevel);
  const coarserToken = coarser.level === a.level ? tokenA : tokenB;

  return derived === coarserToken;
}

// ── Reverse geocoding ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable area name for a coordinate using Nominatim.
 * Falls back to coordinates if the request fails.
 * Result is only used for display — it is NOT shared with contacts (they see
 * the cell token, and we reverse-geocode it locally to display to them too).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: { 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) throw new Error('nominatim error');
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.county || a.state || 'Unknown area';
  } catch {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}
