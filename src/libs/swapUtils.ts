import BigNumber from 'bignumber.js';

export type NumberLike = BigNumber.Value | bigint | number | string;
export type Reserves = [NumberLike, NumberLike];

type RoutePair = {
  token0: string;
  token1: string;
  liquidityInfo: { reserve0: NumberLike; reserve1: NumberLike };
};

function orderRoute(route: RoutePair[], tokenA: string): RoutePair[] {
  if (!route || route.length === 0) return [];
  if (route.length < 2) return route;
  const first = route[0];
  return first.token0 === tokenA || first.token1 === tokenA ? route : [...route].reverse();
}

export function getRouteReserves(route: RoutePair[], tokenA: string): Reserves[] {
  if (!route || route.length === 0) return [];
  return orderRoute(route, tokenA).reduce<[Reserves[], string]>(
    ([acc, prev], { token0, token1, liquidityInfo: { reserve0, reserve1 } }) => {
      const [reserves, next] = token0 === prev
        ? ([[reserve0, reserve1] as Reserves, token1])
        : ([[reserve1, reserve0] as Reserves, token0]);
      return [acc.concat([reserves]), next];
    },
    [[], tokenA],
  )[0];
}

function ratioFromPairReserves(pairReserves: Reserves[]): BigNumber {
  return pairReserves
    .reduce(
      (ratio, [reserveA, reserveB]) => ratio.multipliedBy(BigNumber(reserveB).div(reserveA)),
      BigNumber(1),
    );
}

export function ratioFromRoute(route: RoutePair[], tokenA: string): BigNumber {
  return ratioFromPairReserves(getRouteReserves(route, tokenA));
}

export function ratioWithDecimals(ratio: NumberLike, {
  decimalsA, decimalsB,
}: { decimalsA: number; decimalsB: number }): BigNumber {
  return BigNumber(ratio).shiftedBy(decimalsA - decimalsB);
}

export function getPath(route: { token0: string; token1: string }[], tokenA: string): string[] {
  if (!route || route.length === 0) return [];
  const ordered = orderRoute(route as any, tokenA);
  const [first, last] = (ordered as { token0: string; token1: string }[])
    .reduce<[string[], string]>(
      ([acc, prev], pair) => {
        const next = pair.token0 === prev ? pair.token1 : pair.token0;
        return [acc.concat(prev), next];
      },
      [[], tokenA],
    );
  return first.concat(last);
}

function getReceivedTokensForOnePair(
  reserveA: NumberLike,
  reserveB: NumberLike,
  amountA: NumberLike,
): BigNumber {
  const k = BigNumber(reserveA).times(reserveB);
  const newReserveA = BigNumber(reserveA).plus(amountA);
  const newReserveB = k.div(newReserveA);
  return BigNumber(reserveB).minus(newReserveB);
}

export function getReceivedTokensForPairReserves(
  pairReserves: Reserves[],
  amountA: NumberLike,
): BigNumber {
  // eslint-disable-next-line max-len
  return pairReserves.reduce((amountFrom, [reserveFrom, reserveTo]) => getReceivedTokensForOnePair(reserveFrom, reserveTo, amountFrom), BigNumber(amountA));
}

function getPriceImpactForPairReserves(pairReserves: Reserves[], amountA: NumberLike): number {
  const receivedB = getReceivedTokensForPairReserves(pairReserves, amountA);
  const marketPrice = BigNumber(1).div(ratioFromPairReserves(pairReserves));
  const newPrice = BigNumber(amountA).div(receivedB);
  return newPrice.minus(marketPrice).times(-100).div(newPrice).toNumber();
}

export function getPriceImpactForRoute(
  route: RoutePair[],
  tokenA: string,
  amountA: NumberLike,
): number {
  const pairReserves = getRouteReserves(route, tokenA);
  return getPriceImpactForPairReserves(pairReserves, amountA);
}
