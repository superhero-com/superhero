/* eslint-disable
  @typescript-eslint/no-unused-vars,
  react/function-component-definition,
  no-use-before-define
*/
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { SuperheroApi } from '../../api/backend';
import AeButton from '../../components/AeButton';

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price?: number;
  market_cap?: number;
  holders_count?: number;
  sale_address?: string;
  created_at?: string;
};

export default function AccountDetails() {
  const { t } = useTranslation('explore');
  const { address } = useParams();
  const [tab, setTab] = useState<'owned'|'created'|'transactions'>('owned');
  const [owned, setOwned] = useState<TokenItem[]>([]);
  const [created, setCreated] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!address) return;
      setLoading(true);
      setError(null);
      try {
        const [ownedResp, createdResp] = await Promise.all([
          SuperheroApi.listTokens({
            ownerAddress: address, limit: 50, orderBy: 'market_cap', orderDirection: 'DESC',
          }),
          SuperheroApi.listTokens({
            creatorAddress: address, limit: 50, orderBy: 'created_at', orderDirection: 'DESC',
          }),
        ]);
        if (!cancel) {
          setOwned(ownedResp?.items ?? ownedResp ?? []);
          setCreated(createdResp?.items ?? createdResp ?? []);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || t('failedToLoadAccount'));
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [address, t]);

  return (
    <div className="ui-page account-details-page max-w-5xl mx-auto p-4">
      <div className="ui-panel account-details-identity flex flex-wrap items-center gap-3 mb-4 p-4">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-500/10 border border-white/10" />
        <div>
          <div className="break-all text-base sm:text-lg font-semibold text-white">{address}</div>
          <div className="text-xs opacity-70 text-white/70">{t('accountDetails')}</div>
        </div>
        <div className="w-full min-w-0">
          <AeButton
            onClick={() => { navigator.clipboard.writeText(address || ''); }}
            variant="utility"
            className="ui-secondary ui-wrap-action max-w-full flex-wrap gap-x-2 text-left text-xs"
          >
            {t('copyAddress')}
            <span className="min-w-0 break-all font-mono text-[11px] font-normal">{address}</span>
          </AeButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-4 pb-2">
        <AeButton
          onClick={() => setTab('owned')}
          variant="tab"
          active={tab === 'owned'}
          className={tab === 'owned' ? 'ui-tab-selected' : 'ui-secondary'}
        >
          {t('tokensOwned')}
        </AeButton>
        <AeButton
          onClick={() => setTab('created')}
          variant="tab"
          active={tab === 'created'}
          className={tab === 'created' ? 'ui-tab-selected' : 'ui-secondary'}
        >
          {t('tokensCreated')}
        </AeButton>
        <AeButton
          onClick={() => setTab('transactions')}
          variant="tab"
          active={tab === 'transactions'}
          className={tab === 'transactions' ? 'ui-tab-selected' : 'ui-secondary'}
        >
          {t('transactions')}
        </AeButton>
      </div>

      {loading && <div className="text-white/80">{t('loading')}</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && tab === 'owned' && (
        <TokenGrid items={owned} emptyMessage={t('noTokens')} />
      )}
      {!loading && !error && tab === 'created' && (
        <TokenGrid items={created} emptyMessage={t('noTokens')} />
      )}
      {!loading && !error && tab === 'transactions' && (
        <div className="text-white/60">
          {t('transactionsViewComingSoon')}
        </div>
      )}
    </div>
  );
}

const TokenGrid = ({ items, emptyMessage }: { items: TokenItem[]; emptyMessage: string }) => {
  const { t } = useTranslation('explore');
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((it) => (
        <Link
          key={it.address}
          to={`/trending/tokens/${encodeURIComponent(it.name || it.address)}`}
          className="no-underline text-inherit"
        >
          <div className="ui-panel p-4 transition-colors duration-200">
            <div className="font-bold text-white">
              {it.name}
              {' '}
              <span className="opacity-70 text-white/70">
                (
                {it.symbol}
                )
              </span>
            </div>
            <div className="grid gap-2 mt-3 text-xs text-white/70 [overflow-wrap:anywhere]">
              <div>
                {t('mcLabel')}
                {Number(it.market_cap ?? 0).toLocaleString()}
              </div>
              <div>
                {t('holdersLabel')}
                {it.holders_count ?? 0}
              </div>
            </div>
          </div>
        </Link>
      ))}
      {!items.length && <div className="opacity-70 text-white/70 text-center py-8">{emptyMessage}</div>}
    </div>
  );
};
