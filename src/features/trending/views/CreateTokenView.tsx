import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { AssetInput } from '@/features/trending';
import { Decimal } from '@/libs/decimal';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toDecimals } from '@/utils/bondingCurve';
import { toAe } from "@aeternity/aepp-sdk";
import { createCommunity } from "bctsl-sdk";
import BigNumber from "bignumber.js";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendminerApi } from '../../../api/backend';
import AeButton from '../../../components/AeButton';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { Input } from '../../../components/ui/input';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useCommunityFactory } from '../../../hooks/useCommunityFactory';
import type {
  CollectionId,
  IAllowedNameChars,
  ICollectionData,
} from '../../../utils/types';

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
  const nameInputRef = useRef<HTMLInputElement>(null);
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
  // Token count (used in TOKEN mode)
  const [initialBuyVolume, setInitialBuyVolume] = useState<string>('');
  // AE-first input mode and amounts
  const [inputMode, setInputMode] = useState<'AE' | 'TOKEN'>('AE');
  const [aeAmount, setAeAmount] = useState<string>('');
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
  // Advanced options removed
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [price, setPrice] = useState(Decimal.ZERO);

  // Factory and collections state
  const [loading, setLoading] = useState(true);

  const initialBuyVolumeDebounced = useDebounce(initialBuyVolume, 300);
  const aeAmountDebounced = useDebounce(aeAmount, 300);

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

  // Price/estimate calculation effects
  // TOKEN mode: estimate AE cost from token count
  useEffect(() => {
    if (inputMode !== 'TOKEN') return;
    const run = async () => {
      if (!initialBuyVolumeDebounced || isNaN(Number(initialBuyVolumeDebounced))) {
        setPrice(Decimal.ZERO);
        return;
      }
      setLoadingPrice(true);
      try {
        const tokenCount = Number(initialBuyVolumeDebounced);
        const cost = !tokenCount || isNaN(tokenCount) ? Decimal.ZERO : Decimal.from(
          toAe(
            calculateBuyPriceWithAffiliationFee(
              new BigNumber(0),
              new BigNumber(toDecimals(tokenCount, 18).toString()),
            ),
          ),
        );
        setPrice(cost);
      } catch (error) {
        console.error('Price calculation error:', error);
        setPrice(Decimal.ZERO);
      } finally {
        setLoadingPrice(false);
      }
    };
    run();
  }, [inputMode, initialBuyVolumeDebounced]);

  // AE mode: estimate tokens from AE amount
  const [estimatedTokens, setEstimatedTokens] = useState<Decimal>(Decimal.ZERO);
  useEffect(() => {
    if (inputMode !== 'AE') return;
    const run = async () => {
      if (!aeAmountDebounced || isNaN(Number(aeAmountDebounced))) {
        setEstimatedTokens(Decimal.ZERO);
        return;
      }
      setLoadingPrice(true);
      try {
        const ae = Number(aeAmountDebounced);
        const tokensBn = calculateTokensFromAE(new BigNumber(0), ae);
        setEstimatedTokens(Decimal.from(tokensBn.toString()));
      } catch (error) {
        console.error('Token estimation error:', error);
        setEstimatedTokens(Decimal.ZERO);
      } finally {
        setLoadingPrice(false);
      }
    };
    run();
  }, [inputMode, aeAmountDebounced]);

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

  // Focus and select Trend token name on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, []);

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

      // Determine initial buy token count from selected mode
      let initialBuyCount: number = 0;
      if (inputMode === 'AE') {
        const ae = Number(aeAmount || 0);
        if (ae > 0) {
          const tokensBn = calculateTokensFromAE(new BigNumber(0), ae);
          initialBuyCount = Number(tokensBn.toString());
        }
      } else {
        initialBuyCount = Number(initialBuyVolume || 0);
      }

      await createCommunity(
        sdk,
        selectedCollection.id,
        {
          token: {
            name: tokenName,
          },
          metaInfo: new Map(Object.entries(tokenMetaInfo)),
          initialBuyCount,
        },
        undefined,
        factory.address
      );

      // Navigate to token details
      navigate(`/trending/tokens/${tokenName}`);
    } catch (error: any) {
      console.error('Error creating token:', error);
      const message = error?.message || error?.reason || 'Unknown error';
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
      setErrorMessage(`Oops, something went wrong. \n${message}`);
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
      <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
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
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-4">
      <div className="rounded-[24px] mt-4 mb-6 mx-4" style={{ background: 'linear-gradient(90deg, rgba(244, 193, 12, 0.1), rgba(255, 109, 21, 0.1))' }}>
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
            {/* Left Side - Banner Content */}
            <div className="min-w-0 flex-1">
              <div className="text-center lg:text-left">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white mb-4">
                  Create Your Token.
                  <br />
                  Build Your Community.
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    Own the Trend.
                  </span>
                </div>
                <p className="text-white/75 max-w-3xl lg:max-w-none text-lg leading-relaxed mb-6">
                  Tokenized trends are community tokens launched on a bonding curve.
                  Price moves with buys/sells, no order books. Each token mints a DAO treasury
                  that can fund initiatives via on-chain votes.
                </p>
              </div>
            </div>

            {/* Right Side - Create Token Form */}
            <div className="max-w-[500px] flex-shrink-0">
              <div className="bg-white/5 rounded-[24px] border border-white/10 backdrop-blur-xl p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))' }}>
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
                          className="w-full px-3 py-2 bg-transparent text-white border border-gray-600/50 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 autofill:bg-transparent"
                        >
                          {activeFactoryCollectionsArr.map((collection: any) => (
                            <option key={collection.id} value={collection.id}>
                              {collection.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Trend token name */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Trend token name
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus-within:border-white/30">
                        <span className="text-white/70 text-2xl font-bold select-none">#</span>
                        <Input
                          ref={nameInputRef}
                          value={tokenName}
                          onChange={(e) => onNameUpdate(e.target.value)}
                          placeholder={'TREND'}
                          maxLength={20}
                          required
                          className="flex-1 bg-transparent text-white text-2xl md:text-3xl leading-tight border-0 outline-none shadow-none placeholder:text-white/30 focus:border-0 focus:ring-0 autofill:bg-transparent autofill:text-white"
                        />
                      </div>
                      {validateStringWithCustomErrors(tokenName)}
                      <div className="text-xs text-white/60 mt-1">
                        {tokenName.length}/20 characters • Allowed: CAPITAL LETTERS and dashes (-)
                      </div>
                    </div>

                    {/* Already Registered Warning */}
                    {alreadyRegisteredAs && alreadyRegisteredName && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                        <p>
                          Token <span className="font-mono font-bold">{alreadyRegisteredName}</span> is already registered.{' '}
                          <button
                            type="button"
                            onClick={() => navigate(`/trending/tokens/${alreadyRegisteredAs}`)}
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            Buy it here
                          </button>
                        </p>
                      </div>
                    )}

                    {/* Initial Buy - AE-first with toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-white/80">
                          {inputMode === 'AE' ? 'Amount to spend (AE)' : 'Tokens to buy'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setInputMode(inputMode === 'AE' ? 'TOKEN' : 'AE')}
                          className="text-xs underline text-purple-300 hover:text-purple-200"
                        >
                          Switch to {inputMode === 'AE' ? 'Tokens' : 'AE'}
                        </button>
                      </div>

                      {inputMode === 'AE' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={aeAmount}
                              onChange={(e) => setAeAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                              placeholder="0.0"
                              className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:border-[#4ecdc4] focus:outline-none"
                            />
                            <div className="text-white/80 font-semibold">AE</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setAeAmount('1')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">1 AE</button>
                            <button type="button" onClick={() => setAeAmount('10')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">10 AE</button>
                            <button type="button" onClick={() => setAeAmount('100')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100 AE</button>
                            <button type="button" onClick={() => setAeAmount('500')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">500 AE</button>
                          </div>
                          <div className="text-sm text-white/70">
                            Estimated tokens you'll receive: <span className="text-white">{estimatedTokens.prettify()}</span>
                          </div>
                          <div className="text-xs text-white/70 bg-white/5 rounded-lg p-3">
                            This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!
                            <br />
                            <span className="opacity-80">Note: You'll deploy the token contract directly from your own wallet. Superhero simply facilitates the creation process.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <AssetInput
                            modelValue={initialBuyVolume}
                            onUpdateModelValue={(value) => setInitialBuyVolume(value)}
                            tokenSymbol={tokenName}
                            isCoin={false}
                            maxBtnAllowed
                            className="bg-transparent text-white border-0 placeholder:text-white/50 focus:ring-2 focus:ring-purple-400/20 rounded-lg transition-all duration-200 autofill:bg-transparent"
                          />
                          <div className="text-sm text-white/70 mt-1">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span>Estimated cost:</span>
                              <LivePriceFormatter
                                row
                                aePrice={price}
                                watchPrice={false}
                                priceLoading={loadingPrice}
                              />
                              <span>(incl. fees)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced options removed */}

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
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
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
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
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
    </div>
  );
}
