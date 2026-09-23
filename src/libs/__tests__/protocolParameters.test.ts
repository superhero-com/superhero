// @vitest-environment node — jsdom's buffers fail the SDK's RLP encoder
import { describe, it, expect, vi } from 'vitest';
import {
  Tag, buildTxAsync, unpackTx, decode,
} from '@aeternity/aepp-sdk';
import { PINNED_PROTOCOL_PARAMETERS } from '../protocolParameters';

const ADDRESS = 'ak_11111111111111111111111111111111273Yts';
const MIN_GAS_PRICE = 1_000_000n;
const MIN_MINER_GAS_PRICE = 1_000_000_000n;
const GAS_PER_BYTE = 20;
const SPEND_BASE_GAS = 15000;

const fakeNode = () => ({
  getProtocolParameters: vi.fn(async () => ({
    currentProtocolVersion: 6,
    protocols: [{
      version: 6,
      effectiveAtHeight: 941700,
      minimumGasPrice: MIN_GAS_PRICE,
      gasPerByte: GAS_PER_BYTE,
      txBaseGas: { SpendTx: SPEND_BASE_GAS },
      contractTxBaseGas: [],
      stateGasPerBlock: {},
    }],
  })),
  getNodeSettings: vi.fn(async () => ({
    minMinerGasPrice: MIN_MINER_GAS_PRICE, maxAuthFunGas: 50000, blockGasLimit: 6_000_000,
  })),
  // Under the 70% utilization at which the SDK raises the price above the floor.
  getRecentGasPrices: vi.fn(async () => [{ minGasPrice: MIN_MINER_GAS_PRICE, utilization: 9, minutes: 1 }]),
});

const buildSpend = async (onNode: ReturnType<typeof fakeNode>, protocolParameters?: typeof PINNED_PROTOCOL_PARAMETERS) => {
  const tx = await buildTxAsync({
    tag: Tag.SpendTx,
    senderId: ADDRESS,
    recipientId: ADDRESS,
    amount: 1,
    nonce: 1,
    ttl: 0,
    onNode: onNode as never,
    ...(protocolParameters && { protocolParameters }),
  });
  const fee = BigInt(unpackTx(tx, Tag.SpendTx).fee);
  // The node's rule (aetx:min_gas_price/3): fee over serialized gas, rounded up.
  const gas = BigInt(SPEND_BASE_GAS + decode(tx).length * GAS_PER_BYTE);
  return { fee, gasPrice: (fee + gas - 1n) / gas };
};

describe('PINNED_PROTOCOL_PARAMETERS', () => {
  it('prices a transaction at what the miner accepts', async () => {
    const node = fakeNode();
    const { gasPrice } = await buildSpend(node, PINNED_PROTOCOL_PARAMETERS);
    expect(gasPrice).toBeGreaterThanOrEqual(MIN_MINER_GAS_PRICE);
  });

  it('spares the node the parameter requests', async () => {
    const node = fakeNode();
    await buildSpend(node, PINNED_PROTOCOL_PARAMETERS);
    expect(node.getProtocolParameters).not.toHaveBeenCalled();
    expect(node.getNodeSettings).not.toHaveBeenCalled();
  });

  // Canary for the SDK bug the pin works around: when this fails, drop the pin.
  it('is still needed: the node-reported parameters price a transaction below the miner minimum', async () => {
    const { gasPrice } = await buildSpend(fakeNode());
    expect(gasPrice).toBeLessThan(MIN_MINER_GAS_PRICE);
  });
});
