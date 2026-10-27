import { AppService } from '@/api/generated';
import type { AeSdk, Encoded } from '@aeternity/aepp-sdk';
import { initCommunityFactory } from 'bctsl-sdk';

async function getFactoryAddress(): Promise<Encoded.ContractAddress> {
  const schema = await AppService.getFactory();
  const address: Encoded.ContractAddress | undefined = schema?.address;
  if (!address) throw new Error('Community Factory address not available');
  return address;
}

/**
 * Lazily initializes and returns the AffiliationTreasury contract instance using the
 * active aepp SDK instance connected through the wallet.
 */
export async function getAffiliationTreasury(sdk: AeSdk) {
  const factoryAddress = await getFactoryAddress();
  const factory = await initCommunityFactory(sdk, factoryAddress);
  return factory.affiliationTreasury();
}
