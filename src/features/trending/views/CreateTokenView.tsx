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
  const [aeAmountDisplay, setAeAmountDisplay] = useState<string>('');
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

  // Formatting helpers (thousands separator while preserving decimals typing)
  const sanitizeNumeric = (value: string): string => {
    let sanitized = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    const [intPart, decPart = ''] = sanitized.split('.');
    const limitedDec = decPart.substring(0, 21);
    return limitedDec ? `${intPart}.${limitedDec}` : intPart;
  };

  const formatThousands = (value: string): string => {
    if (!value) return '';
    const [intPart, decPart] = value.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${withSep}.${decPart}` : withSep;
  };

  const formatDisplayPreserveRaw = (raw: string): { display: string; sanitized: string } => {
    const sanitized = sanitizeNumeric(raw);
    const hasDot = raw.includes('.');
    const rawDec = hasDot ? raw.split('.')[1] ?? '' : '';
    const intSan = sanitizeNumeric(raw.split('.')[0] || '');
    const intFormatted = formatThousands(intSan);
    if (!hasDot) {
      return { display: intFormatted, sanitized };
    }
    const cleanedRawDec = (rawDec || '').replace(/[^0-9]/g, '').substring(0, 21);
    const display = `${intFormatted}.${cleanedRawDec}`;
    return { display, sanitized };
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
      navigate(`/trends/tokens/${tokenName}`);
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
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-2 md:px-4">
      <div className="rounded-[24px] mt-4 mb-6 mx-0 md:mx-4 md:[background:linear-gradient(90deg,rgba(244,193,12,0.1),rgba(255,109,21,0.1))]">
        <div className="max-w-[1400px] mx-auto p-0 md:p-6">
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
                <p className="text-white/75 max-w-3xl lg:max-w-none text-lg leading-relaxed mb-0 md:mb-6">
                  Tokenized trends are community tokens launched on a bonding curve.
                  Price moves with buys/sells, no order books. Each token mints a DAO treasury
                  that can fund initiatives via on-chain votes.
                </p>
              </div>
            </div>

            {/* Right Side - Create Token Form */}
            <div className="max-w-[620px] flex-shrink-0">
              <div className="bg-white/5 rounded-[16px] md:rounded-[24px] border border-white/10 backdrop-blur-xl py-3 px-2 md:p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))' }}>
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
                      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/30">
                        <span className="text-white/70 text-2xl font-bold select-none">#</span>
                      <Input
                          ref={nameInputRef}
                        value={tokenName}
                        onChange={(e) => onNameUpdate(e.target.value)}
                          placeholder={'TREND'}
                        maxLength={20}
                        required
                          className="flex-1 bg-transparent text-white text-2xl md:text-3xl font-extrabold leading-tight border-0 border-none outline-none focus-visible:outline-none shadow-none placeholder:text-white/30 focus:border-0 focus:ring-0 focus-visible:ring-0 px-0 autofill:bg-transparent autofill:text-white"
                      />
                      </div>
                      {validateStringWithCustomErrors(tokenName)}
                      <div className="text-xs text-white/60 mt-1 md:flex md:items-center md:justify-between">
                        <span>{tokenName.length}/20 characters</span>
                        <span className="opacity-80 block md:inline mt-1 md:mt-0">Allowed are CAPITAL LETTERS and dashes (-)</span>
                      </div>
                    </div>

                    {/* Already Registered Warning */}
                    {alreadyRegisteredAs && alreadyRegisteredName && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                        <p>
                          Token <span className="font-mono font-bold">{alreadyRegisteredName}</span> is already registered.{' '}
                          <button
                            type="button"
                            onClick={() => navigate(`/trends/tokens/${alreadyRegisteredAs}`)}
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
                        <div className="flex items-center gap-2">
                          <label className="block text-sm font-medium text-white/80">
                            {inputMode === 'AE' ? 'Amount to spend (AE)' : 'Tokens to buy'}
                          </label>
                          {/* Tooltip */}
                          <div className="relative group inline-block align-middle">
                            <span
                              tabIndex={0}
                              className="text-white/70 cursor-help select-none leading-none px-1"
                              aria-label={inputMode === 'AE' 
                                ? "This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"
                                : "This is the number of tokens you'll pre-buy before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"}
                            >
                              ⓘ
                            </span>
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block group-focus-within:block w-[320px] max-w-[80vw] rounded-lg border border-white/10 bg-black/80 text-white text-xs p-3 shadow-xl z-20">
                              {inputMode === 'AE'
                                ? "This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"
                                : "This is the number of tokens you'll pre-buy before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"}
                            </div>
                          </div>
                        </div>
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
                              value={aeAmountDisplay}
                              onChange={(e) => {
                                const { display, sanitized } = formatDisplayPreserveRaw(e.target.value);
                                setAeAmountDisplay(display);
                                setAeAmount(sanitized);
                              }}
                              placeholder="0.0"
                              title={"This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"}
                              className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:border-[#4ecdc4] focus:outline-none shadow-none"
                            />
                            <div className="text-white font-extrabold text-2xl leading-none">AE</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setAeAmount('1'); setAeAmountDisplay('1'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">1 AE</button>
                            <button type="button" onClick={() => { setAeAmount('10'); setAeAmountDisplay('10'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">10 AE</button>
                            <button type="button" onClick={() => { setAeAmount('100'); setAeAmountDisplay('100'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100 AE</button>
                            <button type="button" onClick={() => { setAeAmount('500'); setAeAmountDisplay('500'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">500 AE</button>
                            <button type="button" onClick={() => { setAeAmount('100000'); setAeAmountDisplay('100,000'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100K AE</button>
                          </div>
                          <div className="text-sm text-white/70">
                            Estimated tokens you'll receive: <span className="text-white">{estimatedTokens.prettify()}</span>
                          </div>
                          
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={formatThousands(initialBuyVolume)}
                              onChange={(e) => setInitialBuyVolume(sanitizeNumeric(e.target.value))}
                              placeholder="0.0"
                              className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:border-[#4ecdc4] focus:outline-none shadow-none"
                            />
                            <div className="text-white font-extrabold text-2xl leading-none">TOKENS</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setInitialBuyVolume('500000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">500K</button>
                            <button type="button" onClick={() => setInitialBuyVolume('1000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">1M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('5000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">5M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('10000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">10M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('100000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100M</button>
                          </div>
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
                      {/* Shared explanatory note (tooltip carries the AE explanation now) */}
                      <div className="text-sm text-white/80 bg-white/5 rounded-lg p-3 mt-2 space-y-1">
                        <div className="text-white text-sm md:text-md">
                          Once created, your token will be available for trading on the platform. The bonding curve mechanism ensures fair price discovery based on supply and demand.
                        </div>
                        <div className="opacity-80">
                          You'll deploy the token contract directly from your own wallet. Superhero simply facilitates the creation process.
                        </div>
                      </div>
                    </div>

                    {/* Advanced options removed */}

                    {/* Note consolidated above with input explanatory block */}

                    {/* Submit Section */}
                    <div className="md:pt-4">
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
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 md:h-13 py-3"
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
