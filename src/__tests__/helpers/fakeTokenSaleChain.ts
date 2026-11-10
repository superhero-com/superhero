import BigNumber from 'bignumber.js';
import { buyPrice, curvePrice, sellReturn } from './bondingCurveContract';

type FakeAeSdk = {
  getBalance: (address: string) => Promise<string>;
  _accounts: { current: Record<string, object> };
};
type FakeSale = Record<string, (...args: any[]) => Promise<unknown>>;

/**
 * One account trading one token sale on an in-memory chain, behind the parts of
 * bctsl-sdk's BondingCurveTokenSale and of the AeSdk that the app calls. Trades settle
 * through the contract model, and the SDK's slippage handling is kept as it is: a buy
 * sends the dry-run price plus the margin (the contract keeps what it charges), a sell
 * demands the dry-run return minus the margin. Both dry-run before the wallet signs and
 * execute after it.
 */
export interface FakeTokenSaleChain {
  account: string;
  token: string;
  /** Token supply, the account's AE and token balances, in aettos. */
  supply: bigint;
  ae: bigint;
  tokens: bigint;
  /** Entrypoints the wallet was asked to sign, in order. */
  signed: string[];
  /** The account's SDK. */
  sdk: FakeAeSdk;
  /** The sale as bctsl-sdk's init hands it to `sdk`. */
  saleFor: (sdk: FakeAeSdk) => FakeSale;
}

const percentOf = (amount: bigint, percent: number | bigint | string) => BigInt(
  new BigNumber(amount.toString()).times(percent.toString()).div(100).toFixed(0),
);
// What bctsl-sdk's toTokenDecimals does with a plain token count.
const tokenDecimals = (count: number | string) => BigInt(
  new BigNumber(count.toString()).shiftedBy(18).toFixed(),
);
const revert = (reason: string) => new Error(`Invocation failed: "${reason}"`);

export function createFakeTokenSaleChain({
  account, token, sale, supply, ae, tokens = 0n,
}: {
  account: string; token: string; sale: string; supply: bigint; ae: bigint; tokens?: bigint;
}): FakeTokenSaleChain {
  let allowance = 0n;
  let txCount = 0;

  const chain: Omit<FakeTokenSaleChain, 'saleFor'> = {
    account,
    token,
    supply,
    ae,
    tokens,
    signed: [],
    sdk: {
      getBalance: async (address) => (address === account ? chain.ae : 0n).toString(),
      _accounts: { current: { [account]: {} } },
    },
  };

  async function sign(entrypoint: string) {
    chain.signed.push(entrypoint);
    txCount += 1;
    return `th_${entrypoint}${txCount}`;
  }

  const saleContract: FakeSale = {
    bondingCurveContract: async () => ({ instance: {} }),
    tokenContractInstance: async () => ({
      balance: async (address: string) => ({
        decodedResult: address === account ? chain.tokens : 0n,
      }),
    }),
    buy: async (count: number | string, _denomination: unknown, slippagePercent = 3) => {
      const amount = tokenDecimals(count);
      const quoted = buyPrice(chain.supply, amount);
      const sent = quoted + percentOf(quoted, slippagePercent);
      if (sent > chain.ae) throw new Error('Insufficient balance');
      const hash = await sign('buy');
      const charged = buyPrice(chain.supply, amount);
      if (sent < charged) throw revert('AE_AMOUNT_NOT_SUFFICIENT');
      const supplyBefore = chain.supply;
      chain.ae -= charged;
      chain.tokens += amount;
      chain.supply += amount;
      return {
        hash,
        decodedEvents: [
          { name: 'Buy', args: [charged, charged - curvePrice(supplyBefore, amount), supplyBefore] },
          { name: 'Mint', args: [account, amount], contract: { address: token } },
        ],
      };
    },
    createSellAllowance: async (count: number | string) => {
      const amount = tokenDecimals(count);
      await sign('create_allowance');
      allowance = amount;
      return amount.toString();
    },
    sellWithExistingAllowance: async (countTokenDecimals: string, slippagePercent = 3) => {
      const amount = BigInt(countTokenDecimals);
      const quoted = sellReturn(chain.supply, amount);
      const minimum = quoted - percentOf(quoted, slippagePercent);
      const hash = await sign('sell');
      if (allowance < amount || chain.tokens < amount) throw revert('ALLOWANCE_NOT_EXISTENT');
      const paid = sellReturn(chain.supply, amount);
      if (paid < minimum) throw revert('MINIMAL_RETURN_NOT_MEET');
      const supplyBefore = chain.supply;
      allowance -= amount;
      chain.tokens -= amount;
      chain.supply -= amount;
      chain.ae += paid;
      return {
        hash,
        decodedEvents: [
          { name: 'Sell', args: [paid, supplyBefore] },
          { name: 'Burn', args: [sale.replace('ct_', 'ak_'), amount], contract: { address: token } },
        ],
      };
    },
  };

  return Object.assign(chain, { saleFor: () => saleContract });
}
