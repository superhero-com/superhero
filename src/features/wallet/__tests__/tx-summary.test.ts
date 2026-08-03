// @vitest-environment node
//
// WYSIWYS decoding. The property that matters most is the NEGATIVE one: an
// undecodable payload must return null so the prompt can warn, never a
// confident-looking summary the user would approve.
import { describe, expect, it } from 'vitest';
import { Tag, buildTx } from '@aeternity/aepp-sdk';
import { formatAe, summarizeTransaction } from '../tx-summary';

const SENDER = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const RECIPIENT = 'ak_11111111111111111111111111111111273Yts';

describe('formatAe', () => {
  it('renders whole and fractional aettos exactly (no float round-trip)', () => {
    expect(formatAe(0n)).toBe('0 AE');
    expect(formatAe(10n ** 18n)).toBe('1 AE');
    expect(formatAe(1n)).toBe('0.000000000000000001 AE');
    expect(formatAe(1500000000000000000n)).toBe('1.5 AE');
    // 18 significant decimals survive — a Number round-trip would lose the tail.
    expect(formatAe(123456789012345678901n)).toBe('123.456789012345678901 AE');
  });
});

describe('summarizeTransaction', () => {
  it('decodes a SpendTx into recipient + amount + fee rows', () => {
    const tx = buildTx({
      tag: Tag.SpendTx,
      senderId: SENDER,
      recipientId: RECIPIENT,
      amount: 2n * 10n ** 18n,
      nonce: 7,
      payload: 'ba_Xfbg4g==',
    });

    const summary = summarizeTransaction(tx);
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe('Send AE');

    const rows = Object.fromEntries(summary!.rows.map((r) => [r.label, r.value]));
    expect(rows.To).toBe(RECIPIENT);
    expect(rows.Amount).toBe('2 AE');
    expect(rows.From).toBe(SENDER);
    expect(rows.Nonce).toBe('7');
    expect(rows['Network fee']).toMatch(/ AE$/);
  });

  it('emphasises the value-moving rows so they lead the confirmation', () => {
    const tx = buildTx({
      tag: Tag.SpendTx, senderId: SENDER, recipientId: RECIPIENT, amount: 1n, nonce: 1,
    });
    const emphasised = summarizeTransaction(tx)!.rows.filter((r) => r.emphasis).map((r) => r.label);
    expect(emphasised).toEqual(['To', 'Amount']);
  });

  it('returns null for a payload it cannot decode — the prompt must warn, not guess', () => {
    expect(summarizeTransaction('tx_notarealtransaction')).toBeNull();
    expect(summarizeTransaction('')).toBeNull();
    expect(summarizeTransaction('definitely not a tx')).toBeNull();
  });
});
