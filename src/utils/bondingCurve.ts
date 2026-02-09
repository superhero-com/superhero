/* eslint-disable max-len */
import BigNumber from 'bignumber.js';

// Constants mirror Vue calculators
const a = 0.001;
const k = 0.00000001;
const c = 0.0009999;
const DECIMALS = new BigNumber(10).pow(18); // 1e18

export function toDecimals(amount: number | string, decimals: number | string = 18): BigNumber {
  return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(Number(decimals) || 18));
}

export function toAe(aettos: BigNumber | string | number): number {
  const n = BigNumber.isBigNumber(aettos) ? (aettos as BigNumber) : new BigNumber(aettos);
  return Number(n.dividedBy(DECIMALS).toFixed(18));
}

function integrateTrapezoidal(f: (x: number) => number, aStart: number, bEnd: number, n = 100) {
  const h = (bEnd - aStart) / n;
  let sum = 0.5 * (f(aStart) + f(bEnd));
  for (let i = 1; i < n; i += 1) {
    const x = aStart + i * h;
    sum += f(x);
  }
  return sum * h;
}

// Core price integrator (returns aettos)
function calculatePrice(totalSupplyAettos: BigNumber, countAettos: BigNumber): BigNumber {
  const totalSupplyInDecimals = totalSupplyAettos.div(DECIMALS).toNumber();
  const countInDecimals = countAettos.div(DECIMALS).toNumber();
  const f = (x: number) => a * Math.exp(k * x) - c;
  const cumulativeTotal = integrateTrapezoidal(f, totalSupplyInDecimals, totalSupplyInDecimals + countInDecimals);
  return new BigNumber(cumulativeTotal).multipliedBy(DECIMALS);
}

export function calculateTokensFromAE(totalSupplyAettos: BigNumber, aeAmount: number, tolerance = 1e-3): BigNumber {
  const priceAettos = toDecimals(aeAmount, 18);
  const maxIterations = 1000;
  const f = (x: number) => a * Math.exp(k * x) - c;
  const totalSupplyInDecimals = totalSupplyAettos.div(DECIMALS).toNumber();
  const priceInDecimals = priceAettos.div(DECIMALS).toNumber();

  let low = 0;
  let high = 1e12; // Arbitrary upper bound
  let mid = 0;
  let iterations = 0;
  while (iterations < maxIterations) {
    mid = (low + high) / 2;
    const integralValue = integrateTrapezoidal(f, totalSupplyInDecimals, totalSupplyInDecimals + mid);
    if (Math.abs(integralValue - priceInDecimals) < tolerance) break;
    if (integralValue < priceInDecimals) low = mid; else high = mid;
    iterations += 1;
  }
  // Return number of tokens (not scaled by DECIMALS)
  return new BigNumber(mid);
}

export function calculateBuyPrice(totalSupplyAettos: BigNumber, countAettos: BigNumber): BigNumber {
  return calculatePrice(totalSupplyAettos, countAettos);
}

export function calculateSellReturn(totalSupplyAettos: BigNumber, sellTokensAettos: BigNumber): BigNumber {
  return calculatePrice(totalSupplyAettos.minus(sellTokensAettos), sellTokensAettos);
}

export function calculateBuyPriceWithAffiliationFee(totalSupplyAettos: BigNumber, countAettos: BigNumber): BigNumber {
  return calculateBuyPrice(totalSupplyAettos, countAettos).multipliedBy(1.005);
}
