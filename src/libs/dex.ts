import BigNumber from 'bignumber.js';
import {
  Contract,
  Encoded,
  type ContractMethodsBase,
} from '@aeternity/aepp-sdk';

// Use deployment ACIs from external dex-contracts to match sdk expectations
// @ts-ignore
import RouterAci from 'dex-contracts-v2/deployment/aci/AedexV2Router.aci.json';
// @ts-ignore
import FactoryAci from 'dex-contracts-v2/deployment/aci/AedexV2Factory.aci.json';
// @ts-ignore
import PairAci from 'dex-contracts-v2/deployment/aci/AedexV2Pair.aci.json';
// @ts-ignore
import Aex9Aci from 'dex-contracts-v2/deployment/aci/FungibleTokenFull.aci.json';
import { initializeContractTyped } from './initializeContractTyped';

// Mainnet addresses copied from Superhero DEX defaults
export const DEX_ADDRESSES = {
  factory: 'ct_2mfj3FoZxnhkSw5RZMcP8BfPoB1QR4QiYGNCdkAvLZ1zfF6paW' as Encoded.ContractAddress,
  router: 'ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3' as Encoded.ContractAddress,
  wae: 'ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa' as Encoded.ContractAddress,
  aeeth: 'ct_ryTY1mxqjCjq1yBn9i6HDaCSdA6thXUFZTA84EMzbWd1SLKdh' as Encoded.ContractAddress, //
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

type InitializedContract = Awaited<ReturnType<typeof Contract.initialize>>;
type ContractCallResult<T> = Promise<{ decodedResult: T }>;
type ContractTxResult = Promise<{
  hash?: string;
  tx?: { hash?: string };
  transactionHash?: string;
}>;

export interface RouterContractApi extends ContractMethodsBase {
  factory: () => ContractCallResult<string | { $options?: { address?: string } }>;
  get_amounts_out: (amountIn: bigint, path: string[]) => ContractCallResult<(bigint | string)[]>;
  get_amounts_in: (amountOut: bigint, path: string[]) => ContractCallResult<(bigint | string)[]>;
  swap_exact_tokens_for_tokens: (
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
  ) => ContractTxResult;
  swap_tokens_for_exact_tokens: (
    amountOut: bigint,
    amountInMax: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
  ) => ContractTxResult;
  swap_exact_ae_for_tokens: (
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
    options: { amount: bigint | string; [key: string]: unknown },
  ) => ContractTxResult;
  swap_ae_for_exact_tokens: (
    amountOut: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
    options: { amount: bigint | string; [key: string]: unknown },
  ) => ContractTxResult;
  swap_exact_tokens_for_ae: (
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
  ) => ContractTxResult;
  swap_tokens_for_exact_ae: (
    amountOut: bigint,
    amountInMax: bigint,
    path: string[],
    to: string,
    deadline: bigint,
    referrer: string | null,
  ) => ContractTxResult;
  add_liquidity: (
    tokenA: string,
    tokenB: string,
    amountADesired: bigint,
    amountBDesired: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    minLiquidity: bigint,
    deadline: bigint,
    options?: unknown,
  ) => ContractTxResult;
  add_liquidity_ae: (
    token: string,
    amountTokenDesired: bigint,
    amountTokenMin: bigint,
    amountAeMin: bigint,
    to: string,
    minLiquidity: bigint,
    deadline: bigint,
    options: { amount: string; [key: string]: unknown },
  ) => ContractTxResult;
  remove_liquidity: (
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    amountAMin: bigint,
    amountBMin: bigint,
    to: string,
    deadline: bigint,
    options?: unknown,
  ) => ContractTxResult;
  remove_liquidity_ae: (
    token: string,
    liquidity: bigint,
    amountTokenMin: bigint,
    amountAeMin: bigint,
    to: string,
    deadline: bigint,
    options?: unknown,
  ) => ContractTxResult;
}

export interface FactoryContractApi extends ContractMethodsBase {
  get_pair: (tokenA: string, tokenB: string) => ContractCallResult<string | null | undefined>;
}

export interface Aex9ContractApi extends ContractMethodsBase {
  allowance: (
    params: { from_account: string; for_account: string },
  ) => ContractCallResult<bigint | null | undefined>;
  create_allowance: (forAccount: string, value: bigint) => ContractTxResult;
  change_allowance: (forAccount: string, value: bigint) => ContractTxResult;
  balance: (owner: string) => ContractCallResult<bigint | string | null | undefined>;
  meta_info: () => ContractCallResult<{
    symbol?: string;
    name?: string;
    decimals?: number | string;
  }>;
}

export interface PairContractApi extends ContractMethodsBase {
  token0: () => ContractCallResult<string>;
  get_reserves: () => ContractCallResult<{ reserve0: bigint | string; reserve1: bigint | string }>;
  allowance: (
    params: { from_account: string; for_account: string },
  ) => ContractCallResult<bigint | null | undefined>;
  create_allowance: (forAccount: string, value: bigint) => ContractTxResult;
  change_allowance: (forAccount: string, value: bigint) => ContractTxResult;
  total_supply: () => ContractCallResult<bigint | string>;
  balance: (owner: string) => ContractCallResult<bigint | string | null | undefined>;
}

export type RouterContract = InitializedContract & RouterContractApi;
export type FactoryContract = InitializedContract & FactoryContractApi;
export type Aex9Contract = InitializedContract & Aex9ContractApi;
export type PairContract = InitializedContract & PairContractApi;
export type DexContracts = {
  router: RouterContract;
  factory: FactoryContract;
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
    const router = await initializeContractTyped<RouterContractApi>(
      sdk,
      { aci: ACI.Router, address: addr },
    );
    let factoryAddress: string | null = null;
    try {
      const { decodedResult } = await router.factory();
      factoryAddress = typeof decodedResult === 'string' ? decodedResult : (decodedResult?.$options?.address ?? null);
    } catch (error: any) {
      console.error(error);
    }
    if (!factoryAddress) factoryAddress = DEX_ADDRESSES.factory;
    let factory = await initializeContractTyped<FactoryContractApi>(
      sdk,
      { aci: ACI.Factory, address: factoryAddress },
    );
    // In some environments (tests/mocks),
    // router.factory may return a placeholder address without methods.
    // Fallback to known factory address if the instance doesn't expose required entrypoints.
    if (!factory || typeof factory.get_pair !== 'function') {
      factory = await initializeContractTyped<FactoryContractApi>(
        sdk,
        { aci: ACI.Factory, address: DEX_ADDRESSES.factory },
      );
    }
    return { router, factory };
  })();
  byAddr.set(addr, promise);
  return promise;
}

export function toAettos(amount: string | number, decimals = 18): bigint {
  if (!amount) return 0n;
  const bn = new BigNumber(String(amount)).shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN);
  return BigInt(bn.toFixed(0));
}

export function fromAettos(aettos: bigint | number | string, decimals = 18): string {
  return new BigNumber(String(aettos)).shiftedBy(-decimals).toString();
}

export function addSlippage(amount: bigint, slippagePct: number): bigint {
  const a = new BigNumber(amount.toString());
  const res = a.multipliedBy(1 + slippagePct / 100).integerValue(BigNumber.ROUND_DOWN);
  return BigInt(res.toFixed(0));
}

export function subSlippage(amount: bigint, slippagePct: number): bigint {
  const scaledTenthPercent = BigInt(Math.round(slippagePct * 10));
  return amount - (amount * scaledTenthPercent) / 1000n;
}

export async function ensureAllowanceForRouter(
  sdk: any,
  tokenAddress: string,
  owner: string,
  needed: bigint,
  routerAddress?: string,
): Promise<void> {
  const token = await initializeContractTyped<Aex9ContractApi>(
    sdk,
    { aci: ACI.AEX9, address: tokenAddress },
  );
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
  const pair = await initializeContractTyped<PairContractApi>(
    sdk,
    { aci: ACI.Pair, address: pairAddr },
  );
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
  const token = await initializeContractTyped<Aex9ContractApi>(
    sdk,
    { aci: ACI.AEX9, address: tokenAddress },
  );
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
    const token = await initializeContractTyped<Aex9ContractApi>(
      sdk,
      { aci: ACI.AEX9, address: tokenAddressOrAE },
    );
    const { decodedResult } = await token.balance(owner);
    return BigInt(decodedResult ?? 0);
  } catch (error: any) {
    console.error(error);
    return 0n;
  }
}

export async function getPairAllowanceToRouter(
  sdk: any,
  pairAddress: string,
  owner: string,
  routerAddress?: string,
): Promise<bigint> {
  const pair = await initializeContractTyped<PairContractApi>(
    sdk,
    { aci: ACI.Pair, address: pairAddress },
  );
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
  const pair = await initializeContractTyped<PairContractApi>(
    sdk,
    { aci: ACI.Pair, address: pairAddress },
  );
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
export async function getPairAddress(
  sdk: any,
  factory: any,
  tokenA: string,
  tokenB: string,
): Promise<string | null> {
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
): Promise<{
  pairAddress: string;
  totalSupply: bigint | null;
  reserveA: bigint;
  reserveB: bigint;
} | null> {
  const addr = await getPairAddress(sdk, factory, tokenA, tokenB);
  if (!addr) return null;
  const pair = await initializeContractTyped<PairContractApi>(
    sdk,
    { aci: ACI.Pair, address: addr },
  );
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
  return {
    pairAddress: addr, totalSupply, reserveA, reserveB,
  };
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
  const pair = await initializeContractTyped<PairContractApi>(
    sdk,
    { aci: ACI.Pair, address: pairAddress },
  );
  const { decodedResult } = await pair.balance(owner);
  return BigInt(decodedResult ?? 0);
}
