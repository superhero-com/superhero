import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Encoded, Encoding, isAddressValid } from '@aeternity/aepp-sdk';
import { useAccount, useAeSdk, useGovernance } from '@/hooks';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { formatUnits } from '@/features/dao/utils/voteRules';

const GovernanceAccount = () => {
  const { t, i18n } = useTranslation('governance');
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccount();
  const {
    useDelegation, useDelegators, useSetDelegation, useRevokeDelegation,
  } = useGovernance();
  const { data: delegation, error: delegationError } = useDelegation();
  const { data: delegators = [], isLoading, error: delegatorsError } = useDelegators();
  const save = useSetDelegation();
  const revoke = useRevokeDelegation();
  const [address, setAddress] = useState(delegation || '');
  useEffect(() => { setAddress(delegation || ''); }, [delegation]);
  const pending = save.isPending || revoke.isPending;
  const valid = isAddressValid(address.trim(), Encoding.AccountAddress) && address.trim() !== activeAccount;

  return (
    <>
      <Link className="gov-back" to="/voting">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('experience.backToPolls')}
      </Link>
      <div className="gov-layout">
        <div className="gov-detail-stack">
          <div className="gov-section-heading">
            <div>
              <h1>{t('experience.votingPower')}</h1>
            </div>
          </div>
          {!activeAccount ? (
            <section className="gov-empty">
              <p>{t('experience.connectForPower')}</p>
              <ConnectWalletButton />
            </section>
          ) : (
            <>
              <section className="gov-panel gov-account">
                <h2>{t('account.accountInformation')}</h2>
                <p>{t('account.walletAddress')}</p>
                <code dir="ltr">{activeAccount}</code>
                <dl className="gov-account-stats">
                  <div>
                    <dt>{t('account.aeBalance')}</dt>
                    <dd>
                      {decimalBalance.toString()}
                      {' '}
                      <small>AE</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{t('account.activeDelegators')}</dt>
                    <dd>{isLoading ? '…' : delegators.length}</dd>
                  </div>
                </dl>
              </section>
              <section className="gov-panel gov-form">
                <h2>{t('account.voteDelegation')}</h2>
                <p>{t('experience.delegateHelp')}</p>
                {delegationError && <p role="alert" className="gov-inline-error">{t('account.unableToLoadAccount')}</p>}
                {delegation && (
                <div className="gov-current-delegate">
                  <span>{t('account.currentlyDelegated')}</span>
                  <code dir="ltr">{delegation}</code>
                </div>
                )}
                <form onSubmit={(event) => { event.preventDefault(); if (valid && !pending) { revoke.reset(); save.mutate(address.trim() as Encoded.AccountAddress); } }}>
                  <label className="gov-field" htmlFor="governance-delegate">
                    <span>{t('account.delegateToAddress')}</span>
                    <input id="governance-delegate" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="ak_…" autoComplete="off" spellCheck={false} dir="ltr" />
                  </label>
                  <div className="gov-form-actions">
                    <button className="gov-button ui-primary" type="submit" disabled={!valid || pending}>{save.isPending ? t('account.savingDelegation') : t('account.saveDelegation')}</button>
                    {delegation && <button type="button" className="gov-button ui-secondary" disabled={pending} onClick={() => { save.reset(); revoke.mutate(); }}>{revoke.isPending ? t('account.revokingDelegation') : t('account.revokeDelegation')}</button>}
                  </div>
                </form>
                {(save.isError || revoke.isError) && <p role="alert" className="gov-inline-error">{t('account.transactionFailedDesc')}</p>}
                {(save.isSuccess || revoke.isSuccess) && <p role="status">{t(save.isSuccess ? 'account.delegationSavedDesc' : 'account.delegationRevokedDesc')}</p>}
              </section>
              <section className="gov-panel">
                <h2>{t('account.yourDelegators')}</h2>
                {delegatorsError ? <p role="alert">{t('account.unableToLoadAccount')}</p> : <p>{t('account.peopleTrustYouWithVotes', { count: delegators.length })}</p>}
                <ul className="gov-delegators">
                  {delegators.map((item) => {
                    const delegator = item as { delegator: string; balance?: string };
                    return (
                      <li key={delegator.delegator}>
                        <code dir="ltr">{delegator.delegator}</code>
                        {delegator.balance && (
                        <strong>
                          {formatUnits(delegator.balance, 18, i18n.language)}
                          {' '}
                          AE
                        </strong>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </div>
        <aside className="gov-panel">
          <h2>{t('experience.yourVoice')}</h2>
          <p>{t('experience.powerIntro')}</p>
          <p>{t('experience.delegateHelp')}</p>
        </aside>
      </div>
    </>
  );
};

export default GovernanceAccount;
