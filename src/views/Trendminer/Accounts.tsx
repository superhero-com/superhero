/* eslint-disable
  react/function-component-definition,
  max-len,
  react-hooks/exhaustive-deps,
  react/button-has-type
*/
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { SuperheroApi } from '../../api/backend';

export default function Accounts() {
  const { t } = useTranslation('explore');
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [orderBy, setOrderBy] = useState<'total_volume'|'total_tx_count'|'total_buy_tx_count'|'total_sell_tx_count'|'total_created_tokens'|'total_invitation_count'|'total_revoked_invitation_count'|'created_at'>('total_volume');
  const [orderDirection, setOrderDirection] = useState<'ASC'|'DESC'>('DESC');

  useEffect(() => {
    let cancel = false;
    async function load(reset = false) {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await SuperheroApi.listAccounts({
          orderBy, orderDirection, limit: 20, page: reset ? 1 : page,
        });
        const items = resp?.items ?? resp ?? [];
        if (!cancel) {
          setRows((prev) => (reset ? items : [...prev, ...items]));
          const currentPage = resp?.meta?.currentPage ?? (reset ? 1 : page);
          const totalPages = resp?.meta?.totalPages ?? (items.length === 20 ? currentPage + 1 : currentPage);
          setHasMore(currentPage < totalPages);
          setPage(currentPage + 1);
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || t('failedToLoadAccounts'));
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    setPage(1);
    load(true);
    return () => { cancel = true; };
  }, [orderBy, orderDirection]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-3xl font-bold text-white mb-4">{t('topAccounts')}</h2>
      <div className="flex gap-2 items-center my-2">
        <AppSelect
          value={orderBy as string}
          onValueChange={(v) => setOrderBy(v as any)}
          triggerClassName="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none"
          contentClassName="bg-black border-white/20"
        >
          <AppSelectItem value="total_volume">{t('totalVolume')}</AppSelectItem>
          <AppSelectItem value="total_tx_count">{t('totalTx')}</AppSelectItem>
          <AppSelectItem value="total_buy_tx_count">{t('buyTx')}</AppSelectItem>
          <AppSelectItem value="total_sell_tx_count">{t('sellTx')}</AppSelectItem>
          <AppSelectItem value="total_created_tokens">{t('createdTokens')}</AppSelectItem>
          <AppSelectItem value="total_invitation_count">{t('invitations')}</AppSelectItem>
          <AppSelectItem value="total_revoked_invitation_count">{t('revokedInvites')}</AppSelectItem>
          <AppSelectItem value="created_at">{t('newest')}</AppSelectItem>
        </AppSelect>
        <AppSelect
          value={orderDirection as string}
          onValueChange={(v) => setOrderDirection(v as any)}
          triggerClassName="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white focus:outline-none"
          contentClassName="bg-black border-white/20"
        >
          <AppSelectItem value="DESC">Desc</AppSelectItem>
          <AppSelectItem value="ASC">Asc</AppSelectItem>
        </AppSelect>
      </div>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.address} className="flex justify-between p-3 border border-white/10 rounded-lg bg-black/20 backdrop-blur-lg">
            <div className="max-w-72 overflow-hidden text-ellipsis text-white font-mono text-sm">
              {r.address}
            </div>
            <div className="flex gap-4 opacity-85 text-sm text-white/85">
              <div>
                Vol:
                {Number(r.total_volume || 0).toLocaleString()}
                {' '}
                AE
              </div>
              <div>
                Tx:
                {r.total_tx_count || 0}
              </div>
              <div>
                Tokens:
                {r.total_created_tokens || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-3">
          <button
            onClick={() => setPage((p) => p)}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
