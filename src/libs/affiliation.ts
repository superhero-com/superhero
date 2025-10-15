import { DefaultService } from '@/api/generated';
import type { AeSdk } from '@aeternity/aepp-sdk';
import { initCommunityFactory } from 'bctsl-sdk';

/**
 * Returns the active Community Factory address from the Trendminer backend schema.
 */
export async function getFactoryAddress(): Promise<string> {
  const schema = await DefaultService.getFactory();
  const address: string | undefined = schema?.address;
  if (!address) throw new Error('Community Factory address not available');
  return address;
}

/**
 * Lazily initializes and returns the AffiliationTreasury contract instance using the
 * active aepp SDK instance connected through the wallet.
 */
export async function getAffiliationTreasury(sdk: AeSdk) {
  const factoryAddress = await getFactoryAddress();
  const factory = await initCommunityFactory(sdk as any, factoryAddress);
  return factory.affiliationTreasury();
}

/** Converts human AE to aettos BigInt (18 decimals) */
export function aeToAettos(amountAe: number): bigint {
  if (!Number.isFinite(amountAe) || amountAe <= 0) return 0n;
  // Avoid floating imprecision by converting through string
  const [intPart, fracPartRaw] = String(amountAe).split('.');
  const fracPart = (fracPartRaw || '').slice(0, 18).padEnd(18, '0');
  const combined = `${intPart}${fracPart}`.replace(/^0+/, '') || '0';
  return BigInt(combined);
}


