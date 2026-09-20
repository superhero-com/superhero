import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, Info, Minus,
} from 'lucide-react';
import { SuperheroApi } from '@/api/backend';
import {
  finiteAmount, portfolioChange, portfolioPeriod, portfolioPoints, portfolioValue,
  PORTFOLIO_RANGES, type PortfolioCurrency, type PortfolioRange, type PortfolioSnapshot,
} from './portfolioModel';

interface AccountPortfolioProps {
  address: string;
}

const controlClass = 'rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue';

const AccountPortfolio = ({ address }: AccountPortfolioProps) => {
  const { t, i18n } = useTranslation('common');
  const [range, setRange] = useState<PortfolioRange>('1m');
  const [currency, setCurrency] = useState<PortfolioCurrency>('ae');
  const gradientId = useId().replace(/:/g, '');

  // Summary and history load independently: a slow chart never hides the balance.
  // Explicit timestamp avoids fetching the API's default 90-day series for a summary.
  const summary = useQuery({
    queryKey: ['profile-portfolio-summary', address],
    queryFn: async () => {
      const timestamp = new Date().toISOString();
      const response = await SuperheroApi.getAccountPortfolioHistory(address, {
        startDate: timestamp, endDate: timestamp, include: 'pnl',
      });
      if (!Array.isArray(response)) throw new Error('Invalid portfolio response');
      return (response as PortfolioSnapshot[])[0] ?? null;
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });
  const history = useQuery({
    queryKey: ['profile-portfolio-history', address, range],
    queryFn: async () => {
      const period = portfolioPeriod(range, Date.now());
      const response = await SuperheroApi.getAccountPortfolioHistory(address, period);
      if (!Array.isArray(response)) throw new Error('Invalid portfolio history');
      return response as PortfolioSnapshot[];
    },
    enabled: !!address,
    staleTime: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const snapshot = summary.data;
  const value = portfolioValue(snapshot, currency);
  const points = portfolioPoints(history.data ?? [], snapshot, currency, Date.now());
  const change = portfolioChange(points);
  const pnl = finiteAmount(snapshot?.total_pnl?.gain?.[currency]);
  const aeBalance = finiteAmount(snapshot?.ae_balance);
  const tokensValue = finiteAmount(snapshot?.tokens_value_ae);
  const allocationTotal = aeBalance !== null && tokensValue !== null
    ? aeBalance + tokensValue : null;
  const aeShare = allocationTotal !== null && allocationTotal > 0 && aeBalance !== null
    ? Math.max(0, Math.min(100, (aeBalance / allocationTotal) * 100)) : null;
  let chartColor = 'var(--neon-blue)';
  let changeClass = 'text-white/70 bg-white/5';
  let ChangeIcon = Minus;
  if (change && change.amount < 0) {
    chartColor = 'var(--error-color)';
    changeClass = 'text-error bg-error/10';
    ChangeIcon = ArrowDownRight;
  } else if (change && change.amount > 0) {
    chartColor = 'var(--success-color)';
    changeClass = 'text-success bg-primary-100';
    ChangeIcon = ArrowUpRight;
  }

  const formatAmount = (amount: number | null, unit: PortfolioCurrency = currency) => {
    if (amount === null) return '—';
    const formatted = new Intl.NumberFormat(i18n.language, {
      ...(unit === 'usd' ? { style: 'currency', currency: 'USD' } : {}),
      minimumFractionDigits: 2,
      maximumFractionDigits: unit === 'ae' && amount !== 0 && Math.abs(amount) < 0.01 ? 6 : 2,
    }).format(amount);
    return unit === 'ae' ? `${formatted} AE` : formatted;
  };
  const formatDate = (time: number, includeTime = false) => new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    ...(range === 'all' ? { year: 'numeric' } as const : {}),
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } as const : {}),
  }).format(time);
  const formatChange = () => {
    if (!change) return '—';
    const sign = change.amount > 0 ? '+' : '';
    const percentage = change.percentage === null ? '' : ` (${new Intl.NumberFormat(i18n.language, {
      maximumFractionDigits: 2, signDisplay: 'exceptZero',
    }).format(change.percentage)}%)`;
    return sign + formatAmount(change.amount) + percentage;
  };

  return (
    <section
      aria-label={t('portfolio.overview')}
      data-testid="profile-portfolio"
      className="mb-5 overflow-hidden rounded-2xl border border-solid border-white/10 bg-white/[0.02]"
    >
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-white/70">
            <ChartNoAxesCombined className="h-4 w-4 text-neon-blue" aria-hidden="true" />
            {t('portfolio.portfolioValue')}
          </h2>
          <div role="group" aria-label={t('portfolio.currency')} className="flex rounded-full border border-solid border-white/10 p-0.5">
            {(['ae', 'usd'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={currency === unit}
                onClick={() => setCurrency(unit)}
                className={[controlClass, currency === unit ? '!bg-white/10 text-white' : '!bg-transparent text-white/60 hover:text-white'].join(' ')}
              >
                {unit.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0">
            <div className="min-h-9">
              {summary.isPending ? (
                <div role="status" aria-label={t('portfolio.loadingPortfolio')} className="h-10 w-full max-w-48 rounded-xl bg-white/10 motion-safe:animate-pulse" />
              ) : (
                <p data-testid="portfolio-total" className="break-words text-2xl font-semibold leading-tight tracking-tight text-white tabular-nums md:text-3xl" dir="ltr">
                  {formatAmount(value)}
                </p>
              )}
            </div>
            {summary.isError && (
            <div role="status" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
              {t(snapshot ? 'portfolio.refreshFailed' : 'portfolio.failedToLoad')}
              <button type="button" className={`${controlClass} text-white underline`} onClick={() => summary.refetch()}>{t('buttons.retry')}</button>
            </div>
            )}

            <div className="mt-2">
              <div className="min-w-0">
                <p className="mb-1 text-xs text-white/60">{t('portfolio.valueChange')}</p>
                <div className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${changeClass}`}>
                  <ChangeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span dir="ltr">{formatChange()}</span>
                </div>
              </div>

            </div>

          </div>
          <div className="min-w-0">
            <div className="relative h-20" aria-label={t('portfolio.chart')}>
              {history.isPending && (
              <div role="status" className="flex h-full items-center justify-center rounded-xl bg-white/[0.02] text-xs text-white/60 motion-safe:animate-pulse">
                {t('portfolio.loadingPortfolio')}
              </div>
              )}
              {history.isError && !history.data && (
              <div role="status" className="flex h-full flex-col items-center justify-center gap-3 text-sm text-white/70">
                {t('portfolio.historyFailed')}
                <button type="button" className={`${controlClass} border border-solid border-white/15 text-white`} onClick={() => history.refetch()}>{t('buttons.retry')}</button>
              </div>
              )}
              {!history.isPending && (!history.isError || history.data) && points.length < 2 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-white/60">
                <ChartNoAxesCombined className="h-6 w-6 text-white/40" aria-hidden="true" />
                {t('portfolio.notEnoughHistory')}
              </div>
              )}
              {points.length >= 2 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points}
                  margin={{
                    top: 12, right: 0, left: 0, bottom: 4,
                  }}
                  accessibilityLayer
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--glass-border)" strokeDasharray="3 6" />
                  <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                  <YAxis
                    domain={([min, max]: [number, number]) => {
                      const padding = Math.max((max - min) * 0.12, Math.abs(max) * 0.005, 0.000001);
                      return [Math.max(0, min - padding), max + padding];
                    }}
                    hide
                  />
                  <ReferenceLine y={points[0].value} stroke="var(--light-font-color)" strokeDasharray="3 6" strokeOpacity={0.4} />
                  <Tooltip
                    labelFormatter={(label) => formatDate(Number(label), true)}
                    formatter={(amount) => [formatAmount(Number(amount)), t('portfolio.portfolioValue')]}
                    contentStyle={{
                      background: 'var(--background-color)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 12,
                    }}
                    itemStyle={{ color: 'var(--standard-font-color)' }}
                    labelStyle={{ color: 'var(--light-font-color)', marginBottom: 4 }}
                    cursor={{ stroke: 'var(--light-font-color)', strokeDasharray: '3 3' }}
                  />
                  <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background-color)' }} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="mt-1 flex min-h-4 justify-between text-[10px] tabular-nums text-white/50">
              <span>{points.length > 1 && formatDate(points[0].time, range === '1d')}</span>
              <span>{points.length > 1 && formatDate(points[points.length - 1].time, range === '1d')}</span>
            </div>
          </div>
        </div>
        {history.isError && history.data && <p role="status" className="mt-2 text-xs text-white/60">{t('portfolio.refreshFailed')}</p>}

        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          {aeShare !== null && (
            <div className="flex h-full">
              <div className="h-full bg-neon-blue" style={{ width: `${String(aeShare)}%` }} />
              <div className="h-full flex-1 bg-neon-purple" />
            </div>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3 py-2.5">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-blue" />
              {t('account.aeBalance')}
            </dt>
            <dd className="mt-1.5 break-words text-xs font-semibold tabular-nums md:text-sm text-white" dir="ltr">{formatAmount(aeBalance, 'ae')}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-purple" />
              {t('portfolio.tokenValue')}
            </dt>
            <dd className="mt-1.5 break-words text-xs font-semibold tabular-nums md:text-sm text-white" dir="ltr">{formatAmount(tokensValue, 'ae')}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-white/60">{t('portfolio.tradingPnl')}</dt>
            <dd className={['text-xs font-semibold tabular-nums md:text-sm mt-1.5', pnl !== null && pnl < 0 ? 'text-error' : 'text-white'].join(' ')} dir="ltr">
              {pnl !== null && pnl > 0 ? '+' : ''}
              {formatAmount(pnl)}
            </dd>
            <dd className="text-xs text-white/50 mt-1">{t('portfolio.allTime')}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-solid border-white/10 bg-white/[0.02] px-4 py-1 md:px-5">
        <details className="group min-w-0 flex-1 text-xs text-white/60 open:w-full open:flex-none">
          <summary aria-label={t('portfolio.aboutValues')} className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue [&::-webkit-details-marker]:hidden">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            {t('portfolio.details')}
          </summary>
          <p className="max-w-md pb-2 leading-relaxed">{t('portfolio.valuesExplanation')}</p>
        </details>
        <div role="group" aria-label={t('portfolio.timeRange')} className="flex gap-0.5 rounded-full bg-white/[0.04] p-1">
          {(Object.keys(PORTFOLIO_RANGES) as PortfolioRange[]).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className={[controlClass, range === option ? '!bg-white/10 text-white' : '!bg-transparent text-white/60 hover:text-white'].join(' ')}
            >
              {option === 'all' ? t('portfolio.allTimeShort') : option.toUpperCase()}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
};

export default AccountPortfolio;
