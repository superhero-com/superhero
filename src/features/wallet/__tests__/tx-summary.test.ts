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

// The FATE calldata selector is blake2b(function_name)[0..4] — it is derived from
// the NAME alone, independent of argument types. So a contract can expose a
// function literally named `transfer` with a different, hostile signature and its
// calldata will still resolve to the recognised `transfer` selector. This helper
// forges exactly that: a value-moving name over an arbitrary argument shape.
const forgeCall = (
  fn: string,
  argDefs: { name: string; type: unknown }[],
  args: unknown[],
): `cb_${string}` => new Encoder([{
  contract: {
    name: 'Evil',
    kind: 'contract_main',
    typedefs: [],
    state: { record: [] },
    functions: [{
      name: fn, arguments: argDefs, returns: 'unit', stateful: true, payable: false,
    }],
  },
}]).encode('Evil', fn, args);

const ADDR = { name: 'a', type: 'address' };
const INT = { name: 'n', type: 'int' };

const contractCallTx = (callData: `cb_${string}`, amount: string | number = 0): string => buildTx({
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
      amount: (2n * 10n ** 18n).toString(),
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
      tag: Tag.SpendTx, senderId: SENDER, recipientId: RECIPIENT, amount: '1', nonce: 1,
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
      contractCallTx(encodeCall('transfer', [RECIPIENT, 1n]), (2n * 10n ** 18n).toString()),
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
    const garbage = encode(new Uint8Array([0, 1, 2, 3, 4, 5]), Encoding.Bytearray) as `cb_${string}`;
    expect(summarizeTransaction(contractCallTx(garbage))).toBeNull();
  });
});

// A selector-name match is not proof the call is that function: an attacker can
// name a hostile function `transfer` and hide an extra argument the recognised
// summary would never display. A recognised value-moving effect is only named
// when the decoded calldata is the EXACT expected shape; otherwise the call is
// downgraded to the unrecognised-contract caution path with every decoded
// argument rendered, so the user always sees everything they are signing.
describe('summarizeTransaction — recognised contract calls are shape-safe (WYSIWYS)', () => {
  it('downgrades a transfer with an EXTRA argument and shows every decoded arg', () => {
    // `transfer(address, int, address)` — same selector as AEX-9 transfer, one hidden arg.
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('transfer', [ADDR, INT, ADDR], [RECIPIENT, 5n, SENDER]),
    ));
    expect(summary).not.toBeNull();
    // NOT named as a token transfer, and no value-moving effect claimed.
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.effect).toBeUndefined();
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
    const rows = rowMap(summary);
    // All three decoded arguments are rendered — nothing is signed unseen.
    expect(rows['Argument 1']).toBe(RECIPIENT);
    expect(rows['Argument 2']).toBe('5');
    expect(rows['Argument 3']).toBe(SENDER);
    expect(rows.Function).toMatch(/transfer — unexpected argument shape/);
    // The misleading positional labels are gone.
    expect(rows.To).toBeUndefined();
    expect(rows.Amount).toBeUndefined();
  });

  it('downgrades a transfer with a MISSING argument — no blank amount', () => {
    // `transfer(address)` previously produced "Amount: (raw token units)".
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('transfer', [ADDR], [RECIPIENT]),
    ));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.effect).toBeUndefined();
    const rows = rowMap(summary);
    expect(rows.Amount).toBeUndefined();
    expect(rows['Argument 1']).toBe(RECIPIENT);
  });

  it('downgrades a transfer whose arguments are the WRONG type', () => {
    // `transfer(int, int)` — recipient slot is not an address.
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('transfer', [INT, INT], [1n, 2n]),
    ));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.effect).toBeUndefined();
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
    const rows = rowMap(summary);
    expect(rows['Argument 1']).toBe('1');
    expect(rows['Argument 2']).toBe('2');
  });

  it('downgrades an allowance with the wrong arity', () => {
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('create_allowance', [ADDR], [RECIPIENT]),
    ));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.rows.find((r) => r.label === 'Approved amount')).toBeUndefined();
    expect(rowMap(summary)['Argument 1']).toBe(RECIPIENT);
  });

  it('still names a correctly-shaped transfer — the downgrade does not over-trigger', () => {
    const summary = summarizeTransaction(contractCallTx(encodeCall('transfer', [RECIPIENT, 5n])));
    expect(summary!.title).toBe('Send tokens');
    expect(summary!.caution).toBeUndefined();
    expect(rowMap(summary).To).toBe(RECIPIENT);
    expect(rowMap(summary).Amount).toBe('5 (raw token units)');
  });
});

// A swap-named selector is not proof of a DEX swap either. "Swap tokens" and its
// DEX effect are only claimed when the calldata is the router's exact shape; any
// other shape downgrades to the caution path with no DEX behaviour asserted.
describe('summarizeTransaction — DEX swaps are shape-safe (no selector-only DEX claim)', () => {
  // The aeternity router signature for the exact-in token→token swap.
  const SWAP_ARG_DEFS = [
    { name: 'amountIn', type: 'int' },
    { name: 'amountOutMin', type: 'int' },
    { name: 'path', type: { list: ['address'] } },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'int' },
    { name: 'callback', type: { option: ['int'] } },
  ];

  it('names a correctly-shaped router swap and shows every argument', () => {
    const summary = summarizeTransaction(contractCallTx(forgeCall(
      'swap_exact_tokens_for_tokens',
      SWAP_ARG_DEFS,
      [1n, 2n, [RECIPIENT, SENDER], RECIPIENT, 999n, undefined],
    )));
    expect(summary!.title).toBe('Swap tokens');
    expect(summary!.effect).toMatch(/decentralised exchange/i);
    expect(summary!.caution).toBeUndefined();
    const rows = rowMap(summary);
    // All six decoded arguments are rendered — nothing signed unseen.
    expect(rows['Argument 1']).toBe('1');
    expect(rows['Argument 4']).toBe(RECIPIENT);
    expect(rows['Argument 6']).toBeDefined();
  });

  it('downgrades a swap-named call with a malformed signature — no DEX claim', () => {
    // `swap_exact_tokens_for_tokens(string)` — the reviewer's reproduction.
    const cd = forgeCall('swap_exact_tokens_for_tokens', [{ name: 'x', type: 'string' }], ['hello']);
    const summary = summarizeTransaction(contractCallTx(cd));
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.title).not.toBe('Swap tokens');
    expect(summary!.effect).toBeUndefined();
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
    const rows = rowMap(summary);
    expect(rows.Function).toMatch(/swap_exact_tokens_for_tokens — unexpected argument shape/);
    expect(rows['Argument 1']).toBe('hello');
  });

  it('downgrades a swap whose recipient slot is not an address', () => {
    // Correct arity, but `to` is an int rather than an ak_ address.
    const badToDefs = [
      { name: 'amountIn', type: 'int' },
      { name: 'amountOutMin', type: 'int' },
      { name: 'path', type: { list: ['address'] } },
      { name: 'to', type: 'int' },
      { name: 'deadline', type: 'int' },
      { name: 'callback', type: { option: ['int'] } },
    ];
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('swap_exact_tokens_for_tokens', badToDefs, [1n, 2n, [RECIPIENT], 5n, 999n, undefined]),
    ));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.effect).toBeUndefined();
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
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
      tag: Tag.SpendTx, senderId: SENDER, recipientId: RECIPIENT, amount: '7', nonce: 1,
    });
    const summary = summarizeTransaction(wrap(inner));
    expect(summary!.title).toBe('Pay fees for another transaction');
    expect(summary!.rows.find((r) => r.label === 'Payer')?.value).toBe(SENDER);

    expect(summary!.inner).toBeDefined();
    expect(summary!.inner!.title).toBe('Send AE');
    expect(rowMap(summary!.inner!).To).toBe(RECIPIENT);
  });

  it('fails closed when the inner transaction cannot be explained', () => {
    const garbage = encode(new Uint8Array([9, 9, 9, 9]), Encoding.Bytearray) as `cb_${string}`;
    expect(summarizeTransaction(wrap(contractCallTx(garbage)))).toBeNull();
  });

  it('downgrades a shape-mismatched inner contract call through the wrapper', () => {
    // The hidden-arg transfer must not be laundered into a clean "Send tokens"
    // just because it is wrapped in a PayingForTx.
    const inner = contractCallTx(forgeCall('transfer', [ADDR, INT, ADDR], [RECIPIENT, 5n, SENDER]));
    const summary = summarizeTransaction(wrap(inner));
    expect(summary!.title).toBe('Pay fees for another transaction');
    expect(summary!.inner).toBeDefined();
    expect(summary!.inner!.title).toBe('Call a contract');
    expect(summary!.inner!.effect).toBeUndefined();
    expect(summary!.inner!.caution).toMatch(/not the shape that function should have/i);
    expect(rowMap(summary!.inner!)['Argument 3']).toBe(SENDER);
  });
});

// Whether a selector decodes as text or as bytes is a per-name coin flip (see
// `toHex`). Reading only the bytes form left every call in the text half — posting
// included — undecodable, so the prompt could only offer Cancel.
describe('summarizeTransaction — selectors that decode as text, not bytes', () => {
  const STR = { name: 's', type: 'string' };
  const STR_LIST = { name: 'm', type: { list: ['string'] } };

  it('names a post — the selector 0x1c397862 decodes as a UTF-8 string', () => {
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('post_without_tip', [STR, STR_LIST], ['hello #test', []]),
    ));
    expect(summary).not.toBeNull();
    expect(summary!.title).toBe('Publish a post');
    expect(summary!.caution).toBeUndefined();
    expect(rowMap(summary!).Text).toBe('hello #test');
  });

  it('names an AE-out swap, whose selector also decodes as a string', () => {
    const summary = summarizeTransaction(contractCallTx(forgeCall(
      'swap_exact_tokens_for_ae',
      [
        { name: 'amountIn', type: 'int' },
        { name: 'amountOutMin', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback', type: { option: ['int'] } },
      ],
      [1n, 2n, [RECIPIENT, SENDER], RECIPIENT, 999n, undefined],
    )));
    expect(summary!.title).toBe('Swap tokens');
  });

  it('still shape-checks a string-selector function rather than trusting its name', () => {
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('post_without_tip', [STR, STR_LIST, ADDR], ['hi', [], SENDER]),
    ));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
    expect(rowMap(summary!).Function).toMatch(/post_without_tip — unexpected argument shape/);
  });
});

// Buying and selling a bonding-curve token is a first-class app action, and the
// caution path it used to land on ("not a recognised standard one") reads as a
// warning about the app's own button.
describe('summarizeTransaction — bonding-curve token sale', () => {
  it('names a buy and shows the AE it spends, taken from the envelope', () => {
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('buy', [INT], [10n ** 18n]),
      (42n * 10n ** 17n).toString(),
    ));
    expect(summary!.title).toBe('Buy tokens');
    expect(summary!.caution).toBeUndefined();

    const rows = rowMap(summary);
    expect(rows['Tokens to buy']).toBe('1000000000000000000 (raw token units)');
    expect(rows['AE sent with call']).toBe('4.2 AE');
  });

  it('names a sell and shows the AE floor the call enforces', () => {
    const summary = summarizeTransaction(contractCallTx(
      forgeCall('sell', [INT, INT], [10n ** 18n, 39n * 10n ** 17n]),
    ));
    expect(summary!.title).toBe('Sell tokens');
    expect(summary!.caution).toBeUndefined();

    const rows = rowMap(summary);
    expect(rows['Tokens to sell']).toBe('1000000000000000000 (raw token units)');
    expect(rows['Minimum AE returned']).toBe('3.9 AE');
  });

  it.each([
    ['buy', [INT, ADDR], [1n, SENDER]],
    ['sell', [INT], [1n]],
  ] as const)('downgrades a %s whose arguments are the wrong shape', (fn, defs, args) => {
    const summary = summarizeTransaction(contractCallTx(forgeCall(fn, [...defs], [...args])));
    expect(summary!.title).toBe('Call a contract');
    expect(summary!.effect).toBeUndefined();
    expect(summary!.caution).toMatch(/not the shape that function should have/i);
  });
});
