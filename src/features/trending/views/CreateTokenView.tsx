/* eslint-disable no-console */
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { Decimal } from '@/libs/decimal';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toDecimals } from '@/utils/bondingCurve';
import { collectionLabel } from '@/utils/collection';
import { toAe } from '@aeternity/aepp-sdk';
import BigNumber from 'bignumber.js';
import { useAtom } from 'jotai';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { transactionTypeAtom, createTokenDetailsAtom } from '@/atoms/transactionConfirmAtom';
import {
  useTransactionNotification,
  TxPayloadType,
  type TxPayload,
} from '@/features/transaction-notification';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { createCommunity } from '../libs/createCommunity';
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

interface TokenMetaInfo {
  collection: string;
  description: string;
  website: string;
  twitter: string;
}

const CreateTokenView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount, sdk } = useAeSdk();
  const [, setTransactionType] = useAtom(transactionTypeAtom);
  const [, setCreateTokenDetails] = useAtom(createTokenDetailsAtom);
  const { notifySubmitted, notifyPendingTx, notifyError } = useTransactionNotification();
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  const initialBuyVolumeDebounced = useDebouncedValue(initialBuyVolume, 300);
  const aeAmountDebounced = useDebouncedValue(aeAmount, 300);
  const tokenNameDebounced = useDebouncedValue(tokenName, 400);

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
    return t('trending.createToken.errors.allowedCharsRange', { chars });
  }, [selectedCollection?.allowed_name_chars, t]);

  const normalizeTokenName = useCallback((value: string): string => {
    if (!selectedCollection?.allowed_name_chars) return value;
    const regex = convertRulesToRegex(selectedCollection.allowed_name_chars);
    // Global flag so ALL disallowed chars are stripped, not just the first.
    const stripRegex = new RegExp(regex.source, 'g');
    return value.toUpperCase().replace(/ /g, '-').replace(stripRegex, '');
  }, [selectedCollection?.allowed_name_chars]);

  // While an IME composition is active (e.g. typing Chinese via pinyin), do NOT
  // transform the value — uppercasing / stripping mid-composition feeds a changed
  // value back into the controlled input and aborts the composition, so only the
  // Latin pinyin survives. We normalize once the composition commits instead.
  const isComposingName = useRef(false);

  const onNameUpdate = (value: string) => {
    if (isComposingName.current) {
      setTokenName(value);
      return;
    }
    setTokenName(normalizeTokenName(value));
  };

  const onNameCompositionStart = () => {
    isComposingName.current = true;
  };

  const onNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingName.current = false;
    setTokenName(normalizeTokenName(e.currentTarget.value));
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
        const exact = items.find((item: any) => item?.name === trimmed);
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

  // Token creation
  const deploy = async () => {
    setTransactionType('create-token');
    setCreateTokenDetails({
      tokenName,
      inputMode,
      aeAmount: inputMode === 'AE' ? aeAmount : undefined,
      tokenAmount: inputMode === 'TOKEN' ? initialBuyVolume : undefined,
      estimatedCost: inputMode === 'TOKEN' ? price : undefined,
      estimatedTokens: inputMode === 'AE' ? estimatedTokens : undefined,
    });

    const notificationPayload: TxPayload = {
      type: TxPayloadType.CreateToken,
      tokenName,
    };

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

      notifySubmitted(notificationPayload);

      const txHash = await createCommunity(
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

      notifyPendingTx(notificationPayload, txHash);

      // Navigate to token details
      navigate(`/trends/tokens/${tokenName}?created=true&txHash=${txHash}`);
    } catch (error: any) {
      console.error('Error creating token:', error);
      const message = error?.message || error?.reason || t('trending.createToken.errors.unknownError');
      notifyError(message);
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
      setErrorMessage(t('trending.createToken.errors.somethingWentWrong', { message }));
    } finally {
      setIsCreating(false);
      setTransactionType(null);
      setCreateTokenDetails(null);
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
            label={t('trending.createToken.submit.connectWalletToCreate')}
            className="w-full"
            muted
          />
          <p className="text-sm text-white/70 text-center">
            {t('trending.createToken.submit.connectWalletHint')}
          </p>
          <AeButton
            type="button"
            variant="secondary"
            size="md"
            outlined
            onClick={() => { window.open('https://wallet.superhero.com', '_blank'); }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {t('trending.createToken.submit.getSuperheroWallet')}
          </AeButton>
        </div>
      );
    }

    if (isCreating) {
      return (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-blue-400 text-center">
          <div className="animate-pulse">
            <h3 className="font-semibold mb-2">{t('trending.createToken.submit.waitingForConfirmation')}</h3>
            <p>{t('trending.createToken.submit.reviewAndSign')}</p>
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 md:h-14 py-3"
      >
        {t('trending.createToken.submit.createToken')}
      </AeButton>
    );
  };

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-2 md:px-4">
      <div className="rounded-[24px] mt-2 mb-6 mx-0 md:mx-4">
        <div className="max-w-[1400px] mx-auto p-0 md:px-6 md:pb-6 md:pt-3">
          {/* Hero heading — visible on mobile/tablet above the form; hidden on xl (shown in left column instead) */}
          <div className="xl:hidden px-2 pt-2 pb-2 text-center">
            <h3 className="text-2xl md:text-4xl font-bold leading-tight text-white mb-3">
              {t('trending.createToken.hero.line1')}
              <br />
              {t('trending.createToken.hero.line2')}
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                {t('trending.createToken.hero.line3')}
              </span>
            </h3>
            <p className="hidden md:block text-white/75 text-base leading-relaxed">
              {t('trending.createToken.hero.subtitle')}
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 xl:items-start xl:justify-between">
            {/* Form — rendered first in DOM so it appears at top on mobile/tablet.
                On xl screens xl:order-2 moves it visually to the right column. */}
            <div className="w-full xl:w-[620px] xl:flex-shrink-0 xl:order-2">
              <div className="bg-white/5 rounded-[16px] md:rounded-[24px] border border-white/10 backdrop-blur-xl py-3 px-2 md:p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))' }}>
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
                        <h3 className="font-semibold mb-2">{t('trending.createToken.oops')}</h3>
                        <p>{errorMessage}</p>
                      </div>
                    )}

                    {/* Collection Selector */}
                    {activeFactoryCollectionsArr.length > 1 && (
                      <div>
                        <div className="block text-sm font-medium text-white/80 mb-2">
                          {t('trending.createToken.collection')}
                        </div>
                        <div
                          role="radiogroup"
                          aria-label={t('trending.createToken.collection')}
                          className="grid grid-cols-2 gap-2"
                        >
                          {activeFactoryCollectionsArr.map((collection: any) => {
                            const selected = collectionModel === collection.id;
                            return (
                              <button
                                key={collection.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setCollectionModel(collection.id as CollectionId)}
                                className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                                  selected
                                    ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
                                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]'
                                }`}
                              >
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                    selected
                                      ? 'border-emerald-400'
                                      : 'border-white/30 group-hover:border-white/50'
                                  }`}
                                >
                                  {selected && (
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                  )}
                                </span>
                                <span
                                  className={`min-w-0 truncate text-sm font-semibold ${
                                    selected ? 'text-white' : 'text-white/90'
                                  }`}
                                >
                                  {collectionLabel(collection.name)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Trend token name */}
                    <div>
                      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                      <label
                        htmlFor="trend-token-name"
                        className="block text-sm font-medium text-white/80 mb-2"
                      >
                        {t('trending.createToken.trendTokenName')}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/30">
                        <span className="text-white/70 text-2xl font-bold select-none">#</span>
                        <Input
                          id="trend-token-name"
                          ref={nameInputRef}
                          value={tokenName}
                          onChange={(e) => onNameUpdate(e.target.value)}
                          onCompositionStart={onNameCompositionStart}
                          onCompositionEnd={onNameCompositionEnd}
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
                          {t('trending.createToken.charactersCount', { count: tokenName.length, max: 20 })}
                        </span>
                        <span className="opacity-80" dir="auto">
                          {nameStatus === 'invalid' ? t('trending.createToken.invalidCharacters') : (selectedCollection?.description || t('trending.createToken.allowedCharsHint'))}
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
                              <span className="font-medium">{t('trending.createToken.tradingLive')}</span>
                            </span>
                            <div className="flex-1 w-full flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
                              <div className="text-white/80">
                                <span className="text-white/60">{t('trending.createToken.token')}</span>
                                {' '}
                                <span className="font-mono font-bold text-white">{alreadyRegisteredName || foundToken?.name}</span>
                              </div>
                              {foundToken?.price != null && (
                                <div className="text-white/80">
                                  <span className="text-white/60">{t('trending.createToken.price')}</span>
                                  {' '}
                                  <strong className="text-white">{foundToken.price}</strong>
                                </div>
                              )}
                              {foundToken?.holders != null && (
                                <div className="text-white/80">
                                  <span className="text-white/60">{t('trending.createToken.holders')}</span>
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
                          type="button"
                          size="md"
                          variant="success"
                          className="w-full"
                          onClick={() => navigate(`/trends/tokens/${foundToken?.name || alreadyRegisteredName}`)}
                        >
                          {t('trending.createToken.buyToken')}
                        </AeButton>
                      </div>
                    )}

                    {/* Initial Buy - AE-first with toggle (always shown; greyed out when taken) */}
                    <div className={nameStatus === 'taken' ? 'opacity-40 pointer-events-none select-none' : ''} aria-disabled={nameStatus === 'taken'}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="block text-sm font-medium text-white/80">
                            {inputMode === 'AE' ? t('trending.createToken.amountToSpend') : t('trending.createToken.tokensToBuy')}
                          </div>
                          {/* Tooltip */}
                          <div className="relative group inline-block align-middle">
                            <button
                              type="button"
                              className="text-white/70 cursor-help select-none leading-none px-1"
                              aria-label={inputMode === 'AE'
                                ? t('trending.createToken.prebuyTooltipAe')
                                : t('trending.createToken.prebuyTooltipTokens')}
                            >
                              ⓘ
                            </button>
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block group-focus-within:block w-[min(320px,80vw)] rounded-lg border border-white/10 bg-gray-900/95 text-white text-xs p-3 shadow-xl z-50">
                              {inputMode === 'AE'
                                ? t('trending.createToken.prebuyTooltipAe')
                                : t('trending.createToken.prebuyTooltipTokens')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInputMode(inputMode === 'AE' ? 'TOKEN' : 'AE')}
                          className="text-xs underline text-purple-300 hover:text-purple-200"
                        >
                          {t('trending.createToken.switchTo', { target: inputMode === 'AE' ? t('trending.createToken.tokensUnit') : 'AE' })}
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
                              title={t('trending.createToken.prebuyTooltipAe')}
                              className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:border-[#4ecdc4] focus:outline-none shadow-none"
                            />
                            <div className="text-white font-extrabold text-2xl leading-none">AE</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => { setAeAmount('1'); setAeAmountDisplay('1'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">1 AE</button>
                            <button type="button" onClick={() => { setAeAmount('10'); setAeAmountDisplay('10'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">10 AE</button>
                            <button type="button" onClick={() => { setAeAmount('100'); setAeAmountDisplay('100'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100 AE</button>
                            <button type="button" onClick={() => { setAeAmount('500'); setAeAmountDisplay('500'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">500 AE</button>
                            <button type="button" onClick={() => { setAeAmount('100000'); setAeAmountDisplay('100,000'); }} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100K AE</button>
                          </div>
                          <div className="text-sm text-white/70">
                            {t('trending.createToken.estimatedTokensReceive')}
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
                            <div className="text-white font-extrabold text-2xl leading-none">{t('trending.createToken.tokensUnitUpper')}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setInitialBuyVolume('500000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">500K</button>
                            <button type="button" onClick={() => setInitialBuyVolume('1000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">1M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('5000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">5M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('10000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">10M</button>
                            <button type="button" onClick={() => setInitialBuyVolume('100000000')} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors">100M</button>
                          </div>
                          <div className="text-sm text-white/70 mt-1">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span>{t('trending.createToken.estimatedCost')}</span>
                              <LivePriceFormatter
                                row
                                aePrice={price}
                                watchPrice={false}
                                priceLoading={loadingPrice}
                              />
                              <span>{t('trending.createToken.inclFees')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Shared explanatory note (tooltip carries the AE explanation now) */}
                      <div className="text-sm text-white/80 bg-white/5 rounded-lg p-3 mt-2 space-y-1">
                        <div className="text-white text-sm md:text-md">
                          {t('trending.createToken.note.tradingAvailable')}
                        </div>
                        <div className="opacity-80">
                          {t('trending.createToken.note.deployFromWallet')}
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

            {/* Banner / explainer — rendered second in DOM (below form on mobile/tablet).
                On xl screens xl:order-1 moves it visually to the left column. */}
            <div className="min-w-0 flex-1 md:pt-2 xl:order-1">
              <div className="xl:text-left">
                {/* Desktop-only heading - mobile version is rendered above the flex container */}
                <div className="hidden xl:block mb-6">
                  <div className="text-5xl font-bold leading-tight text-white mb-4">
                    {t('trending.createToken.hero.line1')}
                    <br />
                    {t('trending.createToken.hero.line2')}
                    <br />
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                      {t('trending.createToken.hero.line3')}
                    </span>
                  </div>
                  <p className="text-white/75 text-lg leading-relaxed">
                    {t('trending.createToken.hero.subtitle')}
                  </p>
                </div>

                {/* Explainer Section */}
                <div className="mt-8 md:mt-12 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                    {t('trending.createToken.explainer.title')}
                  </h3>
                  <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.priceDiscoveryTitle')}</h4>
                      <p>
                        {t('trending.createToken.explainer.priceDiscoveryBody')}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.mathTitle')}</h4>
                      <p className="mb-2">
                        {t('trending.createToken.explainer.formulaIntro')}
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">price = k × supply²</code>
                      </p>
                      <p className="mb-2">
                        {t('trending.createToken.explainer.whereLabel')}
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">k</code>
                        {' '}
                        {t('trending.createToken.explainer.constantAnd')}
                        {' '}
                        <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono">supply</code>
                        {' '}
                        {t('trending.createToken.explainer.supplyDescription')}
                      </p>
                      <p>
                        {t('trending.createToken.explainer.thisMeans')}
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>{t('trending.createToken.explainer.bullet1')}</li>
                        <li>{t('trending.createToken.explainer.bullet2')}</li>
                        <li>{t('trending.createToken.explainer.bullet3')}</li>
                        <li>{t('trending.createToken.explainer.bullet4')}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.daoTreasuryTitle')}</h4>
                      <p>
                        {t('trending.createToken.explainer.daoTreasuryBody')}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.feesTitle')}</h4>
                      <p>
                        {t('trending.createToken.explainer.feesBody')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTokenView;
