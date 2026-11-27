import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Check, Clock3, Search, Vote, Users, CircleHelp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGovernance } from '@/hooks';

const GovernancePolls = () => {
  const { t, i18n } = useTranslation('governance');
  const { usePolls } = useGovernance();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'open' | 'closed'>('all');
  const {
    data: allPolls, isPending, error, refetch,
  } = usePolls({ status: 'all', search });
  // Switching status uses the loaded list, without another registry round-trip.
  const data = allPolls?.filter((poll) => status === 'all' || poll.status === status);
  const polls = data ?? [];
  const filters = ['all', 'open', 'closed'] as const;

  const renderPolls = () => {
    if (isPending) {
      return (
        <div className="gov-empty" role="status">
          <Vote aria-hidden="true" />
          <p>{t('polls.loading')}</p>
        </div>
      );
    }
    if (error && !data) {
      return (
        <div className="gov-empty" role="alert">
          <CircleHelp aria-hidden="true" />
          <h3>{t('polls.loadFailed')}</h3>
          <button type="button" className="gov-button ui-secondary" onClick={() => refetch()}>{t('polls.retry')}</button>
        </div>
      );
    }
    if (polls.length === 0) {
      return (
        <div className="gov-empty">
          <div className="gov-empty-icon"><Vote aria-hidden="true" /></div>
          <h3>{t('polls.noPollsFound')}</h3>
          <p>{t('polls.noPollsHint')}</p>
          {(search || status !== 'all') && <button type="button" className="gov-button ui-secondary" onClick={() => { setSearch(''); setStatus('all'); }}>{t('experience.clearFilters')}</button>}
        </div>
      );
    }
    return (
      <ul className="gov-proposals">
        {polls.map((poll) => (
          <li key={poll.poll}>
            <Link to={`/voting/p/${poll.poll}`} className="gov-proposal">
              <div className="gov-proposal-body">
                <div className="gov-proposal-meta">
                  <span className={`gov-status gov-status-${poll.status}`}>
                    {poll.status === 'open' ? <span className="gov-status-dot" /> : <Check size={12} aria-hidden="true" />}
                    {t(`experience.filters.${poll.status}`)}
                  </span>
                  <span>{t('experience.pollNumber', { id: poll.id })}</span>
                </div>
                <h3>{poll.title || t('vote.defaultPollTitle')}</h3>
                <div className="gov-proposal-meta">
                  <span>
                    <Users size={14} aria-hidden="true" />
                    {t('experience.voterCount', { count: poll.voteCount })}
                  </span>
                  <span>
                    <Clock3 size={14} aria-hidden="true" />
                    {poll.endDate ? t(poll.status === 'open' ? 'experience.endsOn' : 'experience.endedOn', { date: poll.endDate.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) }) : t('polls.noEndDate')}
                  </span>
                </div>
              </div>
              <ArrowUpRight className="gov-proposal-arrow" size={19} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="gov-directory">
      <section className="gov-main" aria-labelledby="gov-polls-title">
        <h1 id="gov-polls-title" className="sr-only">{t('experience.pollsTitle')}</h1>
        <div className="gov-toolbar">
          <div className="gov-filter-summary">
            <div className="gov-filters" role="group" aria-label={t('polls.filterByStatus')}>
              {filters.map((filter) => (
                <button type="button" key={filter} aria-pressed={status === filter} onClick={() => setStatus(filter)}>
                  {t(`experience.filters.${filter}`)}
                </button>
              ))}
            </div>
            {data && <span className="gov-count" aria-label={t('experience.resultCount', { count: polls.length })}>{polls.length}</span>}
          </div>
          <label className="gov-search" htmlFor="governance-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">{t('polls.searchLabel')}</span>
            <input id="governance-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('polls.searchPlaceholder')} type="search" />
          </label>
        </div>
        {error && data && (
        <p role="status" className="gov-inline-error">
          {t('experience.refreshError')}
          {' '}
          <button type="button" onClick={() => refetch()}>{t('polls.retry')}</button>
        </p>
        )}
        {renderPolls()}
      </section>

    </div>
  );
};

export default GovernancePolls;
