import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight, ChevronDown, Hash, Info, Trophy,
} from 'lucide-react';
import { SuperheroApi } from '@/api/backend';
import {
  formatAmount, holderCount, marketCap, rankingContext, tokenPrice, totalSupply,
  type RankingToken,
} from './ranking';
import './TokenRanking.css';

interface TokenRankingProps {
  token: RankingToken;
}
interface RankingData {
  items: RankingToken[];
}
const LIST_SIZE = 5;

const RankingRow = ({ token, current }: { token: RankingToken; current: boolean }) => {
  const { t } = useTranslation('trending');
  const cap = marketCap(token);
  const supply = totalSupply(token);
  return (
    <li>
      <Link
        className={`token-ranking-row${current ? ' is-current' : ''}`}
        to={`/trends/tokens/${encodeURIComponent(token.name!)}`}
        aria-current={current ? 'page' : undefined}
      >
        <div className="token-ranking-row-heading">
          <bdi className="token-ranking-position">
            #
            {token.rank}
          </bdi>
          <span className="token-ranking-token-mark"><Hash aria-hidden="true" /></span>
          <span className="token-ranking-identity"><strong dir="auto">{token.symbol || token.name}</strong></span>
          {current ? <span className="token-ranking-current">{t('ranking.current')}</span>
            : <ArrowUpRight className="token-ranking-row-arrow" aria-hidden="true" />}
        </div>
        <dl className="token-ranking-metrics">
          <div className="token-ranking-metric">
            <dt>
              {t('ranking.price')}
              {' '}
              <span>· AE</span>
            </dt>
            <dd dir="ltr">{formatAmount(tokenPrice(token))}</dd>
          </div>
          <div className="token-ranking-metric token-ranking-market">
            <dt>
              {t('ranking.marketCap')}
              {' '}
              <span>· AE</span>
            </dt>
            <dd dir="ltr" title={cap == null ? undefined : `${cap.toFormat()} AE`}>{formatAmount(cap, true)}</dd>
          </div>
          <div className="token-ranking-metric token-ranking-secondary">
            <dt>{t('ranking.holders')}</dt>
            <dd dir="ltr">{formatAmount(holderCount(token))}</dd>
          </div>
          <div className="token-ranking-metric token-ranking-secondary">
            <dt>{t('ranking.totalSupply')}</dt>
            <dd dir="ltr" title={supply?.toFormat()}>{formatAmount(supply, true)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
};

const TokenRanking = ({ token }: TokenRankingProps) => {
  const { t, i18n } = useTranslation('trending');
  const [help, setHelp] = useState(false);
  const explanationId = useId();
  // Keep the shared query prefix used by useLiveTokenData to refresh these metrics.
  const {
    data, isLoading, isError, isFetching, refetch,
  } = useQuery<RankingData>({
    queryKey: ['TokensService.listTokenRankings', token.sale_address, LIST_SIZE],
    queryFn: () => SuperheroApi.listTokenRankings(token.sale_address!, {
      limit: LIST_SIZE, page: 1,
    }) as Promise<RankingData>,
    enabled: !!token.sale_address,
  });
  const {
    rows, current, neighbor, leading, gap,
  } = rankingContext(data?.items ?? [], token.sale_address);
  const failed = isError && !current;

  return (
    <div className="token-ranking" dir={i18n.dir()}>
      <section className="token-ranking-card" aria-label={t('ranking.title')} aria-busy={isLoading}>
        <header className="token-ranking-heading">
          <span className="token-ranking-icon"><Trophy aria-hidden="true" /></span>
          <div>
            <h2>{t('ranking.title')}</h2>
            <p>{t('ranking.subtitle')}</p>
          </div>
        </header>
        {isLoading ? (
          <div className="token-ranking-loading" role="status" aria-label={t('ranking.loading')}>
            <span aria-hidden="true" />
            {[0, 1, 2, 3, 4].map((index) => <div key={index} aria-hidden="true" />)}
          </div>
        ) : null}
        {!isLoading && !current && (
          <div className="token-ranking-state" role="status">
            <Hash aria-hidden="true" />
            <h3>{t(failed ? 'ranking.error' : 'ranking.empty')}</h3>
            <p>{t(failed ? 'ranking.errorCopy' : 'ranking.emptyCopy')}</p>
            {failed && (
              <button type="button" disabled={isFetching} onClick={() => { refetch(); }}>{t('ranking.retry')}</button>
            )}
          </div>
        )}
        {!isLoading && current && (
          <>
            <div className="token-ranking-summary">
              <div>
                <span>{t('ranking.currentRank')}</span>
                <strong>
                  <small>#</small>
                  {current.rank}
                </strong>
              </div>
              <div className="token-ranking-target">
                <span>{gap == null ? t('ranking.unavailable') : t(leading ? 'ranking.lead' : 'ranking.gap', { rank: neighbor?.rank })}</span>
                <strong dir="ltr">
                  {formatAmount(gap)}
                  {gap != null && <small> AE</small>}
                </strong>
              </div>
            </div>
            <ol className="token-ranking-list">
              {rows.map((item) => (
                <RankingRow
                  key={item.sale_address}
                  token={item}
                  current={item.sale_address === token.sale_address}
                />
              ))}
            </ol>
            {isError && (
              <p className="token-ranking-refresh" role="status">
                {t('ranking.refreshError')}
                <button type="button" disabled={isFetching} onClick={() => { refetch(); }}>{t('ranking.retry')}</button>
              </p>
            )}
          </>
        )}
        <button type="button" className="token-ranking-help" aria-expanded={help} aria-controls={explanationId} onClick={() => setHelp(!help)}>
          <span>
            <Info aria-hidden="true" />
            {t('ranking.how')}
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
        {help && <p id={explanationId} className="token-ranking-explanation">{t('ranking.explanation')}</p>}
      </section>
    </div>
  );
};

export default TokenRanking;
