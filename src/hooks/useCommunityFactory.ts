import { useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { AeSdk, AeSdkAepp } from '@aeternity/aepp-sdk';
import {
  AffiliationTreasury,
  CommunityFactory,
  initCommunityFactory,
} from 'bctsl-sdk';

import { AppService } from '../api/generated';
import { activeFactorySchemaAtom } from '../atoms/factoryAtoms';
import { ICommunityFactorySchema } from '../utils/types';
import { useAeSdk } from './useAeSdk';

export function useCommunityFactory() {
  const [activeFactorySchema, setActiveFactorySchema] = useAtom(activeFactorySchemaAtom);
  const { sdk } = useAeSdk();

  // Computed values equivalent to Vue's computed properties
  const activeFactoryCollections = useMemo(
    () => Object.values(activeFactorySchema?.collections || {}),
    [activeFactorySchema],
  );

  const activeFactoryCollectionsNum = useMemo(
    () => activeFactoryCollections.length,
    [activeFactoryCollections],
  );

  const loadFactorySchema = useCallback(async (): Promise<ICommunityFactorySchema> => {
    try {
      const result = await AppService.getFactory();
      setActiveFactorySchema(result);
      return result;
    } catch (error) {
      console.error('Failed to load factory schema:', error);
      throw error;
    }
  }, [setActiveFactorySchema]);

  const getFactory = useCallback(async (
    _sdk?: AeSdkAepp | AeSdk,
  ): Promise<CommunityFactory> => {
    // Use current state if available, otherwise load fresh
    let _factorySchema = activeFactorySchema;
    if (!_factorySchema) {
      _factorySchema = await loadFactorySchema();
    }

    const targetSdk = _sdk ?? sdk;

    if (!targetSdk) {
      throw new Error('SDK not available');
    }

    return initCommunityFactory(targetSdk, _factorySchema.address);
  }, [sdk, activeFactorySchema, loadFactorySchema]);

  const getAffiliationTreasury = useCallback(async (
    _sdk?: AeSdkAepp | AeSdk,
  ): Promise<AffiliationTreasury> => {
    const factory = await getFactory(_sdk);
    return factory.affiliationTreasury();
  }, [getFactory]);

  return {
    activeFactorySchema,
    activeFactoryCollections,
    activeFactoryCollectionsNum,
    getFactory,
    getAffiliationTreasury,
    loadFactorySchema,
  };
}
