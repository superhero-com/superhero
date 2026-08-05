// @vitest-environment node
//
// WYSIWYS decoding. The property that matters most is the NEGATIVE one: an
// undecodable payload must return null so the prompt can warn, never a
// confident-looking summary the user would approve.
import { describe, expect, it } from 'vitest';
import {
  Tag, buildTx, buildContractId, encode, Encoding,
} from '@aeternity/aepp-sdk';
import { Encoder } from '@aeternity/aepp-calldata';
import { formatAe, summarizeTransaction, type TxSummary } from '../tx-summary';

const SENDER = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const RECIPIENT = 'ak_11111111111111111111111111111111273Yts';
const CONTRACT = buildContractId(SENDER, 1);

/** Minimal ACI covering the value-moving AEX-9 functions the summary must name. */
const AEX9_ACI = [{
  contract: {
    name: 'Token',
    kind: 'contract_main',
    typedefs: [],
    state: { record: [] },
    functions: [
      {
        name: 'transfer',
        arguments: [{ name: 'to', type: 'address' }, { name: 'value', type: 'int' }],
        returns: 'unit',
        stateful: true,
        payable: false,
      },
      {
        name: 'create_allowance',
        arguments: [{ name: 'for_account', type: 'address' }, { name: 'value', type: 'int' }],
        returns: 'unit',
        stateful: true,
        payable: false,
      },
      {
        name: 'unknown_fn',
        arguments: [{ name: 'x', type: 'int' }],
        returns: 'unit',
        stateful: true,
        payable: false,
      },
    ],
  },
}];

const encodeCall = (fn: string, args: unknown[]): `cb_${string}` => new Encoder(AEX9_ACI)
  .encode('Token', fn, args);

const contractCallTx = (callData: `cb_${string}`, amount: bigint | number = 0): string => buildTx({
  tag: Tag.ContractCallTx,
  callerId: SENDER,
  contractId: CONTRACT,
  amount,
  gasLimit: 5000,
  nonce: 3,
  callData,
});

const rowMap = (summary: TxSummary | null): Record<string, string> => Object
  .fromEntries((summary?.rows ?? []).map((r) => [r.label, r.value]));

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

describe('summarizeTransaction — contract calls (WYSIWYS decode of function + args)', () => {
  it('names an AEX-9 token transfer and shows recipient + raw amount', () => {
    const summary = summarizeTransaction(contractCallTx(encodeCall('transfer', [RECIPIENT, 5n])));
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe('Send tokens');
    expect(summary!.effect).toMatch(/transfers tokens/i);
    expect(summary!.caution).toBeUndefined();

    const rows = rowMap(summary);
    expect(rows.To).toBe(RECIPIENT);
    // Raw base units — decimals are token-specific and must not be invented.
    expect(rows.Amount).toBe('5 (raw token units)');
    expect(rows.Contract).toBe(CONTRACT);
  });

  it('names a token-spending approval as an approval, not raw bytes', () => {
    const summary = summarizeTransaction(
      contractCallTx(encodeCall('create_allowance', [RECIPIENT, 1000n])),
    );
    expect(summary!.title).toBe('Approve token spending');
    expect(summary!.effect).toMatch(/spend your tokens/i);
    const rows = rowMap(summary);
    expect(rows.Spender).toBe(RECIPIENT);
    expect(rows['Approved amount']).toBe('1000 (raw token units)');
  });

  it('surfaces AE attached to a contract call as an emphasised row', () => {
    const summary = summarizeTransaction(
      contractCallTx(encodeCall('transfer', [RECIPIENT, 1n]), 2n * 10n ** 18n),
    );
    const attached = summary!.rows.find((r) => r.label === 'AE sent with call');
    expect(attached).toMatchObject({ value: '2 AE', emphasis: true });
  });

  it('does NOT fail closed on an unrecognised function, but flags it with a caution', () => {
    const summary = summarizeTransaction(contractCallTx(encodeCall('unknown_fn', [42n])));
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.caution).toMatch(/not a recognised standard/i);
    // The function selector and decoded arguments are still shown.
    expect(summary!.rows.find((r) => r.label === 'Function')?.value).toMatch(/unrecognised \(0x/);
    expect(summary!.rows.find((r) => r.label === 'Argument 1')?.value).toBe('42');
  });

  it('fails closed when contract calldata cannot be decoded', () => {
    const garbage = encode(new Uint8Array([0, 1, 2, 3, 4, 5]), Encoding.Bytearray);
    expect(summarizeTransaction(contractCallTx(garbage))).toBeNull();
  });
});

describe('summarizeTransaction — PayingForTx surfaces the inner transaction', () => {
  const wrap = (innerTx: string): string => {
    const signed = buildTx({ tag: Tag.SignedTx, encodedTx: innerTx, signatures: [] });
    return buildTx({
      tag: Tag.PayingForTx, payerId: SENDER, nonce: 2, tx: signed,
    });
  };

  it('decodes the wrapper AND the inner tx the user actually consents to', () => {
    const inner = buildTx({
      tag: Tag.SpendTx, senderId: SENDER, recipientId: RECIPIENT, amount: 7n, nonce: 1,
    });
    const summary = summarizeTransaction(wrap(inner));
    expect(summary!.title).toBe('Pay fees for another transaction');
    expect(summary!.rows.find((r) => r.label === 'Payer')?.value).toBe(SENDER);

    expect(summary!.inner).toBeDefined();
    expect(summary!.inner!.title).toBe('Send AE');
    expect(rowMap(summary!.inner!).To).toBe(RECIPIENT);
  });

  it('fails closed when the inner transaction cannot be explained', () => {
    const garbage = encode(new Uint8Array([9, 9, 9, 9]), Encoding.Bytearray);
    expect(summarizeTransaction(wrap(contractCallTx(garbage)))).toBeNull();
  });
});
