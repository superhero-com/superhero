import { useState } from 'react';
import { Encoded, Encoding } from '@aeternity/aepp-sdk';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, CircleCheckBig, ExternalLink, Info, Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { TokensService } from '@/api/generated';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { Button } from '@/components/ui/button';
import { useDaoVote } from '@/features/dao/hooks/useDaoVote';
import { useAeSdk } from '@/hooks';
import { ensureAddress, ensureString } from '@/utils/common';
import { safeHref } from '@/utils/safeHref';
import VoteRulesCard from '@/features/dao/components/VoteRulesCard';
import VoteSubject from '@/features/dao/components/VoteSubject';
import VotersTable from '@/features/dao/components/VotersTable';
import { VoteMeters, VoteStatusBadge, VoteTime } from '@/features/dao/components/VoteStatus';
import { daoErrorKey } from '@/features/dao/utils/daoErrors';
import { formatUnits, summarizeSubject } from '@/features/dao/utils/voteRules';
import Spinner from '@/components/Spinner';
import '@/features/dao/components/daoVoting.css';

type DaoVoteDetailsParams = {
  saleAddress: string;
  voteAddress: string;
  voteId: string;
};

const DaoVoteDetailsContent = ({
  saleAddress,
  voteAddress,
  voteId,
}: DaoVoteDetailsParams) => {
  const { t, i18n } = useTranslation('dao');
  const { currentBlockHeight, activeAccount } = useAeSdk();
  const [choice, setChoice] = useState<'yes' | 'no' | ''>('');

  ensureAddress(saleAddress, Encoding.ContractAddress);
  ensureString(saleAddress);
  ensureAddress(voteAddress, Encoding.ContractAddress);
  ensureString(voteAddress);
  ensureString(voteId);

  const {
    voteState,
    status,
    tally,
    position,
    actions,
    voteTimeout,
    tokenSymbol: chainSymbol,
    tokenDecimals,
    userTokenBalance,
    daoLoaded,
    actionLoading,
    actionError,
    loadError,
    voteOption,
    revokeVote,
    withdraw,
    applyVote,
  } = useDaoVote({
    tokenSaleAddress: saleAddress as Encoded.ContractAddress,
    voteAddress: voteAddress as Encoded.ContractAddress,
    voteId: BigInt(voteId),
  });

  const {
    data: token,
    isLoading,
    error,
  } = useQuery({
    queryFn: () => TokensService.findByAddress({ address: saleAddress }),
    queryKey: ['TokensService.findByAddress', saleAddress],
    retry: 3,
    retryDelay: 1000 * 5,
  });

  // `voteState.metadata.link` is free-text supplied by whoever created the poll — no scheme
  // validation happens on-chain, so a `javascript:`/`data:` payload must be rejected here before
  // it can ever reach an `href`.
  const proposalLink = safeHref(voteState?.metadata?.link);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner className="w-20 h-20 mx-auto" />
          <div className="mt-4">{t('loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        {t('errorLoadingToken')}
        {' '}
        {error.message}
      </div>
    );
  }

  if (!token) {
    return <div className="p-4">{t('tokenNotFound')}</div>;
  }

  const tokenLabel = `#${token.name || token.symbol}`;
  const symbol = chainSymbol || token.symbol || '';
  const fmtTokens = (value?: bigint) => formatUnits(value ?? 0n, tokenDecimals, i18n.language);
  const summary = summarizeSubject(voteState?.metadata?.subject);
  const height = currentBlockHeight ?? 0;
  const hasTokens = (userTokenBalance ?? 0n) > 0n;
  const errorText = actionError ? t(daoErrorKey(actionError)) : '';

  let treasuryShare: string | undefined;
  if (summary.amountAettos != null && token.dao_balance) {
    const treasury = Number(token.dao_balance);
    if (treasury > 0) {
      treasuryShare = Math.round((Number(summary.amountAettos) / treasury) * 100).toLocaleString(i18n.language);
    }
  }

  const ballot = () => {
    if (!status || !actions) {
      return <div className="dao-v-muted" role="status">{t('loading')}</div>;
    }

    if (position) {
      const side = position.agreed ? t('voting.ballot.yes') : t('voting.ballot.no');
      return (
        <>
          <div className="dao-v-note dao-v-note--ok">
            <CircleCheckBig aria-hidden="true" />
            <p>{t('voting.ballot.youVoted', { side, amount: fmtTokens(position.amount), symbol })}</p>
          </div>
          {actions.canRevoke && (
            <>
              <div className="dao-v-note">
                <Lock aria-hidden="true" />
                <p>{t('voting.ballot.lockedUntilEnd', { token: tokenLabel })}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="dao-v-btn ui-secondary w-full"
                disabled={actionLoading}
                onClick={revokeVote}
              >
                {t('voting.ballot.takeBack')}
              </Button>
            </>
          )}
          {actions.canWithdraw && (
            <Button
              type="button"
              className="dao-v-btn ui-primary w-full"
              disabled={actionLoading}
              onClick={withdraw}
            >
              {t('voting.ballot.withdraw', { amount: fmtTokens(position.amount), symbol })}
            </Button>
          )}
          {position.withdrawn && <p className="dao-v-help">{t('voting.ballot.withdrawn')}</p>}
        </>
      );
    }

    if (status !== 'open') {
      return <p className="dao-v-muted">{t(`voting.ballot.closed.${status}`)}</p>;
    }

    return (
      <>
        <fieldset>
          <legend className="sr-only">{t('voting.ballot.choose')}</legend>
          {(['yes', 'no'] as const).map((c) => (
            <label
              key={c}
              htmlFor={`dao-v-choice-${c}`}
              className={`dao-v-choice${choice === c ? ' is-checked' : ''}`}
            >
              <input
                id={`dao-v-choice-${c}`}
                type="radio"
                name="dao-v-choice"
                value={c}
                checked={choice === c}
                onChange={() => setChoice(c)}
              />
              <span>
                <strong>{t(`voting.ballot.${c}Title`)}</strong>
                <small>{t(`voting.ballot.${c}Text`)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="dao-v-note">
          <Lock aria-hidden="true" />
          <p>{t('voting.ballot.lockNotice', { token: tokenLabel })}</p>
        </div>
        {!activeAccount && (
          <ConnectWalletButton label={t('voting.ballot.connect')} block className="dao-v-btn w-full" />
        )}
        {activeAccount && daoLoaded && !hasTokens && (
          <div className="dao-v-note dao-v-note--warn">
            <Info aria-hidden="true" />
            <div>
              <p>{t('voting.ballot.needTokens', { token: tokenLabel })}</p>
              <Link to={`/trends/tokens/${encodeURIComponent(token.name || token.symbol)}`} className="dao-v-link">
                {t('voting.ballot.getTokens', { token: tokenLabel })}
              </Link>
            </div>
          </div>
        )}
        {activeAccount && hasTokens && (
          <>
            <p className="dao-v-help">
              {t('voting.ballot.weight', { amount: fmtTokens(userTokenBalance), symbol })}
            </p>
            <Button
              type="button"
              className="dao-v-btn ui-primary w-full mt-3"
              disabled={!choice || actionLoading || !actions.canVote}
              onClick={() => voteOption(choice === 'yes')}
            >
              {choice
                ? t('voting.ballot.submit', { side: choice === 'yes' ? t('voting.ballot.yes') : t('voting.ballot.no') })
                : t('voting.ballot.chooseFirst')}
            </Button>
          </>
        )}
      </>
    );
  };

  return (
    <div className="ui-page dao-page dao-v max-w-[min(1200px,100%)] mx-auto min-h-screen px-4">
      <div className="dao-v-topline">
        <Link to={`/trends/dao/${saleAddress}`}>
          <ChevronLeft size={16} aria-hidden="true" />
          {t('voting.detail.backTo', { token: tokenLabel })}
        </Link>
        <a
          href={`https://aescan.io/contracts/${encodeURIComponent(voteAddress)}?type=call-transactions`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('voting.page.viewOnAescan')}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {!voteState && loadError && (
        <div className="dao-v-empty" role="alert">
          <h2>{t('voting.page.loadErrorTitle')}</h2>
          <p className="dao-v-muted">{t('voting.page.loadErrorText')}</p>
        </div>
      )}
      {!voteState && !loadError && (
        <div className="dao-v-empty dao-v-muted" role="status">{t('loading')}</div>
      )}

      {voteState && (
        <div className="dao-v-grid">
          <div className="min-w-0 grid gap-4">
            <section className="dao-v-card" aria-labelledby="dao-v-vote-title">
              <div className="dao-v-item-top">
                {status ? <VoteStatusBadge status={status} /> : <span />}
                {status && currentBlockHeight != null && (
                  <VoteTime
                    status={status}
                    closeHeight={Number(voteState.close_height)}
                    height={height}
                    voteTimeout={voteTimeout}
                  />
                )}
              </div>
              <p className="dao-v-eyebrow mt-3">{t('voteNumber', { voteId })}</p>
              <h1 id="dao-v-vote-title" className="ui-page-title">
                <VoteSubject voteState={voteState} tokenSymbol={symbol} />
              </h1>
              <p className="dao-v-by dao-v-muted mt-2">
                {t('voting.list.by')}
                <AddressAvatarWithChainName address={voteState.author} variant="feed" />
              </p>

              {summary.amountAettos != null && (
                <div className="dao-v-ask">
                  <span>{t('voting.detail.asksFor')}</span>
                  <strong>{`${formatUnits(summary.amountAettos, 18, i18n.language)} AE`}</strong>
                  {treasuryShare && (
                    <span>{t('voting.detail.ofTreasury', { percent: treasuryShare })}</span>
                  )}
                </div>
              )}

              {tally && status && (
                <div className="dao-v-box mt-4">
                  <VoteMeters tally={tally} status={status} withNote />
                </div>
              )}

              {voteState.metadata?.description && (
                <>
                  <h3 className="mt-5">{t('voting.detail.why')}</h3>
                  <p className="dao-v-prose" dir="auto">{voteState.metadata.description}</p>
                </>
              )}
              {proposalLink && (
                <a href={proposalLink} target="_blank" rel="noopener noreferrer" className="dao-v-link">
                  {t('viewProposal')}
                  <ExternalLink aria-hidden="true" />
                </a>
              )}
            </section>

            <section className="dao-v-card" aria-labelledby="dao-v-voters-title">
              <h2 id="dao-v-voters-title" className="mb-3">{t('voters.title')}</h2>
              <VotersTable voteState={voteState} token={token} decimals={tokenDecimals} />
            </section>
          </div>

          <aside className="dao-v-side">
            <section className="dao-v-card dao-v-ballot" aria-labelledby="dao-v-ballot-title" aria-busy={actionLoading}>
              <h3 id="dao-v-ballot-title">{t('voting.ballot.title')}</h3>
              <div className="mt-3">{ballot()}</div>
              {actions?.canApply && (
                <div className="mt-4">
                  <p className="dao-v-help mb-2">{t('voting.ballot.applyText')}</p>
                  <Button
                    type="button"
                    className="dao-v-btn ui-primary w-full"
                    disabled={actionLoading}
                    onClick={applyVote}
                  >
                    {t('voting.ballot.apply')}
                  </Button>
                </div>
              )}
              {status === 'passed' && !activeAccount && (
                <p className="dao-v-help mt-3">{t('voting.ballot.applyConnect')}</p>
              )}
              {actionLoading && (
                <div className="flex items-center gap-2 mt-3 dao-v-muted" role="status">
                  <Spinner className="w-5 h-5" />
                  {t('voting.ballot.confirmInWallet')}
                </div>
              )}
              {errorText && (
                <div className="dao-v-note dao-v-note--error" role="alert"><p>{errorText}</p></div>
              )}
            </section>
            <VoteRulesCard voteTimeout={voteTimeout} />
          </aside>
        </div>
      )}
    </div>
  );
};

const DaoVoteDetailsView = () => {
  const { t } = useTranslation('dao');
  const { saleAddress, voteAddress, voteId } = useParams<DaoVoteDetailsParams>();

  if (!saleAddress || !voteAddress || !voteId) {
    return <div className="text-red-400 p-4">{t('missingRequiredParameters')}</div>;
  }

  return (
    <DaoVoteDetailsContent
      saleAddress={saleAddress}
      voteAddress={voteAddress}
      voteId={voteId}
    />
  );
};

export default DaoVoteDetailsView;
