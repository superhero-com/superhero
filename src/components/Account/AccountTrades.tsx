import { useTranslation } from 'react-i18next';
import { TX_FUNCTIONS } from '@/utils/constants';
import { formatLongDate, formatVolume } from '@/utils/common';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import { useAddressByChainName } from '@/hooks/useChainName';
import { TransactionsService } from '@/api/generated/services/TransactionsService';
import {
  DataTable,
  DataTableResponse,
} from '@/features/shared/components/DataTable/DataTable';
import Spinner from '@/components/Spinner';
import { AddressChip } from '../AddressChip';

interface AccountTradesProps {
  address: string;
  tab: string;
}

const ErrorComponent = () => {
  const { t } = useTranslation('common');
  return (
    <div className="text-center py-12">
      <div className="text-red-400 text-lg mb-2">⚠️</div>
      <div className="text-red-400 text-sm">
        {t('account.failedToLoadTransactions')}
      </div>
    </div>
  );
};

const AccountTrades = ({ address, tab }: AccountTradesProps) => {
  const { t } = useTranslation('common');
  const isChainName = address?.endsWith('.chain');
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? address : undefined,
  );
  const effectiveAddress = isChainName ? (resolvedAddress || '') : (address as string);

  const fetchTransactions = async (params: any) => {
    const response = (await TransactionsService.listTransactions({
      ...params,
    })) as unknown as Promise<{ items: any[]; meta?: any }>;
    return response as unknown as DataTableResponse<any>;
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Table header */}
      <div
        className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_2fr] gap-2 px-4 py-2 border border-white/10 rounded-2xl bg-white/[0.02] text-[10px] font-semibold text-white/60 uppercase tracking-wide"
      >
        <div>{t('account.token')}</div>
        <div>{t('account.type')}</div>
        <div>{t('account.volume')}</div>
        <div>{t('account.price')}</div>
        {/* <div>Total Price</div> */}
        <div>{t('account.date')}</div>
        <div>{t('account.transaction')}</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <DataTable
          queryFn={fetchTransactions}
          renderRow={({ item: transaction }) => {
            const txType = (transaction?.tx_type || '').toLowerCase();
            const color = ((): 'green' | 'red' | 'yellow' | 'primary' => {
              switch (txType) {
                case TX_FUNCTIONS.buy:
                  return 'green';
                case TX_FUNCTIONS.sell:
                  return 'red';
                case TX_FUNCTIONS.create_community:
                  return 'yellow';
                default:
                  return 'primary';
              }
            })();
            const chipStyles = ((): {
              textColor: string;
              chipBg: string;
              borderColor: string;
            } => {
              switch (color) {
                case 'green':
                  return {
                    textColor: 'text-green-400',
                    chipBg: 'bg-green-500/20',
                    borderColor: 'border-green-500/30',
                  };
                case 'red':
                  return {
                    textColor: 'text-red-400',
                    chipBg: 'bg-red-500/20',
                    borderColor: 'border-red-500/30',
                  };
                case 'yellow':
                  return {
                    textColor: 'text-yellow-400',
                    chipBg: 'bg-yellow-500/20',
                    borderColor: 'border-yellow-500/30',
                  };
                default:
                  return {
                    textColor: 'text-white',
                    chipBg: 'bg-white/[0.05]',
                    borderColor: 'border-white/10',
                  };
              }
            })();

            const token = transaction?.token;
            const tokenName = token?.name || transaction?.token_name || t('account.token');
            const tokenHref = token?.name || token?.address
              ? `/trends/tokens/${encodeURIComponent(
                token?.name || token?.address,
              )}`
              : undefined;

            return (
              <div
                key={transaction.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_2fr] gap-2 px-3 py-2 bg-white/[0.01]"
              >
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.tokenLabel')}
                  </div>
                  {tokenHref ? (
                    <a
                      href={tokenHref}
                      className="text-white hover:underline truncate text-sm"
                      title={tokenName}
                    >
                      {tokenName}
                    </a>
                  ) : (
                    <div
                      className="text-white truncate text-sm"
                      title={tokenName}
                    >
                      {tokenName}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.typeLabel')}
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${chipStyles.textColor} ${chipStyles.chipBg} border ${chipStyles.borderColor}`}
                  >
                    {transaction?.tx_type === TX_FUNCTIONS.create_community
                      ? t('account.txTypeCreated')
                      : (transaction?.tx_type
                        ? transaction.tx_type.toString().toUpperCase()
                        : t('account.txTypeTrade'))}
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.volumeLabel')}
                  </div>
                  <div className="text-white font-medium text-xs">
                    {formatVolume(transaction?.volume)}
                  </div>
                </div>

                <div className="flex items-center text-xs">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.unitPriceLabel')}
                  </div>
                  <div className="flex md:flex-col flex-row  ga-4">
                    <PriceDataFormatter
                      watchPrice={false}
                      priceData={transaction?.amount}
                      hideFiatPrice
                    />
                    <div className="flex flex-row items-center ml-4 md:ml-0">
                      <div>@&nbsp;</div>
                      <PriceDataFormatter
                        watchPrice={false}
                        priceData={transaction?.unit_price}
                        hideFiatPrice
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.dateLabel')}
                  </div>
                  <div className="text-white/70 text-xs">
                    {formatLongDate(transaction?.created_at)}
                  </div>
                </div>

                <div className="flex items-center text-xs">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    {t('account.txLabel')}
                  </div>
                  <AddressChip address={transaction?.tx_hash} linkToExplorer />
                </div>
              </div>
            );
          }}
          itemsPerPage={10}
          initialParams={{
            accountAddress: effectiveAddress,
            includes: 'token',
            enabled: !!effectiveAddress && tab === 'transactions',
            staleTime: 30_000,
            refetchInterval: 60_000,
          }}
          emptyMessage={t('account.noTransactionsFound')}
          className="space-y-4 mb-4"
          errorComponent={ErrorComponent}
          loadingComponent={(
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6" />
            </div>
          )}
          fetchingOverlayComponent={(
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
              <Spinner className="w-4 h-4" />
              <span>{t('account.loadingTrades')}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default AccountTrades;
