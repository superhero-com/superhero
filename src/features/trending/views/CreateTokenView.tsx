/* eslint-disable no-console */
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { Decimal } from '@/libs/decimal';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toDecimals } from '@/utils/bondingCurve';
import { toAe } from '@aeternity/aepp-sdk';
import { createCommunity } from 'bctsl-sdk';
import BigNumber from 'bignumber.js';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import Spinner from '../../../components/Spinner';
import VerifiedIcon from '../../../svg/verifiedUrl.svg?react';
import NotVerifiedIcon from '../../../svg/notVerifiedUrl.svg?react';
import { SuperheroApi } from '../../../api/backend';
import AeButton from '../../../components/AeButton';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
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

const CreateTokenView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount, sdk } = useAeSdk();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const leftHeroRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const [rightMinHeight, setRightMinHeight] = useState<number | undefined>(undefined);
  const [rightMinWidth, setRightMinWidth] = useState<number | undefined>(undefined);
  const {
    activeFactorySchema,
    activeFactoryCollections,
    loadFactorySchema,
    getFactory,
  } = useCommunityFactory();

  // Parse URL query params
  const searchParams = new URLSearchParams(location.search);
  const initialTokenName = String(searchParams.get('tokenName') || '').toUpperCase().replace(/ /g, '-').replace(/[^A-Z0-9-]/g, '');

  // Form state
  const [tokenName, setTokenName] = useState(initialTokenName);
  // Token count (used in TOKEN mode)
  const [initialBuyVolume, setInitialBuyVolume] = useState<string>('');
  // AE-first input mode and amounts
  const [inputMode, setInputMode] = useState<'AE' | 'TOKEN'>('AE');
  const [aeAmount, setAeAmount] = useState<string>('');
  const [aeAmountDisplay, setAeAmountDisplay] = useState<string>('');
  const [collectionModel, setCollectionModel] = useState<CollectionId>();
  const [tokenMetaInfo] = useState<TokenMetaInfo>({
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
  // Name availability check state
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [foundToken, setFoundToken] = useState<{
    address: string;
    sale_address?: string;
    name: string;
    price?: number;
    holders?: number;
  } | null>(null);

  // Factory and collections state
  const [loading, setLoading] = useState(true);

  const initialBuyVolumeDebounced = useDebounce(initialBuyVolume, 300);
  const aeAmountDebounced = useDebounce(aeAmount, 300);
  const tokenNameDebounced = useDebounce(tokenName, 400);

  // Computed values - use from the hook
  const activeFactoryCollectionsArr = useMemo(
    () => activeFactoryCollections,
    [activeFactoryCollections],
  );

  const selectedCollection = useMemo(
    (): ICollectionData => (activeFactorySchema?.collections || {})[collectionModel!],
    [activeFactorySchema, collectionModel],
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
      if (!initialBuyVolumeDebounced || Number.isNaN(Number(initialBuyVolumeDebounced))) {
        setPrice(Decimal.ZERO);
        return;
      }
      setLoadingPrice(true);
      try {
        const tokenCount = Number(initialBuyVolumeDebounced);
        const cost = !tokenCount || Number.isNaN(tokenCount) ? Decimal.ZERO : Decimal.from(
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
      if (!aeAmountDebounced || Number.isNaN(Number(aeAmountDebounced))) {
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
      } if (rule.CharRangeFromTo) {
        const [start, end] = rule.CharRangeFromTo;
        return `${String.fromCharCode(start)}-${String.fromCharCode(end)}`;
      }
      return '';
    });

    const regexPattern = `[^${regexParts.join('')}-]`;
    return new RegExp(regexPattern);
  };

  const validateStringWithCustomErrors = useCallback((str: string): string | true => {
    if (!selectedCollection?.allowed_name_chars) return true;

    const regex = convertRulesToRegex(selectedCollection.allowed_name_chars);

    if (!regex.test(str)) {
      return true;
    }

    const errorMessages = selectedCollection.allowed_name_chars
      .map((rule) => {
        if (rule.SingleChar) {
          return rule.SingleChar.map((code) => String.fromCharCode(code)).join(', ');
        } if (rule.CharRangeFromTo) {
          const [start, end] = rule.CharRangeFromTo;
          return `${String.fromCharCode(start)}-${String.fromCharCode(end)}`;
        }
        return null;
      })
      .filter((msg) => !!msg);

    if (!errorMessages.length) return true;

    const chars = errorMessages.join(', ');
    return `Only characters in the range "${chars}" are allowed.`;
  }, [selectedCollection?.allowed_name_chars]);

  const onNameUpdate = (value: string) => {
    if (!selectedCollection?.allowed_name_chars) {
      setTokenName(value);
      return;
    }

    const regex = convertRulesToRegex(selectedCollection.allowed_name_chars);
    const processedValue = value.toUpperCase().replace(/ /g, '-').replace(regex, '');
    setTokenName(processedValue);
  };

  // Debounced name availability check
  const nameCheckSeqRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setFoundToken(null);
      setAlreadyRegisteredAs(undefined);
      setAlreadyRegisteredName(undefined);
      const trimmed = (tokenNameDebounced || '').trim();
      if (!trimmed) {
        setNameStatus('idle');
        return;
      }
      const validation = validateStringWithCustomErrors(trimmed);
      if (validation !== true) {
        setNameStatus('invalid');
        return;
      }
      setNameStatus('checking');
      nameCheckSeqRef.current += 1;
      const mySeq = nameCheckSeqRef.current;
      try {
        const res = await SuperheroApi.listTokens({ limit: 5, search: trimmed });
        if (cancelled || mySeq !== nameCheckSeqRef.current) return;
        const items: any[] = res?.items || [];
        const exact = items.find((t: any) => t?.name === trimmed);
        if (exact && exact.address) {
          setFoundToken({
            address: exact.address,
            sale_address: exact.sale_address,
            name: exact.name,
            price: (() => {
              if (typeof exact.price === 'number') return exact.price;
              if (exact.price) return Number(exact.price);
              return undefined;
            })(),
            holders: (() => {
              if (typeof exact.holders_count === 'number') return exact.holders_count;
              if (exact.holders_count) return Number(exact.holders_count);
              return undefined;
            })(),
          });
          setNameStatus('taken');
        } else {
          setNameStatus('available');
        }
      } catch {
        if (cancelled) return;
        // On error, do not block user; treat as idle to avoid false negatives
        setNameStatus('idle');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tokenNameDebounced, validateStringWithCustomErrors]);

  // Keep focus in the name input when a taken state is detected
  useEffect(() => {
    if (nameStatus === 'taken' && nameInputRef.current) {
      // Restore focus and keep caret at end
      const input = nameInputRef.current;
      input.focus();
      const len = input.value.length;
      try {
        input.setSelectionRange(len, len);
      } catch {
        // Ignore selection errors
      }
    }
  }, [nameStatus]);

  // Sparkline removed per request; no history fetching to avoid extra network calls

  // Formatting helpers (thousands separator while preserving decimals typing)
  const sanitizeNumeric = (value: string): string => {
    let sanitized = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
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

  // After load, lock the right card minimum height to the left hero height
  useEffect(() => {
    const recalc = () => {
      const leftH = leftHeroRef.current?.offsetHeight || 0;
      const currentRightH = rightCardRef.current?.offsetHeight || 0;
      const minH = Math.max(leftH, currentRightH);
      setRightMinHeight(minH || undefined);
      // Lock width after initial layout on medium+ screens to avoid jumpy width
      const w = rightCardRef.current?.getBoundingClientRect().width || 0;
      if (w && (window.innerWidth || 0) >= 768) {
        setRightMinWidth(w);
      } else {
        setRightMinWidth(undefined);
      }
    };
    // Initial and on resize
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
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

      const data = await createCommunity(
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
        factory.address,
      );
      console.log('=========== COMMUNITY CREATED')
      console.log('data', data);
      

      // Navigate to token details
      navigate(`/trends/tokens/${tokenName}?created=true`);
    } catch (error: any) {
      console.error('Error creating token:', error);
      const message = error?.message || error?.reason || 'Unknown error';
      if (message.includes('NAME_ALREADY_REGISTERED')) {
        try {
          const searchResult = await SuperheroApi.listTokens({
            limit: 10,
            search: tokenName,
          });
          const searchItems = searchResult?.items || [];
          setAlreadyRegisteredName(tokenName);
          setAlreadyRegisteredAs(
            searchItems.find(({ name }: any) => name === tokenName)?.address,
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
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-700 rounded w-2/3 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {['row-1', 'row-2', 'row-3', 'row-4', 'row-5'].map((rowKey) => (
                  <div key={rowKey} className="h-16 bg-gray-700 rounded" />
                ))}
              </div>
              <div className="h-96 bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSubmitContent = () => {
    if (!activeAccount) {
      return (
        <div className="space-y-3">
          <ConnectWalletButton
            block
            label="Connect Wallet to Create Token"
            className="w-full"
            muted
          />
          <p className="text-sm text-white/70 text-center">
            You need to connect your wallet to create a token.
          </p>
          <AeButton
            variant="secondary"
            size="md"
            outlined
            onClick={() => { window.open('https://wallet.superhero.com', '_blank'); }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Get Superhero Wallet ↗
          </AeButton>
        </div>
      );
    }

    if (isCreating) {
      return (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-blue-400 text-center">
          <div className="animate-pulse">
            <h3 className="font-semibold mb-2">Waiting for Wallet Confirmation...</h3>
            <p>Please review and sign the transaction in your wallet to start creating your token.</p>
          </div>
        </div>
      );
    }

    return (
      <AeButton
        variant="primary"
        size="lg"
        type="submit"
        disabled={!tokenName || isCreating || nameStatus === 'checking' || nameStatus === 'taken' || nameStatus === 'invalid'}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 md:h-13 py-3"
      >
        Create Token
      </AeButton>
    );
  };

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-2 md:px-4">
      <div className="rounded-[24px] mt-4 mb-6 mx-0 md:mx-4 md:[background:linear-gradient(90deg,rgba(244,193,12,0.1),rgba(255,109,21,0.1))]">
        <div className="max-w-[1400px] mx-auto p-0 md:p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
            {/* Left Side - Banner Content */}
            <div className="min-w-0 flex-1 md:pt-2 lg:pt-[170px]" ref={leftHeroRef}>
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

                {/* Explainer Section */}
                <div className="mt-8 md:mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    How Bonding Curves Work
                  </h3>
                  <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Price Discovery Mechanism</h4>
                      <p>
                        Unlike traditional exchanges with order books, bonding curves use a mathematical formula to determine token prices.
                        The price increases as more tokens are bought and decreases when tokens are sold. This creates automatic price discovery
                        based on supply and demand.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">The Math Behind It</h4>
                      <p className="mb-2">
                        The bonding curve follows a quadratic formula:
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">price = k × supply²</code>
                      </p>
                      <p className="mb-2">
                        Where
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">k</code>
                        {' '}
                        is a constant and
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">supply</code>
                        {' '}
                        is the total number of tokens in circulation.
                      </p>
                      <p>
                        This means:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Early buyers get tokens at lower prices</li>
                        <li>Each purchase increases the price for the next buyer</li>
                        <li>Selling tokens reduces the supply and lowers the price</li>
                        <li>The curve ensures liquidity - you can always buy or sell</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">DAO Treasury</h4>
                      <p>
                        A portion of every transaction goes into a DAO treasury controlled by token holders.
                        This treasury can fund community initiatives through on-chain governance votes,
                        allowing the community to collectively decide how to grow and develop the token.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Fees & Affiliations</h4>
                      <p>
                        When creating a token, you can set an initial buy amount. A small protocol fee (5%)
                        is applied to support the platform and protocol token rewards. The rest goes into
                        the bonding curve, ensuring fair price discovery from the start.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Create Token Form */}
            <div className="max-w-[620px] flex-shrink-0" ref={rightCardRef}>
              <div className="bg-white/5 rounded-[16px] md:rounded-[24px] border border-white/10 backdrop-blur-xl py-3 px-2 md:p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))', minHeight: rightMinHeight ? `${rightMinHeight}px` : undefined, minWidth: rightMinWidth ? `${Math.round(rightMinWidth)}px` : undefined }}>
                {!activeFactorySchema ? (
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-12 bg-gray-700 rounded mb-4" />
                      <div className="h-12 bg-gray-700 rounded mb-4" />
                      <div className="h-20 bg-gray-700 rounded" />
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
                        <div className="block text-sm font-medium text-white/80 mb-2">
                          Collection
                        </div>
                        <AppSelect
                          value={collectionModel || ''}
                          onValueChange={(v) => setCollectionModel(v as CollectionId)}
                          triggerClassName="w-full px-3 py-2 bg-transparent text-white border border-gray-600/50 rounded-lg focus:outline-none transition-all duration-200 autofill:bg-transparent"
                          contentClassName="bg-gray-900 border-gray-600/50"
                        >
                          {activeFactoryCollectionsArr.map((collection: any) => (
                            <AppSelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </AppSelectItem>
                          ))}
                        </AppSelect>
                      </div>
                    )}

                    {/* Trend token name */}
                    <div>
                      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                      <label
                        htmlFor="trend-token-name"
                        className="block text-sm font-medium text-white/80 mb-2"
                      >
                        Trend token name
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/30">
                        <span className="text-white/70 text-2xl font-bold select-none">#</span>
                        <Input
                          id="trend-token-name"
                          ref={nameInputRef}
                          value={tokenName}
                          onChange={(e) => onNameUpdate(e.target.value)}
                          placeholder="TREND"
                          maxLength={20}
                          required
                          className="flex-1 bg-transparent text-white text-2xl md:text-3xl font-extrabold leading-tight border-0 border-none outline-none focus-visible:outline-none shadow-none placeholder:text-white/30 focus:border-0 focus:ring-0 focus-visible:ring-0 px-0 autofill:bg-transparent autofill:text-white"
                        />
                        {/* Inline status icon */}
                        {nameStatus === 'checking' && (
                          <Spinner />
                        )}
                        {nameStatus === 'available' && (
                          <VerifiedIcon className="w-5 h-5 text-emerald-400" />
                        )}
                        {nameStatus === 'taken' && (
                          <NotVerifiedIcon className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      {/* Helper/status text - fixed height, no layout jumps */}
                      <div className="text-xs text-white/60 mt-1 flex items-center justify-between min-h-[20px]" aria-live="polite">
                        <span>
                          {tokenName.length}
                          /20 characters
                        </span>
                        <span className="opacity-80">
                          {nameStatus === 'invalid' ? 'Invalid characters' : 'Allowed: A–Z, 0–9, and -'}
                        </span>
                      </div>
                    </div>

                    {/* Positive taken CTA is rendered below (replacing amount section) */}

                    {/* If taken, show richer Live box above */}
                    {nameStatus === 'taken' && (foundToken || alreadyRegisteredAs) && (
                      <div className="mt-20 text-xs bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                        {/* Row 1: Badge + Name + Price + Holders (left) · Sparkline (right) */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 flex-wrap w-full">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">
                              <span className="relative inline-flex">
                                <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                              </span>
                              <span className="font-medium">Trading live</span>
                            </span>
                            <div className="flex-1 w-full flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
                              <div className="text-white/80">
                                <span className="text-white/60">Token</span>
                                {' '}
                                <span className="font-mono font-bold text-white">{alreadyRegisteredName || foundToken?.name}</span>
                              </div>
                              {foundToken?.price != null && (
                                <div className="text-white/80">
                                  <span className="text-white/60">Price</span>
                                  {' '}
                                  <strong className="text-white">{foundToken.price}</strong>
                                </div>
                              )}
                              {foundToken?.holders != null && (
                                <div className="text-white/80">
                                  <span className="text-white/60">Holders</span>
                                  {' '}
                                  <strong className="text-white">{foundToken.holders.toLocaleString?.() || foundToken.holders}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Sparkline removed */}
                        </div>

                        {/* Row 2: Full-width Buy button */}
                        <AeButton
                          size="md"
                          variant="success"
                          className="w-full"
                          onClick={() => navigate(`/trends/tokens/${foundToken?.address || alreadyRegisteredAs}`)}
                        >
                          BUY TOKEN
                        </AeButton>
                      </div>
                    )}

                    {/* Initial Buy - AE-first with toggle (always shown; greyed out when taken) */}
                    <div className={nameStatus === 'taken' ? 'opacity-40 pointer-events-none select-none' : ''} aria-disabled={nameStatus === 'taken'}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="block text-sm font-medium text-white/80">
                            {inputMode === 'AE' ? 'Amount to spend (AE)' : 'Tokens to buy'}
                          </div>
                          {/* Tooltip */}
                          <div className="relative group inline-block align-middle">
                            <button
                              type="button"
                              className="text-white/70 cursor-help select-none leading-none px-1"
                              aria-label={inputMode === 'AE'
                                ? "This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"
                                : "This is the number of tokens you'll pre-buy before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"}
                            >
                              ⓘ
                            </button>
                            <div className="fixed left-1/2 -translate-x-1/2 top-24 sm:absolute sm:left-0 sm:translate-x-0 sm:top-full mt-1 hidden group-hover:block group-focus-within:block w-[320px] max-w-[min(92vw,360px)] rounded-lg border border-white/10 bg-black/80 text-white text-xs p-3 shadow-xl z-50">
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
                          Switch to
                          {' '}
                          {inputMode === 'AE' ? 'Tokens' : 'AE'}
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
                                const { display, sanitized } = formatDisplayPreserveRaw(
                                  e.target.value,
                                );
                                setAeAmountDisplay(display);
                                setAeAmount(sanitized);
                              }}
                              placeholder="0.0"
                              title="This is the amount of AE you'll spend to pre-buy tokens before the bonding curve is available to the public, at the lowest possible price. You can buy as much or as little as you want!"
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
                            Estimated tokens you&apos;ll receive:
                            {' '}
                            <span className="text-white">{estimatedTokens.prettify()}</span>
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
                          You&apos;ll deploy the token contract directly from your own wallet. Superhero simply facilitates the creation process.
                        </div>
                      </div>
                    </div>

                    {/* Advanced options removed */}
                    {/* Note consolidated above with input explanatory block */}

                    {/* Submit Section (shown even when taken, but greyed out/inactive) */}
                    <div className={`md:pt-4 ${nameStatus === 'taken' ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={nameStatus === 'taken'}>
                      {renderSubmitContent()}
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
};

export default CreateTokenView;
