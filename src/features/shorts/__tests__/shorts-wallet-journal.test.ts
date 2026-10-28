// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AccountMemory, buildTx, buildTxHash, decode, encode, Encoding, Tag, unpackTx,
} from '@aeternity/aepp-sdk';
import { AciContractCallEncoder } from '@aeternity/aepp-calldata';
import {
  WalletJournal,
  validateObservation,
  walletScopeKey,
  type WalletAction,
  type WalletActionStorage,
  type WalletIntent,
} from '../shorts-wallet-journal';

function fixture() {
  const values = new Map<string, unknown>();
  const storage: WalletActionStorage = {
    change: async (scope, edit) => {
      const key = walletScopeKey(scope);
      const next = edit(structuredClone(values.get(key)));
      if (next) values.set(key, structuredClone(next));
      else values.delete(key);
      return next;
    },
  };
  const account = AccountMemory.generate();
  const intent: WalletIntent = {
    api: 'https://api.example',
    network: 'ae_uat',
    address: account.address,
    contract: encode(new Uint8Array(32).fill(1), Encoding.ContractAddress),
    method: 'paid_like',
    videoId: 'owned-test-video',
    amount: '100000000000000000',
  };
  const encoder = new AciContractCallEncoder([
    {
      contract: {
        name: 'Shorts',
        kind: 'contract_main',
        typedefs: [],
        functions: [
          {
            name: 'paid_like',
            arguments: [{ name: 'id', type: 'string' }],
            returns: { tuple: [] },
            payable: true,
            stateful: true,
          },
        ],
      },
    },
  ]);
  const unsigned = buildTx({
    tag: Tag.ContractCallTx,
    callerId: account.address,
    contractId: intent.contract as `ct_${string}`,
    abiVersion: 3,
    amount: intent.amount,
    nonce: 7,
    ttl: 100,
    gasLimit: 100000,
    gasPrice: 1000000000,
    fee: '1000000000000000',
    callData: encoder.encodeCall('Shorts', 'paid_like', [intent.videoId]),
  });
  return {
    values,
    account,
    intent,
    unsigned,
    storage,
    journal: new WalletJournal(storage),
  };
}
function observation(record: WalletAction, status = 'confirmed') {
  return {
    ...record,
    status,
    confirmations: 3,
    confirmationsRequired: 3,
    blockHash: encode(new Uint8Array(32).fill(2), Encoding.MicroBlockHash),
    blockHeight: 10,
    result: 'ok',
  };
}

describe('persistent wallet action protocol', () => {
  it('accepts a wallet nonce refresh and records the actual signed transaction', async () => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    const refreshed = buildTx({ ...unpackTx(f.unsigned, Tag.ContractCallTx), nonce: 8 });
    const raw = await f.account.signTransaction(refreshed, { networkId: 'ae_uat' });
    const saved = await f.journal.signed(action, f.unsigned, raw, 'ae_uat');
    expect(saved.nonce).toBe(8);
    expect(saved.tx).toBe(buildTxHash(raw));
  });
  it.each(['amount', 'fee', 'ttl', 'gasLimit', 'gasPrice', 'callerId', 'contractId', 'callData'])('rejects wallet changes to %s even with an allowed nonce refresh', async (field) => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    const call = unpackTx(f.unsigned, Tag.ContractCallTx);
    const changed = {
      amount: '100000000000000001',
      fee: '2000000000000000',
      ttl: 101,
      gasLimit: 200000,
      gasPrice: 2000000000,
      callerId: AccountMemory.generate().address,
      contractId: encode(new Uint8Array(32).fill(5), Encoding.ContractAddress),
      callData: encode(new Uint8Array([1, 2, 3]), Encoding.ContractBytearray),
    };
    const altered = buildTx({ ...call, nonce: 8, [field]: changed[field as keyof typeof changed] });
    const raw = await f.account.signTransaction(altered, { networkId: 'ae_uat' });
    await expect(f.journal.signed(action, f.unsigned, raw, 'ae_uat')).rejects.toThrow(
      /does not match/,
    );
    expect((await f.journal.read(f.intent))?.tx).toBeUndefined();
  });
  it.each(['ae_uat', 'ae_mainnet', 'ae_uat-inner_tx', ''])('validates legacy raw-byte signatures with network prefix %j', async (network) => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    const raw = buildTx({
      tag: Tag.SignedTx,
      encodedTx: f.unsigned,
      signatures: [await f.account.unsafeSign(
        new Uint8Array([...new TextEncoder().encode(network), ...decode(f.unsigned)]),
      )],
    });
    if (network === 'ae_uat') {
      const result = await f.journal.signed(action, f.unsigned, raw, 'ae_uat');
      expect(result.submission).toBe('prepared');
      expect(result.tx).toMatch(/^th_/);
    } else {
      await expect(f.journal.signed(action, f.unsigned, raw, 'ae_uat')).rejects.toThrow(
        /does not match/,
      );
      expect((await f.journal.read(f.intent))?.tx).toBeUndefined();
    }
  });
  it('atomically admits one action across independent callers and restores only the matching scope', async () => {
    const f = fixture();
    const otherTab = new WalletJournal(f.storage);
    const results = await Promise.allSettled([f.journal.begin(f.intent), otherTab.begin(f.intent)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await otherTab.read(f.intent)).toEqual(await f.journal.read(f.intent));
    expect(
      await otherTab.read({ ...f.intent, address: AccountMemory.generate().address }),
    ).toBeUndefined();
    expect(await otherTab.read({ ...f.intent, api: 'https://different.example' })).toBeUndefined();
    expect(await otherTab.read({ ...f.intent, network: 'ae_mainnet' })).toBeUndefined();
  });
  it('stores the exact signed hash and nonce, without signed bytes or credentials', async () => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    const raw = await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' });
    const saved = await f.journal.signed(action, f.unsigned, raw, 'ae_uat');
    expect(saved.tx).toMatch(/^th_/);
    expect(saved.nonce).toBe(7);
    expect(await new WalletJournal(f.storage).read(f.intent)).toEqual(saved);
    const serialized = JSON.stringify([...f.values.values()]);
    expect(serialized).not.toContain(raw);
    expect(serialized).not.toContain('signatures');
    await expect(f.journal.cancelUnsigned(saved)).rejects.toThrow(/may have been sent/);
    await expect(f.journal.begin(f.intent)).rejects.toThrow(/pending/);
  });
  it('fences a delayed wallet reply after cancellation and a newer request', async () => {
    const f = fixture();
    const first = await f.journal.begin(f.intent);
    await f.journal.cancelUnsigned(first);
    const second = await f.journal.begin(f.intent);
    const raw = await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' });
    await expect(f.journal.signed(first, f.unsigned, raw, 'ae_uat')).rejects.toThrow(
      /no longer active/,
    );
    expect((await f.journal.read(f.intent))?.id).toBe(second.id);
  });
  it.each(['cancel', 'submit'])('serializes cancellation against submission when %s wins', async (winner) => {
    const f = fixture();
    const otherTab = new WalletJournal(f.storage);
    const action = await f.journal.begin(f.intent);
    const raw = await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' });
    const signed = await f.journal.signed(action, f.unsigned, raw, 'ae_uat');
    const cancel = () => otherTab.cancelUnsent(signed);
    const submit = () => f.journal.attemptSubmission(action, raw);
    const results = await Promise.allSettled(winner === 'cancel'
      ? [cancel(), submit()] : [submit(), cancel()]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    if (winner === 'cancel') expect(await f.journal.read(f.intent)).toBeUndefined();
    else expect((await f.journal.read(f.intent))?.submission).toBe('attempted');
  });
  it('preserves legacy signed records without a submission marker', async () => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    const raw = await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' });
    const signed = await f.journal.signed(action, f.unsigned, raw, 'ae_uat');
    const { submission, ...legacy } = signed;
    expect(submission).toBe('prepared');
    f.values.set(walletScopeKey(f.intent), legacy);
    await expect(f.journal.cancelUnsent(legacy)).rejects.toThrow(/may have been sent/);
    await expect(f.journal.attemptSubmission(legacy, raw)).rejects.toThrow(/no longer active/);
    expect(await f.journal.read(f.intent)).toEqual(legacy);
  });
  it('refuses a substituted transaction at the submission boundary', async () => {
    const f = fixture();
    const action = await f.journal.begin(f.intent);
    await f.journal.signed(
      action,
      f.unsigned,
      await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' }),
      'ae_uat',
    );
    const wrong = await f.account.signTransaction(f.unsigned, { networkId: 'ae_mainnet' });
    await expect(f.journal.attemptSubmission(action, wrong)).rejects.toThrow(/no longer active/);
    expect((await f.journal.read(f.intent))?.submission).toBe('prepared');
  });
  it('rejects wrong-network signatures and altered intent before submission', async () => {
    const f = fixture();
    const first = await f.journal.begin(f.intent);
    const wrong = await f.account.signTransaction(f.unsigned, { networkId: 'ae_mainnet' });
    await expect(f.journal.signed(first, f.unsigned, wrong, 'ae_uat')).rejects.toThrow(
      /does not match/,
    );
    const raw = await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' });
    await expect(
      f.journal.signed({ ...first, amount: '1' }, f.unsigned, raw, 'ae_uat'),
    ).rejects.toThrow(/does not match/);
    expect((await f.journal.read(f.intent))?.tx).toBeUndefined();
  });
  it('requires matching canonical execution before clearing, and rejects stale cross-tab completion', async () => {
    const f = fixture();
    const first = await f.journal.begin(f.intent);
    const saved = await f.journal.signed(
      first,
      f.unsigned,
      await f.account.signTransaction(f.unsigned, { networkId: 'ae_uat' }),
      'ae_uat',
    );
    await Promise.all(
      [
        { status: 'unknown', confirmations: 0 },
        { status: 'mined', confirmations: 1 },
        { status: 'reorged', confirmations: 0 },
      ].map(async (change) => {
        await expect(f.journal.finish(saved, { ...observation(saved), ...change })).rejects.toThrow(
          /still unknown/,
        );
      }),
    );
    [
      { amount: '1' },
      { nonce: 8 },
      { address: AccountMemory.generate().address },
      { result: 'revert' },
      { confirmations: 0 },
      { contract: 'ct_other' },
    ].forEach((change) => {
      expect(() => validateObservation(saved, { ...observation(saved), ...change })).toThrow(
        /could not be verified/,
      );
    });
    await f.journal.finish(saved, observation(saved));
    const second = await f.journal.begin(f.intent);
    await expect(f.journal.finish(saved, observation(saved))).rejects.toThrow(/changed/);
    expect((await f.journal.read(f.intent))?.id).toBe(second.id);
  });
  it('fails closed on damaged records and storage refusal', async () => {
    const f = fixture();
    f.values.set(walletScopeKey(f.intent), { version: 999 });
    await expect(f.journal.read(f.intent)).rejects.toThrow(/could not be read/);
    await expect(f.journal.begin(f.intent)).rejects.toThrow(/could not be read/);
    const unavailable = new WalletJournal({
      change: async () => {
        throw new Error('Disk unavailable');
      },
    });
    await expect(unavailable.begin(f.intent)).rejects.toThrow('Disk unavailable');
  });
});

async function sponsoredFixture() {
  const f = fixture();
  const intent: WalletIntent = {
    ...f.intent,
    method: 'like',
    amount: '0',
    args: [f.intent.videoId!, '3'],
    sponsorship: {
      gasLimit: 100000, gasPrice: '1000000000', maxFee: '1000000000000000', ttl: 100,
    },
  };
  const abi = new AciContractCallEncoder([{
    contract: {
      name: 'Shorts',
      kind: 'contract_main',
      typedefs: [],
      functions: [{
        name: 'like',
        arguments: [{ name: 'id', type: 'string' }, { name: 'version', type: 'int' }],
        returns: { tuple: [] },
        payable: false,
        stateful: true,
      }],
    },
  }]);
  const unsigned = buildTx({ ...unpackTx(f.unsigned, Tag.ContractCallTx), amount: '0', callData: abi.encodeCall('Shorts', 'like', intent.args) });
  const action = await f.journal.begin(intent);
  const raw = await f.account.signTransaction(unsigned, { networkId: 'ae_uat', innerTx: true });
  const signed = await f.journal.signed(action, unsigned, raw, 'ae_uat');
  await f.journal.attemptSubmission(signed, raw);
  return { ...f, action: { ...signed, submission: 'attempted' as const }, raw };
}

it('preserves bounded signed inner bytes for retries and detects damaged recovery bytes', async () => {
  const f = await sponsoredFixture();
  expect((await f.journal.read(f.action))?.rawInner).toBe(f.raw);
  f.values.set(walletScopeKey(f.action), { ...f.action, rawInner: buildTx({ tag: Tag.SignedTx, encodedTx: f.unsigned, signatures: [] }) });
  await expect(f.journal.read(f.action)).rejects.toThrow();
});

it('releases only an immutable sponsor rejection and rejects contradictions', async () => {
  const f = await sponsoredFixture();
  const rejected = {
    ...f.action,
    sponsored: true,
    status: 'unknown',
    confirmations: 0,
    confirmationsRequired: 3,
    sponsorshipStatus: 'rejected',
    neverSubmitted: true,
  };
  expect(() => validateObservation(f.action, { ...rejected, sponsoredTx: f.action.tx })).toThrow();
  expect(() => validateObservation(f.action, { ...rejected, sponsorshipStatus: 'queued' })).toThrow();
  await expect(f.journal.finish(f.action, { ...rejected, neverSubmitted: false })).rejects.toThrow(/unknown/);
  await f.journal.finish(f.action, rejected);
  expect(await f.journal.read(f.action)).toBeUndefined();
});

it('requires a matching expiry proof with three blocks beyond TTL before releasing a signed Like', async () => {
  const f = await sponsoredFixture();
  const expired = {
    ...f.action,
    sponsored: true,
    sponsoredTx: f.action.tx,
    status: 'unknown',
    confirmations: 0,
    confirmationsRequired: 3,
    sponsorshipStatus: 'expired',
    sponsorshipExpired: true,
    expiryProof: {
      ttl: 100, height: 103, blockHash: encode(new Uint8Array(32).fill(4), Encoding.KeyBlockHash), payerNonce: 4,
    },
  };
  expect(() => validateObservation(f.action, { ...expired, expiryProof: { ...expired.expiryProof, height: 102 } })).toThrow();
  expect(() => validateObservation(f.action, { ...expired, expiryProof: { ...expired.expiryProof, ttl: 99 } })).toThrow();
  expect(() => validateObservation(f.action, { ...expired, sponsorshipStatus: 'signed' })).toThrow();
  await f.journal.finish(f.action, expired);
  expect(await f.journal.read(f.action)).toBeUndefined();
});
