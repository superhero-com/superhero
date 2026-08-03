/* eslint-disable no-console */
import LivePriceFormatter from '@/features/shared/components/LivePriceFormatter';
import { Decimal } from '@/libs/decimal';
import { calculateBuyPriceWithAffiliationFee, calculateTokensFromAE, toDecimals } from '@/utils/bondingCurve';
import { collectionLabel } from '@/utils/collection';
import { detectMatchingCollections, preferredCollection } from '@/utils/collectionNameChars';
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
import {
  TrendingUp, Sigma, Landmark, Coins,
} from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { createCommunity } from '../libs/createCommunity';
import Spinner from '../../../components/Spinner';
import VerifiedIcon from '../../../svg/verifiedUrl.svg?react';
import NotVerifiedIcon from '../../../svg/notVerifiedUrl.svg?react';
import RocketIcon from '../../../svg/iconRocket.svg?react';
import SparkleIcon from '../../../svg/iconSparkle.svg?react';
import PageSpaceHero from '../../../components/hero-banner/PageSpaceHero';
import { SuperheroApi } from '../../../api/backend';
import AeButton from '../../../components/AeButton';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import { Input } from '../../../components/ui/input';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useCommunityFactory } from '../../../hooks/useCommunityFactory';
import type {
  CollectionId,
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
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const {
    activeFactorySchema,
    activeFactoryCollections,
    loadFactorySchema,
    getFactory,
  } = useCommunityFactory();

  // Parse URL query params
  const searchParams = new URLSearchParams(location.search);
  const initialTokenName = String(searchParams.get('tokenName') || '').toUpperCase().replace(/ /g, '-');

  // Form state
  const [tokenName, setTokenName] = useState(initialTokenName);
  const [initialBuyVolume, setInitialBuyVolume] = useState<string>('');
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
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [price, setPrice] = useState(Decimal.ZERO);
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'unsupported'>('idle');
  const [foundToken, setFoundToken] = useState<{
    address: string;
    sale_address?: string;
    name: string;
    price?: number;
    holders?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  const initialBuyVolumeDebounced = useDebouncedValue(initialBuyVolume, 300);
  const aeAmountDebounced = useDebouncedValue(aeAmount, 300);
  const tokenNameDebounced = useDebouncedValue(tokenName, 400);

  // Computed values
  const activeFactoryCollectionsArr = useMemo(
    () => activeFactoryCollections,
    [activeFactoryCollections],
  );

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = languageDropdownRef.current;
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Which collections accept what the user has typed so far. Derived rather than
  // stored so the chip never lags a keystroke behind the input.
  const detectedCollections = useMemo(
    () => detectMatchingCollections(tokenName.trim(), activeFactoryCollectionsArr),
    [tokenName, activeFactoryCollectionsArr],
  );

  // The availability check below runs against the debounced name, so it has to
  // judge "unsupported" against that same value — detecting on the live input
  // would label the previous name with the current input's verdict.
  const detectedForDebounced = useMemo(
    () => detectMatchingCollections(
      (tokenNameDebounced || '').trim(),
      activeFactoryCollectionsArr,
    ),
    [tokenNameDebounced, activeFactoryCollectionsArr],
  );

  // The collection a deploy will actually use. Derived from the typed name in
  // the same pass that detects it, so submitting can never race a state update
  // and send a name to a collection whose rules reject it. `collectionModel`
  // holds only what the user picked by hand, honoured while it still accepts
  // the name — every collection allows "-", so "A-B" can match several.
  const selectedCollection = useMemo((): ICollectionData | undefined => {
    if (!detectedCollections.length) {
      // Nothing matches, or the field is empty: fall back to the default so the
      // character hint still has a collection to describe.
      return preferredCollection(activeFactoryCollectionsArr);
    }
    return detectedCollections.find((c) => c.id === collectionModel)
      ?? preferredCollection(detectedCollections);
  }, [detectedCollections, activeFactoryCollectionsArr, collectionModel]);

  // Price calculation effects
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

  // Collections carry their own casing rules (WORDS is A–Z, RUSSIAN is А–Я), so
  // uppercasing is what makes a typed name detectable at all.
  const normalizeTokenName = useCallback(
    (value: string): string => value.toUpperCase().replace(/ /g, '-'),
    [],
  );

  // While an IME composition is active (e.g. typing Chinese via pinyin) the input
  // holds intermediate Latin text that belongs to no collection. Normalizing it
  // would abort the composition, and reporting on it would flash "unsupported"
  // for the whole time the user is typing — so both are suspended until commit.
  // Tracked twice on purpose: the ref is read inside the change handler before a
  // re-render can land, the state drives what the chip renders.
  const isComposingNameRef = useRef(false);
  const [isComposingName, setIsComposingName] = useState(false);

  const onNameUpdate = (value: string) => {
    if (isComposingNameRef.current) {
      setTokenName(value);
      return;
    }
    setTokenName(normalizeTokenName(value));
  };

  const onNameCompositionStart = () => {
    isComposingNameRef.current = true;
    setIsComposingName(true);
  };

  const onNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingNameRef.current = false;
    setIsComposingName(false);
    setTokenName(normalizeTokenName(e.currentTarget.value));
  };

  // Name availability check
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

      // No collection accepts these characters, so there is nothing to look up.
      // Mid-composition text is intermediate and not worth reporting on.
      if (!detectedForDebounced.length) {
        setNameStatus(isComposingName ? 'idle' : 'unsupported');
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
        setNameStatus('idle');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tokenNameDebounced, detectedForDebounced, isComposingName]);

  // Keep focus when taken
  useEffect(() => {
    if (nameStatus === 'taken' && nameInputRef.current) {
      const input = nameInputRef.current;
      input.focus();
      const len = input.value.length;
      try {
        input.setSelectionRange(len, len);
      } catch {
        // Ignore
      }
    }
  }, [nameStatus]);

  // Formatting helpers
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

  // Focus on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, []);

  // Only offer the picker when the name genuinely fits more than one collection.
  const hasCollectionChoice = detectedCollections.length > 1;
  const showUnsupportedBadge = Boolean(tokenName)
    && !isComposingName
    && detectedCollections.length === 0;

  // A name no collection accepts would only fail on chain, so gate on detection
  // as well as on the availability lookup.
  const canSubmitName = Boolean(tokenName)
    && detectedCollections.length > 0
    && nameStatus !== 'checking'
    && nameStatus !== 'taken'
    && nameStatus !== 'unsupported';

  // Token creation
  const deploy = async () => {
    // The submit button is disabled in these cases, but a form can still be
    // submitted around it, and a rejected deploy costs the user a signature.
    if (!canSubmitName) return;

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
          // ignore
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
      <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white">
        <div className="p-6">
          <div className="stagger-children">
            <div className="h-8 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-1/3 mb-4 animate-shimmer" />
            <div className="h-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-2/3 mb-8 animate-shimmer" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                {['row-1', 'row-2', 'row-3', 'row-4', 'row-5'].map((rowKey, idx) => (
                  <div
                    key={rowKey}
                    className="h-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded animate-shimmer"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  />
                ))}
              </div>
              <div className="h-96 bg-gradient-to-r from-gray-700 to-gray-600 rounded animate-shimmer" />
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
        disabled={isCreating || !canSubmitName}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 md:h-14 py-3 relative overflow-hidden group hover-lift"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {!isCreating && <RocketIcon className="w-5 h-5 group-hover:animate-bounce" />}
          {t('trending.createToken.submit.createToken')}
          {!isCreating && <SparkleIcon className="w-4 h-4 animate-sparkle" />}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </AeButton>
    );
  };

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen text-white px-2 md:px-4">
      <div className="rounded-[24px] mt-2 mb-6 mx-0 md:mx-4">
        <div className="max-w-[1400px] mx-auto p-0 md:px-6 md:pb-6 md:pt-3">
          <PageSpaceHero
            className="mb-6 px-6 py-10 md:px-10 md:py-14 text-center xl:text-left"
            supernovaColor="rgba(255,94,188,.5)"
          >
            <h3 className="text-3xl md:text-5xl font-bold leading-tight text-white mb-3 animate-slideDown">
              {t('trending.createToken.hero.line1')}
              <br />
              {t('trending.createToken.hero.line2')}
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradientShift inline-block">
                {t('trending.createToken.hero.line3')}
              </span>
            </h3>
            <p className="text-white/75 text-base md:text-lg leading-relaxed animate-slideUp animate-delay-200 max-w-2xl mx-auto xl:mx-0">
              {t('trending.createToken.hero.subtitle')}
            </p>
          </PageSpaceHero>

          <div className="flex flex-col xl:flex-row gap-6 xl:items-start xl:justify-between">
            <div className="w-full xl:w-[620px] xl:flex-shrink-0 xl:order-2 animate-scaleIn animate-delay-200">
              <div className="bg-[#0d1117]/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl relative transition-all duration-300 p-5 md:p-8 shadow-2xl hover-lift">
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
                    {!alreadyRegisteredAs && errorMessage && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                        <h3 className="font-semibold mb-2">{t('trending.createToken.oops')}</h3>
                        <p>{errorMessage}</p>
                      </div>
                    )}

                    {/* Token Name Input with Inline Language Selector */}
                    <div>
                      <label
                        htmlFor="trend-token-name"
                        className="block text-sm font-medium text-white/80 mb-2"
                      >
                        {t('trending.createToken.trendTokenName')}
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/30 relative">
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

                        {/* Right side indicators */}
                        <div className="flex items-center gap-2 shrink-0">
                          {nameStatus === 'checking' && <Spinner />}
                          {nameStatus === 'available' && <VerifiedIcon className="w-5 h-5 text-emerald-400" />}
                          {nameStatus === 'taken' && <NotVerifiedIcon className="w-5 h-5 text-red-400" />}

                          {/* Language chip with dropdown */}
                          {tokenName && detectedCollections.length > 0 && (
                            <div className="relative" ref={languageDropdownRef}>
                              <button
                                type="button"
                                onClick={() => hasCollectionChoice
                                  && setShowLanguageDropdown(!showLanguageDropdown)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                  hasCollectionChoice
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30 hover:bg-purple-500/30 cursor-pointer'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 cursor-default'
                                }`}
                                disabled={!hasCollectionChoice}
                                aria-haspopup={hasCollectionChoice ? 'listbox' : undefined}
                                aria-expanded={hasCollectionChoice
                                  ? showLanguageDropdown
                                  : undefined}
                              >
                                {selectedCollection && collectionLabel(selectedCollection.name)}
                                {hasCollectionChoice && (
                                  <svg
                                    className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>

                              {showLanguageDropdown && hasCollectionChoice && (
                                <div className="absolute right-0 top-full mt-1 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                                  {detectedCollections.map((collection) => (
                                    <button
                                      key={collection.id}
                                      type="button"
                                      onClick={() => {
                                        setCollectionModel(collection.id);
                                        setShowLanguageDropdown(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                        collection.id === selectedCollection?.id
                                          ? 'bg-purple-500/20 text-white font-medium'
                                          : 'text-white/80 hover:bg-white/5'
                                      }`}
                                    >
                                      {collectionLabel(collection.name)}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Unsupported indicator */}
                          {showUnsupportedBadge && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-400/30">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              {t('trending.createToken.unsupportedBadge')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-white/60 mt-1 flex items-center justify-between min-h-[20px]" aria-live="polite">
                        <span>
                          {t('trending.createToken.charactersCount', { count: tokenName.length, max: 20 })}
                        </span>
                        <span className="opacity-80" dir="auto">
                          {nameStatus === 'unsupported'
                            ? t('trending.createToken.unsupportedCharacters')
                            : selectedCollection?.description
                              || t('trending.createToken.allowedCharsHint')}
                        </span>
                      </div>
                    </div>

                    {/* Trading live box when taken */}
                    {nameStatus === 'taken' && (foundToken || alreadyRegisteredAs) && (
                      <div className="mt-20 text-xs bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
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
                        </div>
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

                    {/* Initial Buy Amount */}
                    <div className={nameStatus === 'taken' ? 'opacity-40 pointer-events-none select-none' : ''} aria-disabled={nameStatus === 'taken'}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="block text-sm font-medium text-white/80">
                            {inputMode === 'AE' ? t('trending.createToken.amountToSpend') : t('trending.createToken.tokensToBuy')}
                          </div>
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
                              className="flex-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg focus:border-[#4ecdc4] focus:outline-none shadow-none"
                            />
                            <div className="text-white font-extrabold text-2xl leading-none">AE</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {['1', '10', '100', '500', '100000'].map((val, idx) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  setAeAmount(val);
                                  setAeAmountDisplay(idx === 4 ? '100,000' : val);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
                              >
                                {idx === 4 ? '100K AE' : `${val} AE`}
                              </button>
                            ))}
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
                            {['500000', '1000000', '5000000', '10000000', '100000000'].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setInitialBuyVolume(val)}
                                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-white/90 text-xs hover:bg-white/[0.1] transition-colors"
                              >
                                {Number(val) >= 1000000 ? `${Number(val) / 1000000}M` : `${Number(val) / 1000}K`}
                              </button>
                            ))}
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
                      <div className="text-sm text-white/80 bg-white/5 rounded-lg p-3 mt-2 space-y-1">
                        <div className="text-white text-sm md:text-md">
                          {t('trending.createToken.note.tradingAvailable')}
                        </div>
                        <div className="opacity-80">
                          {t('trending.createToken.note.deployFromWallet')}
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className={`md:pt-4 ${nameStatus === 'taken' ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={nameStatus === 'taken'}>
                      {renderSubmitContent()}
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Explainer */}
            <div className="min-w-0 flex-1 xl:order-1">
              <div className="xl:text-left">
                <div className="mt-8 md:mt-12 xl:mt-0 bg-[#0d1117]/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 hover-lift animate-scaleIn animate-delay-300">
                  <h3 className="text-xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent animate-gradientShift">
                    {t('trending.createToken.explainer.title')}
                  </h3>
                  <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.priceDiscoveryTitle')}</h4>
                      <p>{t('trending.createToken.explainer.priceDiscoveryBody')}</p>
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
                      <p>{t('trending.createToken.explainer.thisMeans')}</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>{t('trending.createToken.explainer.bullet1')}</li>
                        <li>{t('trending.createToken.explainer.bullet2')}</li>
                        <li>{t('trending.createToken.explainer.bullet3')}</li>
                        <li>{t('trending.createToken.explainer.bullet4')}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.daoTreasuryTitle')}</h4>
                      <p>{t('trending.createToken.explainer.daoTreasuryBody')}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">{t('trending.createToken.explainer.feesTitle')}</h4>
                      <p>{t('trending.createToken.explainer.feesBody')}</p>
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
