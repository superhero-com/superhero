import { AppService } from '@/api/generated';
import type { AeSdk } from '@aeternity/aepp-sdk';
import { initCommunityFactory } from 'bctsl-sdk';
import { ensureSdkInitializeContract } from './initializeContractTyped';

async function getFactoryAddress(): Promise<string> {
  const schema = await AppService.getFactory();
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
  const factory = await initCommunityFactory(
    ensureSdkInitializeContract(sdk as any),
    factoryAddress,
  );
  return factory.affiliationTreasury();
}
