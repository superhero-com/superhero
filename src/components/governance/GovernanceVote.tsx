import { useState } from 'react';
import { Encoding, isAddressValid } from '@aeternity/aepp-sdk';
import {
  ArrowLeft, ArrowUpRight, Check, Clock3, Vote,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAeSdk, useGovernance } from '@/hooks';
import { safeHref } from '@/utils/safeHref';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { formatUnits } from '@/features/dao/utils/voteRules';
import { AddressChip } from '../AddressChip';

interface GovernanceVoteProps {
  pollId: string;
  setActiveTab: (tab: string) => void;
}

const GovernanceVote = ({ pollId, setActiveTab }: GovernanceVoteProps) => {
  const { t, i18n } = useTranslation('governance');
  const { activeAccount, currentBlockHeight } = useAeSdk();
  const {
    usePoll, usePollResults, useRevokeVote, useSubmitVote,
  } = useGovernance();
  const pollAddress = isAddressValid(pollId, Encoding.ContractAddress) ? pollId : undefined;
  const { data: poll, error: pollError, refetch } = usePoll(pollAddress);
  const { data: results, error: resultsError } = usePollResults(pollAddress);
  const submit = useSubmitVote();
  const revoke = useRevokeVote();
  const [choice, setChoice] = useState<number | null>(null);
  const [actionError, setActionError] = useState(false);
  const [working, setWorking] = useState(false);
  const [completedAction, setCompletedAction] = useState<{ kind: 'vote' | 'revoke'; account: string } | null>(null);
  const closeHeight = poll?.pollState.close_height;
  const heightKnown = currentBlockHeight != null;
  const closed = closeHeight != null && heightKnown && currentBlockHeight >= closeHeight;
  const canVote = !!poll && (closeHeight == null || (heightKnown && !closed));
  const proposalLink = safeHref(poll?.pollState.metadata.link);

  const castVote = async () => {
    if (choice == null || !pollAddress || !activeAccount || !canVote || working) return;
    setWorking(true);
    setActionError(false);
    setCompletedAction(null);
    const account = activeAccount;
    try {
      await submit.mutateAsync({ pollAddress, option: choice });
      setChoice(null);
      setCompletedAction({ kind: 'vote', account });
    } catch {
      setActionError(true);
    } finally {
      setWorking(false);
    }
  };
  const revokeVote = async () => {
    if (!pollAddress || !activeAccount || !canVote || working) return;
    setWorking(true);
    setActionError(false);
    setCompletedAction(null);
    const account = activeAccount;
    try {
      await revoke.mutateAsync(pollAddress);
      setCompletedAction({ kind: 'revoke', account });
    } catch {
      setActionError(true);
    } finally {
      setWorking(false);
    }
  };

  if (!pollAddress || pollError) {
    return (
      <div className="gov-empty" role="alert">
        <h2>{t('experience.pollLoadError')}</h2>
        <button type="button" className="gov-button ui-secondary" onClick={() => refetch()}>{t('experience.retry')}</button>
      </div>
    );
  }
  if (!poll) {
    return (
      <div className="gov-empty" role="status">
        <Vote aria-hidden="true" />
        <p>{t('polls.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="gov-back" onClick={() => setActiveTab('polls')}>
        <ArrowLeft size={16} aria-hidden="true" />
        {t('experience.backToPolls')}
      </button>
      <div className="gov-layout">
        <div className="gov-detail-stack">
          <header>
            <div className="gov-proposal-meta">
              <span className={`gov-status gov-status-${closed ? 'closed' : 'open'}`}>
                {closed ? <Check size={12} aria-hidden="true" /> : <span className="gov-status-dot" />}
                {t(closed ? 'experience.filters.closed' : 'experience.filters.open')}
              </span>
            </div>
            <h1 className="gov-detail-title">{poll.pollState.metadata.title || t('vote.defaultPollTitle')}</h1>
            {poll.pollState.author && (
            <div className="gov-proposal-meta">
              <span>{t('vote.byLabel')}</span>
              <AddressChip address={poll.pollState.author} linkToProfile />
            </div>
            )}
          </header>
          <section className="gov-panel">
            <h2>{t('experience.aboutPoll')}</h2>
            <div className="gov-description" dir="auto">{poll.pollState.metadata.description}</div>
            {proposalLink && (
            <a href={proposalLink} target="_blank" rel="noopener noreferrer" className="gov-detail-link">
              <span className="break-all">{proposalLink}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            )}
          </section>
          <section className="gov-panel" aria-labelledby="gov-results-title">
            <div className="gov-section-heading">
              <h2 id="gov-results-title">{t('experience.resultsTitle')}</h2>
              {results && <span className="gov-status">{t('experience.voterCount', { count: results.totalVotes })}</span>}
            </div>
            <p>{t('experience.weightedResults')}</p>
            {resultsError && <p role="alert" className="gov-inline-error">{t('experience.refreshError')}</p>}
            {!results && !resultsError && <p role="status">{t('polls.loading')}</p>}
            {results && (
              <div className="gov-results">
                {Object.entries(poll.pollState.vote_options).map(([key, label]) => {
                  const option = results.options.find((item) => item.value === Number(key));
                  // Governance is AE-weighted. Voter headcount is participation, not the result.
                  const percentage = Number.isFinite(option?.percentageOfTotal) ? Math.max(0, Math.min(100, option!.percentageOfTotal)) : 0;
                  return (
                    <div key={key}>
                      <div className="gov-result-label">
                        <span>{label}</span>
                        <strong>
                          {percentage.toLocaleString(i18n.language, { maximumFractionDigits: 2 })}
                          %
                        </strong>
                      </div>
                      <div className="gov-result-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>
                      <div className="gov-result-meta">
                        <span>
                          {formatUnits(option?.optionStake ?? '0', 18, i18n.language)}
                          {' '}
                          AE
                        </span>
                        <span>{t('experience.voterCount', { count: option?.votes ?? 0 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
        <aside className="gov-panel gov-ballot" aria-busy={working}>
          <h2>{t(closed ? 'experience.voteClosed' : 'vote.castYourVote')}</h2>
          {closed ? <p>{t('experience.voteClosedText')}</p> : (
            <>
              <fieldset className="gov-ballot-options" disabled={working || !canVote}>
                <legend>{t('experience.chooseOption')}</legend>
                {Object.entries(poll.pollState.vote_options).map(([value, label]) => (
                  <label key={value} htmlFor={`governance-choice-${value}`} className="gov-ballot-choice">
                    <input id={`governance-choice-${value}`} type="radio" name="governance-choice" checked={choice === Number(value)} onChange={() => setChoice(Number(value))} />
                    <span>{label}</span>
                    {results?.myVote === Number(value) && <Check size={16} aria-label={t('experience.voteRecorded')} />}
                  </label>
                ))}
              </fieldset>
              {activeAccount ? <button type="button" className="gov-button ui-primary" disabled={working || choice == null || !canVote} onClick={castVote}>{t(working ? 'experience.sendingVote' : 'experience.submitVote')}</button> : <ConnectWalletButton className="gov-button ui-primary" label={t('experience.connectToVote')} />}
              {results?.myVote != null && activeAccount && <button type="button" className="gov-button ui-secondary mt-3" disabled={working || !canVote} onClick={revokeVote}>{t('vote.revokeVote')}</button>}
            </>
          )}
          {working && <p role="status" className="gov-ballot-note">{t('experience.sendingVote')}</p>}
          {completedAction?.account === activeAccount && completedAction && <p role="status" className="gov-ballot-note">{t(completedAction.kind === 'vote' ? 'experience.voteRecorded' : 'experience.voteRevoked')}</p>}
          {actionError && <p role="alert" className="gov-inline-error">{t('experience.voteError')}</p>}
          <div className="gov-info-note mt-6">
            <Clock3 size={16} aria-hidden="true" />
            <p>{t('experience.pollsNote')}</p>
          </div>
        </aside>
      </div>
    </>
  );
};

export default GovernanceVote;
