import BigNumber from 'bignumber.js';

// Mainnet addresses copied from Superhero DEX defaults
export const DEX_ADDRESSES = {
  factory: 'ct_2mfj3FoZxnhkSw5RZMcP8BfPoB1QR4QiYGNCdkAvLZ1zfF6paW',
  router: 'ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3',
  wae: 'ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa',
  aeeth: 'ct_ryTY1mxqjCjq1yBn9i6HDaCSdA6thXUFZTA84EMzbWd1SLKdh',
};

// Use deployment ACIs from external dex-contracts to match sdk expectations
// @ts-ignore
import RouterAci from '../../../external/dex-contracts-v2/deployment/aci/AedexV2Router.aci.json';
// @ts-ignore
import FactoryAci from '../../../external/dex-contracts-v2/deployment/aci/AedexV2Factory.aci.json';
// @ts-ignore
import PairAci from '../../../external/dex-contracts-v2/deployment/aci/AedexV2Pair.aci.json';
// @ts-ignore
import Aex9Aci from '../../../external/dex-contracts-v2/deployment/aci/FungibleTokenFull.aci.json';

// Minimal ACIs (only the entrypoints we use)
const RouterContract = {
  functions: [
    { name: 'factory', arguments: [], returns: 'address', stateful: false, payable: false },
    {
      name: 'get_amounts_out',
      arguments: [
        { name: 'amount_in', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: false,
      payable: false,
    },
    {
      name: 'get_amounts_in',
      arguments: [
        { name: 'amount_out', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: false,
      payable: false,
    },
    {
      name: 'swap_exact_tokens_for_tokens',
      arguments: [
        { name: 'amount_in', type: 'int' },
        { name: 'amount_out_min', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: false,
    },
    {
      name: 'swap_tokens_for_exact_tokens',
      arguments: [
        { name: 'amount_out', type: 'int' },
        { name: 'amount_in_max', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: false,
    },
    {
      name: 'swap_exact_ae_for_tokens',
      arguments: [
        { name: 'amount_out_min', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: true,
    },
    {
      name: 'swap_tokens_for_exact_ae',
      arguments: [
        { name: 'amount_out', type: 'int' },
        { name: 'amount_in_max', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: false,
    },
    {
      name: 'swap_exact_tokens_for_ae',
      arguments: [
        { name: 'amount_in', type: 'int' },
        { name: 'amount_out_min', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: false,
    },
    {
      name: 'swap_ae_for_exact_tokens',
      arguments: [
        { name: 'amount_out', type: 'int' },
        { name: 'path', type: { list: ['address'] } },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'int' },
        { name: 'callback_opt', type: { option: ['address'] } },
      ],
      returns: { list: ['int'] },
      stateful: true,
      payable: true,
    },
  ],
  kind: 'contract_main',
  name: 'AedexV2Router',
  payable: true,
};

const FactoryContract = {
  functions: [
    {
      name: 'get_pair',
      arguments: [
        { name: 'token_a', type: 'address' },
        { name: 'token_b', type: 'address' },
      ],
      returns: { option: ['address'] },
      stateful: false,
      payable: false,
    },
  ],
  kind: 'contract_main',
  name: 'AedexV2Factory',
  payable: false,
};

const PairContract = {
  functions: [
    { name: 'token0', arguments: [], returns: 'address', stateful: false, payable: false },
    {
      name: 'get_reserves',
      arguments: [],
      returns: { record: [{ name: 'reserve0', type: 'int' }, { name: 'reserve1', type: 'int' }, { name: 'block_timestamp_last', type: 'int' }] },
      stateful: false,
      payable: false,
    },
  ],
  kind: 'contract_main',
  name: 'AedexV2Pair',
  payable: false,
};

const Aex9Contract = {
  functions: [
    { name: 'meta_info', arguments: [], returns: { record: [{ name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'decimals', type: 'int' }] }, stateful: false, payable: false },
    {
      name: 'allowance',
      arguments: [{ name: 'allowance_accounts', type: { record: [{ name: 'from_account', type: 'address' }, { name: 'for_account', type: 'address' }] } }],
      returns: { option: ['int'] },
      stateful: false,
      payable: false,
    },
    {
      name: 'create_allowance',
      arguments: [
        { name: 'for_account', type: 'address' },
        { name: 'value', type: 'int' },
      ],
      returns: 'unit',
      stateful: true,
      payable: false,
    },
    {
      name: 'change_allowance',
      arguments: [
        { name: 'for_account', type: 'address' },
        { name: 'value_change', type: 'int' },
      ],
      returns: 'unit',
      stateful: true,
      payable: false,
    },
  ],
  kind: 'contract_interface',
  name: 'IAEX9Minimal',
  payable: false,
};

// Match aepp-sdk's expected ACI format (raw contract object or array with contract entries)
export const ACI = {
  Router: RouterAci,
  Factory: FactoryAci,
  Pair: PairAci,
  AEX9: Aex9Aci,
};

// Constants matching dex-ui
export const MINIMUM_LIQUIDITY = 1000n;

export type DexContracts = {
  router: any;
  factory: any;
};

// Cache initialized contract instances per sdk instance and router address
const dexContractsCache: WeakMap<any, Map<string, Promise<DexContracts>>> = new WeakMap();

export async function initDexContracts(sdk: any, routerAddress?: string): Promise<DexContracts> {
  const addr = routerAddress || DEX_ADDRESSES.router;
  let byAddr = dexContractsCache.get(sdk);
  if (!byAddr) { byAddr = new Map(); dexContractsCache.set(sdk, byAddr); }
  const cached = byAddr.get(addr);
  if (cached) return cached;
  const promise = (async () => {
    const router = await sdk.initializeContract({ aci: ACI.Router, address: addr });
    let factoryAddress: string | null = null;
    try {
      const { decodedResult } = await router.factory();
      factoryAddress = typeof decodedResult === 'string' ? decodedResult : (decodedResult?.$options?.address ?? null);
    } catch {}
    if (!factoryAddress) factoryAddress = DEX_ADDRESSES.factory;
    let factory = await sdk.initializeContract({ aci: ACI.Factory, address: factoryAddress });
    // In some environments (tests/mocks), router.factory may return a placeholder address without methods.
    // Fallback to known factory address if the instance doesn't expose required entrypoints.
    if (!factory || typeof (factory as any).get_pair !== 'function') {
      factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory });
    }
    return { router, factory } as DexContracts;
  })();
  byAddr.set(addr, promise);
  return promise;
}

export function toAettos(amount: string | number, decimals = 18): bigint {
  if (!amount) return 0n;
  return BigInt(new BigNumber(String(amount)).shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN).toString());
}

export function fromAettos(aettos: bigint | number | string, decimals = 18): string {
  return new BigNumber(String(aettos)).shiftedBy(-decimals).toString();
}

export function addSlippage(amount: bigint, slippagePct: number): bigint {
  const a = new BigNumber(amount.toString());
  const res = a.multipliedBy(1 + slippagePct / 100).integerValue(BigNumber.ROUND_DOWN);
  return BigInt(res.toString());
}

export function subSlippage(amount: bigint, slippagePct: number): bigint {
  const a = new BigNumber(amount.toString());
  const res = a.multipliedBy(1 - slippagePct / 100).integerValue(BigNumber.ROUND_DOWN);
  return BigInt(res.toString());
}

export async function ensureAllowanceForRouter(sdk: any, tokenAddress: string, owner: string, needed: bigint, routerAddress?: string): Promise<void> {
  const token = await sdk.initializeContract({ aci: ACI.AEX9, address: tokenAddress });
  const forAccount = (routerAddress || DEX_ADDRESSES.router).replace('ct_', 'ak_');
  const { decodedResult } = await token.allowance({ from_account: owner, for_account: forAccount });
  const current = decodedResult ?? 0n;
  if (current >= needed) return;
  if (decodedResult == null) {
    await token.create_allowance(forAccount, needed);
  } else {
    await token.change_allowance(forAccount, needed - current);
  }
}

export async function fetchPairReserves(sdk: any, factory: any, tokenA: string, tokenB: string): Promise<{ reserveA: bigint; reserveB: bigint; token0: string } | null> {
  const { decodedResult: pairOpt } = await factory.get_pair(tokenA, tokenB);
  if (!pairOpt) return null;
  const pairAddr: string = pairOpt;
  const pair = await sdk.initializeContract({ aci: ACI.Pair, address: pairAddr });
  const { decodedResult: token0 } = await pair.token0();
  const { decodedResult: reserves } = await pair.get_reserves();
  const reserve0 = BigInt(reserves.reserve0);
  const reserve1 = BigInt(reserves.reserve1);
  const reserveA = token0 === tokenA ? reserve0 : reserve1;
  const reserveB = token0 === tokenA ? reserve1 : reserve0;
  return { reserveA, reserveB, token0 };
}

export async function getRouterTokenAllowance(
  sdk: any,
  tokenAddress: string,
  owner: string,
  routerAddress?: string,
): Promise<bigint> {
  const token = await sdk.initializeContract({ aci: ACI.AEX9, address: tokenAddress });
  const forAccount = (routerAddress || DEX_ADDRESSES.router).replace('ct_', 'ak_');
  const { decodedResult } = await token.allowance({ from_account: owner, for_account: forAccount });
  return (decodedResult ?? 0n) as bigint;
}

export async function getTokenBalance(
  sdk: any,
  tokenAddressOrAE: string | 'AE',
  owner: string,
): Promise<bigint> {
  try {
    if (tokenAddressOrAE === 'AE') {
      const aettos = await sdk.getBalance(owner);
      return BigInt(aettos);
    }
    const token = await sdk.initializeContract({ aci: ACI.AEX9, address: tokenAddressOrAE });
    const { decodedResult } = await token.balance(owner);
    return BigInt(decodedResult ?? 0);
  } catch (error: any) {
    // Enhanced error logging for new accounts
    if (error?.message?.includes('404') || error?.status === 404) {
      console.info('[dex] Account not found for token balance:', owner);
      console.info('[dex] This is normal for new accounts - user needs to bridge ETH first');
    } else {
      console.warn('[dex] Failed to get token balance:', error?.message || error);
    }
    return 0n;
  }
}

export async function getPairAllowanceToRouter(
  sdk: any,
  pairAddress: string,
  owner: string,
  routerAddress?: string,
): Promise<bigint> {
  const pair = await sdk.initializeContract({ aci: ACI.Pair, address: pairAddress });
  const forAccount = (routerAddress || DEX_ADDRESSES.router).replace('ct_', 'ak_');
  const { decodedResult } = await pair.allowance({ from_account: owner, for_account: forAccount });
  return (decodedResult ?? 0n) as bigint;
}

export async function ensurePairAllowanceForRouter(
  sdk: any,
  pairAddress: string,
  owner: string,
  needed: bigint,
  routerAddress?: string,
): Promise<void> {
  const pair = await sdk.initializeContract({ aci: ACI.Pair, address: pairAddress });
  const forAccount = (routerAddress || DEX_ADDRESSES.router).replace('ct_', 'ak_');
  const { decodedResult } = await pair.allowance({ from_account: owner, for_account: forAccount });
  const current = decodedResult ?? 0n;
  if (current >= needed) return;
  if (decodedResult == null) {
    await pair.create_allowance(forAccount, needed);
  } else {
    await pair.change_allowance(forAccount, needed - current);
  }
}

// Helpers
export function estimateRemovalMinimums(
  reserveA: bigint,
  reserveB: bigint,
  totalSupply: bigint,
  lpToBurn: bigint,
  slippagePct: number,
): { minA: bigint; minB: bigint } {
  if (totalSupply <= 0n || lpToBurn <= 0n) return { minA: 0n, minB: 0n };
  const amountAExp = (lpToBurn * reserveA) / totalSupply;
  const amountBExp = (lpToBurn * reserveB) / totalSupply;
  return {
    minA: subSlippage(amountAExp, slippagePct),
    minB: subSlippage(amountBExp, slippagePct),
  };
}

// Pair helpers and liquidity flows
export async function getPairAddress(sdk: any, factory: any, tokenA: string, tokenB: string): Promise<string | null> {
  try {
    const { decodedResult } = await factory.get_pair(tokenA, tokenB);
    return decodedResult || null;
  } catch {
    return null;
  }
}

export async function getPairInfo(
  sdk: any,
  factory: any,
  tokenA: string,
  tokenB: string,
): Promise<{ pairAddress: string; totalSupply: bigint | null; reserveA: bigint; reserveB: bigint } | null> {
  const addr = await getPairAddress(sdk, factory, tokenA, tokenB);
  if (!addr) return null;
  const pair = await sdk.initializeContract({ aci: ACI.Pair, address: addr });
  let totalSupply: bigint | null = null;
  try {
    const { decodedResult } = await pair.total_supply();
    totalSupply = BigInt(decodedResult);
  } catch {
    totalSupply = null;
  }
  const { decodedResult: token0 } = await pair.token0();
  const { decodedResult: reserves } = await pair.get_reserves();
  const reserve0 = BigInt(reserves.reserve0);
  const reserve1 = BigInt(reserves.reserve1);
  const reserveA = token0 === tokenA ? reserve0 : reserve1;
  const reserveB = token0 === tokenA ? reserve1 : reserve0;
  return { pairAddress: addr, totalSupply, reserveA, reserveB };
}

export function sortAddresses(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export type AddLiquidityParams = {
  tokenA: string; // ct_
  tokenB: string; // ct_
  amountADesired: bigint;
  amountBDesired: bigint;
  slippagePct: number;
  minimumLiquidity?: bigint | null;
  toAccount: string; // ak_
  deadlineMs: number; // Date.now() + mins*60k
};

export async function addLiquidity(
  sdk: any,
  router: any,
  params: AddLiquidityParams,
): Promise<any> {
  const minA = subSlippage(params.amountADesired, params.slippagePct);
  const minB = subSlippage(params.amountBDesired, params.slippagePct);
  const minL = params.minimumLiquidity ?? MINIMUM_LIQUIDITY;
  return router.add_liquidity(
    params.tokenA,
    params.tokenB,
    params.amountADesired,
    params.amountBDesired,
    minA,
    minB,
    params.toAccount,
    minL,
    BigInt(params.deadlineMs),
  );
}

export type AddLiquidityAeParams = {
  token: string; // ct_ for the non-AE token
  amountTokenDesired: bigint;
  amountAeDesired: bigint;
  slippagePct: number;
  minimumLiquidity?: bigint | null;
  toAccount: string; // ak_
  deadlineMs: number;
};

export async function addLiquidityAe(
  sdk: any,
  router: any,
  params: AddLiquidityAeParams,
): Promise<any> {
  const minT = subSlippage(params.amountTokenDesired, params.slippagePct);
  const minAe = subSlippage(params.amountAeDesired, params.slippagePct);
  const minL = params.minimumLiquidity ?? MINIMUM_LIQUIDITY;
  return router.add_liquidity_ae(
    params.token,
    params.amountTokenDesired,
    minT,
    minAe,
    params.toAccount,
    minL,
    BigInt(params.deadlineMs),
    { amount: params.amountAeDesired.toString() },
  );
}

export type RemoveLiquidityParams = {
  tokenA: string;
  tokenB: string;
  liquidity: bigint;
  minAmountA: bigint;
  minAmountB: bigint;
  toAccount: string;
  deadlineMs: number;
};

export async function removeLiquidity(
  router: any,
  params: RemoveLiquidityParams,
): Promise<any> {
  return router.remove_liquidity(
    params.tokenA,
    params.tokenB,
    params.liquidity,
    params.minAmountA,
    params.minAmountB,
    params.toAccount,
    BigInt(params.deadlineMs),
  );
}

export type RemoveLiquidityAeParams = {
  token: string;
  liquidity: bigint;
  minAmountToken: bigint;
  minAmountAe: bigint;
  toAccount: string;
  deadlineMs: number;
};

export async function removeLiquidityAe(
  router: any,
  params: RemoveLiquidityAeParams,
): Promise<any> {
  return router.remove_liquidity_ae(
    params.token,
    params.liquidity,
    params.minAmountToken,
    params.minAmountAe,
    params.toAccount,
    BigInt(params.deadlineMs),
  );
}

export async function getLpBalance(
  sdk: any,
  pairAddress: string,
  owner: string,
): Promise<bigint> {
  const pair = await sdk.initializeContract({ aci: ACI.Pair, address: pairAddress });
  const { decodedResult } = await pair.balance(owner);
  return BigInt(decodedResult ?? 0);
}



