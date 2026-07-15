import { useCallback, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { AeSdk, AeSdkAepp } from '@aeternity/aepp-sdk';
import {
  AffiliationTreasury,
  CommunityFactory,
  initCommunityFactory,
} from 'bctsl-sdk';

import { AppService } from '../api/generated';
import { activeFactorySchemaAtom } from '../atoms/factoryAtoms';
import { ensureSdkInitializeContract } from '../libs/initializeContractTyped';
import { ICommunityFactorySchema, ICollectionData } from '../utils/types';
import { mergedCollectionNameCharsPattern } from '../utils/collectionNameChars';
import { useAeSdk } from './useAeSdk';

// Module-level (not per-hook-instance) in-flight request, shared by every component calling
// `loadFactorySchema()`. Feeds can mount dozens of rows at once, all racing to load the same
// factory schema into the shared `activeFactorySchemaAtom` before it's populated; without this,
// each row would fire its own `/api/factory` request. Concurrent callers instead await the same
// promise, and only one network request goes out.
let inFlightFactorySchemaRequest: Promise<ICommunityFactorySchema> | null = null;

export function useCommunityFactory() {
  const [
    activeFactorySchema,
    setActiveFactorySchema,
  ] = useAtom<ICommunityFactorySchema | null>(activeFactorySchemaAtom);
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

  const loadFactorySchema = useCallback((): Promise<ICommunityFactorySchema> => {
    if (inFlightFactorySchemaRequest) {
      return inFlightFactorySchemaRequest;
    }
    const request = AppService.getFactory()
      .then((result) => {
        setActiveFactorySchema(result);
        return result;
      })
      .catch((error) => {
        console.error('Failed to load factory schema:', error);
        throw error;
      })
      .finally(() => {
        inFlightFactorySchemaRequest = null;
      });
    inFlightFactorySchemaRequest = request;
    return request;
  }, [setActiveFactorySchema]);

  const getFactory = useCallback(async (
    _sdk?: AeSdkAepp | AeSdk,
  ): Promise<CommunityFactory> => {
    // Use current state if available, otherwise load fresh
    let newFactorySchema = activeFactorySchema;
    if (!newFactorySchema) {
      newFactorySchema = await loadFactorySchema();
    }

    const targetSdk = _sdk ?? sdk;

    if (!targetSdk) {
      throw new Error('SDK not available');
    }

    return initCommunityFactory(
      ensureSdkInitializeContract(targetSdk as AeSdkAepp | AeSdk),
      newFactorySchema.address,
    );
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

/**
 * Ensures the factory schema (and its collections) is loaded, fetching it once if it isn't
 * already in the shared atom. Centralizes the "load once" effect that used to be copied into
 * every consumer (TokenList, ReplyToFeedItem, TokenCreatedActivityItem, ...) so it only needs
 * fixing in one place. Safe to call from many components at once — `loadFactorySchema` itself
 * dedupes concurrent in-flight requests.
 */
export function useEnsureFactorySchemaLoaded(): ICollectionData[] {
  const { activeFactoryCollections, loadFactorySchema } = useCommunityFactory();
  useEffect(() => {
    if (!activeFactoryCollections.length) {
      loadFactorySchema().catch(() => {});
    }
  }, [activeFactoryCollections.length, loadFactorySchema]);
  return activeFactoryCollections;
}

/**
 * Regex character-class body covering the name characters allowed by every known BCL token
 * collection (WORDS/English, Chinese, Arabic, Russian, and any collection added later), for use
 * with `linkify`'s `hashtagAllowedChars` option. Automatically loads the factory schema if
 * needed and stays in sync with it — no changes required here when the backend adds a collection.
 */
export function useHashtagAllowedChars(): string {
  const collections = useEnsureFactorySchemaLoaded();
  return useMemo(() => mergedCollectionNameCharsPattern(collections), [collections]);
}
