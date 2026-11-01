import {
  describe, expect, it, vi,
} from 'vitest';
import {
  PriceAlertsApi,
  buildPriceAlertMessage,
  canonicalPriceAlertHash,
  normalizeTargetAe,
} from '../priceAlerts';

describe('price alert message', () => {
  // Fixed vectors: sha256 of the canonical body strings the backend hashes
  // (superhero-api price-alert.message.ts).
  it('hashes the same canonical body as the backend', () => {
    expect(canonicalPriceAlertHash({
      action: 'create', saleAddress: 'ct_abc', direction: 'above', targetAe: '0.01',
    })).toBe('1e100504ffbdfb98e1a7da72fadf1b77119d51ae605d1359fec22c9f0e34c4ee');
    expect(canonicalPriceAlertHash({ action: 'delete', alertId: 7 }))
      .toBe('ad9ddf5e81c4d5925b85bbd415ebf32aa9fd358f43c2fc38268a5ac2504d24e5');
  });

  it('builds the four-line intent message', () => {
    expect(buildPriceAlertMessage('ak_a', 'n1', { action: 'delete', alertId: 7 }).split('\n')).toEqual([
      'Superhero Notifications',
      'Price alert for ak_a',
      'body: ad9ddf5e81c4d5925b85bbd415ebf32aa9fd358f43c2fc38268a5ac2504d24e5',
      'nonce: n1',
    ]);
  });
});

describe('normalizeTargetAe', () => {
  it('accepts positive decimals and trims noise', () => {
    expect(normalizeTargetAe('0.0100')).toBe('0.01');
    expect(normalizeTargetAe(' 12 ')).toBe('12');
    expect(normalizeTargetAe('007.5')).toBe('7.5');
    expect(normalizeTargetAe('0,25')).toBe('0.25');
    expect(normalizeTargetAe('3.')).toBeNull();
  });

  it('rejects zero, negatives and junk', () => {
    ['0', '0.000', '-1', 'abc', '1e5', '', '1.1234567890123456789'].forEach((v) => {
      expect(normalizeTargetAe(v)).toBeNull();
    });
  });
});

describe('PriceAlertsApi', () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });

  it('gets a nonce, signs the bound message, then creates', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ nonce: 'n1' }))
      .mockResolvedValueOnce(json({ id: 3 }, 201));
    const sign = vi.fn(async () => 'sig');
    const api = new PriceAlertsApi({ baseUrl: 'http://api.test/', fetch: fetchMock });
    await api.create('ak_a', 'ct_abc', 'above', '0.01', sign);

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/notifications/preferences/challenge');
    expect(sign).toHaveBeenCalledWith(buildPriceAlertMessage('ak_a', 'n1', {
      action: 'create', saleAddress: 'ct_abc', direction: 'above', targetAe: '0.01',
    }));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://api.test/api/notifications/ak_a/price-alerts');
    expect(JSON.parse(init.body)).toEqual({
      nonce: 'n1', signature: 'sig', sale_address: 'ct_abc', direction: 'above', target_ae: '0.01',
    });
  });

  it('surfaces the backend message on failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ nonce: 'n1' }))
      .mockResolvedValueOnce(json({ message: 'Price is already above the target' }, 400));
    const api = new PriceAlertsApi({ baseUrl: 'http://api.test', fetch: fetchMock });
    await expect(api.create('ak_a', 'ct_abc', 'above', '0.001', async () => 's'))
      .rejects.toThrow('Price is already above the target');
  });

  it('gives no reason for a server fault or a non-JSON reply', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ statusCode: 500, message: 'Internal server error' }, 500))
      .mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }));
    const api = new PriceAlertsApi({ baseUrl: 'http://api.test', fetch: fetchMock });
    await expect(api.list('ak_a')).rejects.toThrow(/^$/);
    await expect(api.list('ak_a')).rejects.toThrow(/^$/);
  });

  it('deletes with a signature bound to the alert id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ nonce: 'n2' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const sign = vi.fn(async () => 'sig');
    const api = new PriceAlertsApi({ baseUrl: 'http://api.test', fetch: fetchMock });
    await api.remove('ak_a', 9, sign);
    expect(sign).toHaveBeenCalledWith(buildPriceAlertMessage('ak_a', 'n2', { action: 'delete', alertId: 9 }));
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/api/notifications/ak_a/price-alerts/9');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });
});
