/**
 * Token price alerts (superhero#307): "notify me when <token> goes above/below
 * X AE". The backend stores one-shot alerts and sends a `token-price-alert`
 * notification through the bell / push once the token price crosses the
 * target. Creating or deleting an alert takes one wallet signature over an
 * intent-bound message that must match the backend byte-for-byte
 * (superhero-api src/notifications/price-alerts/price-alert.message.ts).
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export type PriceAlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: number;
  sale_address: string;
  symbol: string | null;
  direction: PriceAlertDirection;
  target_ae: string;
  created_at: string;
  triggered_at: string | null;
}

export type PriceAlertIntent =
  | { action: 'create'; saleAddress: string; direction: PriceAlertDirection; targetAe: string }
  | { action: 'delete'; alertId: number };

/** Same rule as the backend DTO: up to 30 integer digits and 18 decimals, > 0. */
const TARGET_RE = /^\d{1,30}(\.\d{1,18})?$/;

/**
 * Normalise what the user typed into the decimal string the backend accepts,
 * or null when it is not a positive amount. Commas count as decimal points.
 */
export function normalizeTargetAe(input: string): string | null {
  const raw = input.trim().replace(',', '.');
  if (!TARGET_RE.test(raw)) return null;
  const [int, frac = ''] = raw.split('.');
  const intPart = int.replace(/^0+(?=\d)/, '');
  const fracPart = frac.replace(/0+$/, '');
  if (/^0*$/.test(intPart) && fracPart === '') return null;
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

export function canonicalPriceAlertHash(intent: PriceAlertIntent): string {
  const canonical = intent.action === 'create'
    ? `action=create;sale=${intent.saleAddress};direction=${intent.direction};target=${intent.targetAe}`
    : `action=delete;id=${intent.alertId}`;
  return bytesToHex(sha256(utf8ToBytes(canonical)));
}

export function buildPriceAlertMessage(
  address: string,
  nonce: string,
  intent: PriceAlertIntent,
): string {
  return `Superhero Notifications\nPrice alert for ${address}\nbody: ${canonicalPriceAlertHash(intent)}\nnonce: ${nonce}`;
}

export interface PriceAlertsApiOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

/**
 * The backend's reason for refusing a request, or '' when it has none the user
 * can act on (a server fault or a non-JSON proxy page), so the caller shows its
 * own localized fallback.
 */
async function readError(res: Response): Promise<string> {
  if (res.status >= 500) return '';
  try {
    const body = await res.json();
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    if (typeof message === 'string' && message) return message;
  } catch {
    // Not JSON.
  }
  return '';
}

/** Thin REST client for /api/notifications/:address/price-alerts. */
export class PriceAlertsApi {
  private readonly base: string;

  private readonly doFetch: typeof fetch;

  constructor(opts: PriceAlertsApiOptions) {
    this.base = `${opts.baseUrl.replace(/\/$/, '')}/api/notifications`;
    this.doFetch = opts.fetch ?? ((input, init) => fetch(input, init));
  }

  async list(address: string): Promise<PriceAlert[]> {
    const res = await this.doFetch(`${this.base}/${encodeURIComponent(address)}/price-alerts`);
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
  }

  private async challenge(address: string): Promise<string> {
    const res = await this.doFetch(`${this.base}/preferences/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const { nonce } = await res.json();
    return nonce;
  }

  async create(
    address: string,
    saleAddress: string,
    direction: PriceAlertDirection,
    targetAe: string,
    sign: (message: string) => Promise<string>,
  ): Promise<PriceAlert> {
    const nonce = await this.challenge(address);
    const signature = await sign(buildPriceAlertMessage(address, nonce, {
      action: 'create', saleAddress, direction, targetAe,
    }));
    const res = await this.doFetch(`${this.base}/${encodeURIComponent(address)}/price-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nonce, signature, sale_address: saleAddress, direction, target_ae: targetAe,
      }),
    });
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
  }

  async remove(
    address: string,
    alertId: number,
    sign: (message: string) => Promise<string>,
  ): Promise<void> {
    const nonce = await this.challenge(address);
    const signature = await sign(buildPriceAlertMessage(address, nonce, {
      action: 'delete', alertId,
    }));
    const res = await this.doFetch(
      `${this.base}/${encodeURIComponent(address)}/price-alerts/${alertId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, signature }),
      },
    );
    if (!res.ok) throw new Error(await readError(res));
  }
}
