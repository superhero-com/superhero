import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { AssetInput } from '@/features/trendminer';
import { Decimal } from '@/libs/decimal';
import { calculateBuyPriceWithAffiliationFee, toDecimals } from '@/utils/bondingCurve';
import { toAe } from "@aeternity/aepp-sdk";
import { createCommunity } from "bctsl-sdk";
import BigNumber from "bignumber.js";
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendminerApi } from '../api/backend';
import AeButton from '../components/AeButton';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { Input } from '../components/ui/input';
import RepositoriesList from '../features/trendminer/components/RepositoriesList';
import { useAeSdk } from '../hooks/useAeSdk';
import { useCommunityFactory } from '../hooks/useCommunityFactory';
import type {
    CollectionId,
    IAllowedNameChars,
    ICollectionData,
} from '../utils/types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface TokenMetaInfo {
  collection: string;
  description: string;
  website: string;
  twitter: string;
}

export default function CreateTokenView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount, sdk } = useAeSdk();
  const { 
    activeFactorySchema, 
    activeFactoryCollections, 
    loadFactorySchema,
    getFactory 
  } = useCommunityFactory();
  
  // Parse URL query params
  const searchParams = new URLSearchParams(location.search);
  const initialTokenName = searchParams.get('repo') || '';
  
  // Form state
  const [tokenName, setTokenName] = useState(initialTokenName);
  const [initialBuyVolume, setInitialBuyVolume] = useState<string>('');
  const [collectionModel, setCollectionModel] = useState<CollectionId>();
  const [tokenMetaInfo, setTokenMetaInfo] = useState<TokenMetaInfo>({
    collection: 'word',
    description: '',
    website: '',
    twitter: '',
  });
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [alreadyRegisteredName, setAlreadyRegisteredName] = useState<string>();
  const [alreadyRegisteredAs, setAlreadyRegisteredAs] = useState<string>();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [price, setPrice] = useState(Decimal.ZERO);
  
  // Factory and collections state
  const [loading, setLoading] = useState(true);
  
  const initialBuyVolumeDebounced = useDebounce(initialBuyVolume, 300);
  
  // Computed values - use from the hook
  const activeFactoryCollectionsArr = useMemo(() => 
    activeFactoryCollections,
    [activeFactoryCollections]
  );
  
  const selectedCollection = useMemo((): ICollectionData => 
    (activeFactorySchema?.collections || {})[collectionModel!],
    [activeFactorySchema, collectionModel]
  );

  // Load factory schema on mount
  useEffect(() => {
    const initializeFactory = async () => {
      try {
        setLoading(true);
        await loadFactorySchema();
      } catch (error) {
        console.error('Failed to load factory schema:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeFactory();
  }, [loadFactorySchema]);

  // Set initial collection when factory loads
  useEffect(() => {
    if (activeFactorySchema && !collectionModel && activeFactoryCollectionsArr.length > 0) {
      const firstCollection = activeFactoryCollectionsArr[0] as any;
      setCollectionModel(firstCollection?.id);
    }
  }, [activeFactorySchema, collectionModel, activeFactoryCollectionsArr]);

  // Price calculation effect
  useEffect(() => {
    const calculatePrice = async () => {
      if (!initialBuyVolumeDebounced || isNaN(Number(initialBuyVolumeDebounced))) {
        setPrice(Decimal.ZERO);
        return;
      }
      
      setLoadingPrice(true);
      try {
        // This would use your actual price calculation logic
        // For now, using a simplified calculation
        const volume = Number(initialBuyVolumeDebounced);
        const calculatedPrice = !volume || isNaN(volume) ? Decimal.ZERO : Decimal.from(
            toAe(
              calculateBuyPriceWithAffiliationFee(
                new BigNumber(0),
                new BigNumber(toDecimals(volume, 18).toString()),
              ),
            ),
          );
        setPrice(calculatedPrice);
      } catch (error) {
        console.error('Price calculation error:', error);
        setPrice(Decimal.ZERO);
      } finally {
        setLoadingPrice(false);
      }
    };
    
    calculatePrice();
  }, [initialBuyVolumeDebounced]);

  // Validation functions
  const convertRulesToRegex = (rules: IAllowedNameChars[]): RegExp => {
    const regexParts = rules.map((rule) => {
      if (rule.SingleChar) {
        return rule.SingleChar.map((code) => String.fromCharCode(code))
          .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
      } else if (rule.CharRangeFromTo) {
        const [start, end] = rule.CharRangeFromTo;
        return `${String.fromCharCode(start)}-${String.fromCharCode(end)}`;
      }
      return '';
    });
    
    const regexPattern = `[^${regexParts.join('')}-]`;
    return new RegExp(regexPattern);
  };

  const validateStringWithCustomErrors = (str: string): string | true => {
    if (!selectedCollection?.allowed_name_chars) return true;
    
    const regex = convertRulesToRegex(selectedCollection.allowed_name_chars);
    
    if (!regex.test(str)) {
      return true;
    }
    
    const errorMessages = selectedCollection.allowed_name_chars
      .map((rule) => {
        if (rule.SingleChar) {
          return rule.SingleChar.map((code) => String.fromCharCode(code)).join(', ');
        } else if (rule.CharRangeFromTo) {
          const [start, end] = rule.CharRangeFromTo;
          return `${String.fromCharCode(start)}-${String.fromCharCode(end)}`;
        }
        return null;
      })
      .filter((msg) => !!msg);
    
    if (!errorMessages.length) return true;
    
    const chars = errorMessages.join(', ');
    return `Only characters in the range "${chars}" are allowed.`;
  };

  const onNameUpdate = (value: string) => {
    if (!selectedCollection?.allowed_name_chars) {
      setTokenName(value);
      return;
    }
    
    const regex = convertRulesToRegex(selectedCollection.allowed_name_chars);
    const processedValue = value.toUpperCase().replace(/ /g, '-').replace(regex, '');
    setTokenName(processedValue);
  };

  // Token creation
  const deploy = async () => {
    try {
      setErrorMessage(undefined);
      setAlreadyRegisteredAs(undefined);
      setIsCreating(true);

      const factory = await getFactory();

      if (!selectedCollection?.id) {
        throw new Error('Collection not found');
      }

      if (!sdk) {
        throw new Error('SDK not available');
      }
      
      await createCommunity(
        sdk,
        selectedCollection.id,
        {
          token: {
            name: tokenName,
          },
          metaInfo: new Map(Object.entries(tokenMetaInfo)),
          initialBuyCount: initialBuyVolume || 0,
        },
        undefined,
        factory.address
      );

      // Navigate to token details
      navigate(`/trendminer/tokens/${tokenName}`);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      if (message.includes('NAME_ALREADY_REGISTERED')) {
        try {
          const searchResult = await TrendminerApi.listTokens({
            limit: 10,
            search: tokenName,
          });
          const searchItems = searchResult?.items || [];
          setAlreadyRegisteredName(tokenName);
          setAlreadyRegisteredAs(
            searchItems.find(({ name }: any) => name === tokenName)?.address
          );
        } catch {
          // ignore search error
        }
      }
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    deploy();
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-700 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent mb-2">
              Create Token
            </h1>
            <p className="text-white/75 max-w-2xl mx-auto">
              Tokenized trends are community tokens launched on a bonding curve. 
              Create your own token and build a community around your trend.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side - Explore Section */}
          <div className="border-r border-white/10 pr-6">
            <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6">
              <RepositoriesList />
            </div>
          </div>

          {/* Right Side - Create Token Form */}
          <div className="sticky top-20 h-fit">
            <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6">
              {!activeFactorySchema ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-700 rounded mb-4"></div>
                    <div className="h-12 bg-gray-700 rounded mb-4"></div>
                    <div className="h-20 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Messages */}
                  {!alreadyRegisteredAs && errorMessage && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                      <h3 className="font-semibold mb-2">Oops!</h3>
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  {/* Collection Selector */}
                  {activeFactoryCollectionsArr.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Collection
                      </label>
                      <select
                        value={collectionModel || ''}
                        onChange={(e) => setCollectionModel(e.target.value as CollectionId)}
                        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-purple-400"
                      >
                        {activeFactoryCollectionsArr.map((collection: any) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Token Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Unique Token Name
                    </label>
                    <Input
                      value={tokenName}
                      onChange={(e) => onNameUpdate(e.target.value)}
                      placeholder={selectedCollection ? `Enter ${selectedCollection.name?.toLowerCase()} name` : 'Enter token name'}
                      maxLength={20}
                      required
                      className="bg-gray-800 text-white border-gray-600 placeholder:text-white/50 focus:border-purple-400"
                    />
                    {validateStringWithCustomErrors(tokenName)}
                    <div className="text-xs text-white/60 mt-1">
                      {tokenName.length}/20 characters
                    </div>
                  </div>

                  {/* Already Registered Warning */}
                  {alreadyRegisteredAs && alreadyRegisteredName && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                      <p>
                        Token <span className="font-mono font-bold">{alreadyRegisteredName}</span> is already registered.{' '}
                        <button
                          type="button"
                          onClick={() => navigate(`/trendminer/tokens/${alreadyRegisteredAs}`)}
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Buy it here
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Initial Buy Volume */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Initial Buy Volume (AE)
                    </label>
                    <AssetInput
                      modelValue={initialBuyVolume}
                      onUpdateModelValue={(value) => setInitialBuyVolume(value)}
                      tokenSymbol={tokenName}
                      isCoin={false}
                      maxBtnAllowed
                      className="bg-gray-800 text-white border-gray-600 placeholder:text-white/50 focus:border-purple-400"
                    />
                    <div className="text-sm text-white/70 mt-2">
                      <p>This amount will be used to buy initial tokens for your wallet.</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span>Cost:</span>
                        <LivePriceFormatter
                        row
                        aePrice={price}
                        watchPrice={false}
                        priceLoading={loadingPrice}
                        />        
                        <span>including fees.</span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Options Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                  </button>

                  {/* Advanced Options */}
                  {showAdvancedOptions && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Description
                        </label>
                        <textarea
                          value={tokenMetaInfo.description}
                          onChange={(e) => setTokenMetaInfo(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your token..."
                          maxLength={500}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-purple-400 placeholder:text-white/50 resize-none"
                        />
                        <div className="text-xs text-white/60 mt-1">
                          {tokenMetaInfo.description.length}/500 characters
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Website
                        </label>
                        <Input
                          type="url"
                          value={tokenMetaInfo.website}
                          onChange={(e) => setTokenMetaInfo(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://mytoken.com"
                          className="bg-gray-800 text-white border-gray-600 placeholder:text-white/50 focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Twitter
                        </label>
                        <Input
                          type="url"
                          value={tokenMetaInfo.twitter}
                          onChange={(e) => setTokenMetaInfo(prev => ({ ...prev, twitter: e.target.value }))}
                          placeholder="https://twitter.com/mytoken"
                          className="bg-gray-800 text-white border-gray-600 placeholder:text-white/50 focus:border-purple-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div className="text-sm text-white/70 bg-white/5 rounded-lg p-3">
                    <strong>Note:</strong> Once created, your token will be available for trading on our platform. 
                    The bonding curve mechanism ensures fair price discovery based on supply and demand.
                  </div>

                  {/* Submit Section */}
                  <div className="pt-4">
                    {!activeAccount ? (
                      <div className="space-y-3">
                        <ConnectWalletButton 
                          block 
                          label="Connect Wallet to Create Token"
                          className="w-full"
                        />
                        <p className="text-sm text-white/70 text-center">
                          You need to connect your wallet to create a token.
                        </p>
                        <AeButton
                          variant="secondary"
                          size="md"
                          outlined
                          onClick={() => window.open('https://wallet.superhero.com', '_blank')}
                          className="w-full"
                        >
                          Get Superhero Wallet ↗
                        </AeButton>
                      </div>
                    ) : isCreating ? (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-blue-400 text-center">
                        <div className="animate-pulse">
                          <h3 className="font-semibold mb-2">Waiting for Wallet Confirmation...</h3>
                          <p>Please review and sign the transaction in your wallet to start creating your token.</p>
                        </div>
                      </div>
                    ) : (
                      <AeButton
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!tokenName || isCreating}
                      >
                        Create Token
                      </AeButton>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}