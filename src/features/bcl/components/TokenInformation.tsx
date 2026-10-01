import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Check, ChevronDown, Code2, Copy, ExternalLink, Info, Users,
} from 'lucide-react';
import { toAe } from '@aeternity/aepp-sdk';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import AddressAvatar from '@/components/AddressAvatar';
import { useChainName } from '@/hooks/useChainName';
import { Decimal } from '@/libs/decimal';
import { CONFIG } from '@/config';
import { copyToClipboard, prepareExplorerUrl } from '@/utils/address';
import './TokenInformation.css';

const AddressCopy = ({ value, label }: { value: string; label: string }) => {
  const { t } = useTranslation('trending', { keyPrefix: 'information' });
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <>
      <button
        type="button"
        className="token-info-copy"
        aria-label={`${t(status === 'copied' ? 'copied' : 'copy')} · ${label}`}
        onClick={async () => setStatus(await copyToClipboard(value) ? 'copied' : 'failed')}
      >
        {status === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      {status === 'failed' && <span role="status">{t('copyFailed')}</span>}
    </>
  );
};

const explorerUrl = (address?: string) => (address && CONFIG.EXPLORER_URL
  ? prepareExplorerUrl(address, CONFIG.EXPLORER_URL) : undefined);

const TokenInformation = ({ token, className = '' }: { token: TokenDto; className?: string }) => {
  const { t, i18n } = useTranslation('trending', { keyPrefix: 'information' });
  const { chainName } = useChainName(token.creator_address || '');
  const [contracts, setContracts] = useState(false);
  const [explanation, setExplanation] = useState(false);
  const contractsId = useId();
  const explanationId = useId();
  const creator = token.creator_address;
  const date = token.created_at ? new Date(token.created_at) : null;
  const created = date && Number.isFinite(date.getTime())
    ? date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const hasBalance = token.dao_balance != null && String(token.dao_balance).trim() !== ''
    && Number.isFinite(Number(token.dao_balance)) && Number(token.dao_balance) >= 0;
  const treasury = hasBalance ? Decimal.from(toAe(token.dao_balance)) : null;
  const treasuryValue = treasury && (treasury.isZero || treasury.lt(Decimal.ONE)
    ? treasury.prettifyWithMaxPrecision() : treasury.prettify(2));
  const explorer = explorerUrl(token.sale_address || token.address);
  const contractEntries = [[t('tokenContract'), token.address], [t('saleContract'), token.sale_address]];

  return (
    <div className={`token-information ${className}`} dir={i18n.dir()}>
      <section className="token-info-card" aria-label={t('title')}>
        <header className="token-info-heading">
          <h2>{t('title')}</h2>
          <p>{t('subtitle')}</p>
        </header>
        <div className="token-info-creator">
          <span className="token-info-eyebrow">{t('creator')}</span>
          {creator ? (
            <>
              <div className="token-info-creator__top">
                <AddressAvatar address={creator} size={34} />
                <Link to={`/users/${encodeURIComponent(creator)}`}>
                  <strong>{chainName || t('wallet')}</strong>
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
              <div className="token-info-address">
                <bdi>{creator}</bdi>
                <AddressCopy value={creator} label={t('creator')} />
              </div>
            </>
          ) : <p className="token-info-missing">{t('missingCreator')}</p>}
        </div>
        <dl className="token-info-facts">
          <div>
            <dt>{t('treasury')}</dt>
            <dd>
              <bdi>
                {treasuryValue ?? '—'}
                {' '}
                {treasury && <small>AE</small>}
              </bdi>
            </dd>
          </div>
          <div>
            <dt>{t('created')}</dt>
            <dd>{created}</dd>
          </div>
        </dl>
        <div className="token-info-disclosures">
          <button type="button" className="token-info-disclosure" aria-expanded={contracts} aria-controls={contractsId} onClick={() => setContracts(!contracts)}>
            <span>
              <Code2 aria-hidden="true" />
              {t('contracts')}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
          {contracts && (
            <div id={contractsId} className="token-info-contracts">
              {contractEntries.map(([label, address]) => {
                const url = explorerUrl(address);
                return (
                  <div key={label}>
                    <span>{label}</span>
                    {address ? (
                      <>
                        <bdi>{address}</bdi>
                        <div className="token-info-contract-actions">
                          <AddressCopy value={address} label={label} />
                          {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t('explorer')} · ${label}`}>
                            <ExternalLink aria-hidden="true" />
                            <span>æScan</span>
                          </a>
                          )}
                        </div>
                      </>
                    ) : <p>{t('unavailable')}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" className="token-info-disclosure" aria-expanded={explanation} aria-controls={explanationId} onClick={() => setExplanation(!explanation)}>
            <span>
              <Info aria-hidden="true" />
              {t('how')}
            </span>
            <ChevronDown aria-hidden="true" />
          </button>
          {explanation && <p className="token-info-explanation" id={explanationId}>{t('howCopy')}</p>}
        </div>
        {token.sale_address && (
          <Link className="token-info-dao" to={`/trends/dao/${encodeURIComponent(token.sale_address)}`}>
            <span className="token-info-dao-mark"><Users aria-hidden="true" /></span>
            <span>
              <strong>{t('dao')}</strong>
              <small>{t('daoHint')}</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
        <footer className="token-info-links">
          <Link to="/trends/invite">
            {t('invite')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
          {explorer && (
          <a href={`${explorer}?type=call-transactions`} target="_blank" rel="noopener noreferrer">
            {t('explorer')}
            <ArrowUpRight aria-hidden="true" />
          </a>
          )}
        </footer>
      </section>
    </div>
  );
};

export default TokenInformation;
