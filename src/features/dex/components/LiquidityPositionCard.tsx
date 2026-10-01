import {
  useEffect, useId, useRef, useState,
} from 'react';
import {
  ArrowUpRight, Check, ChevronDown, Copy, Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../../../config';
import aeMark from '../../../svg/aeternity-mark.svg';
import { copyToClipboard, prepareExplorerUrl } from '../../../utils/address';
import { LiquidityPosition } from '../types/pool';
import { liquidityPositionValues } from '../utils/liquidityPositionValues';
import { formatLiquidityValue } from '../utils/liquidityEstimate';

interface LiquidityPositionCardProps {
  position: LiquidityPosition;
  selected?: boolean;
  onRemove?: (position: LiquidityPosition) => void;
  onAdd?: (position: LiquidityPosition) => void;
}

const LiquidityPositionCard = ({
  position, selected = false, onRemove, onAdd,
}: LiquidityPositionCardProps) => {
  const { t } = useTranslation('dex');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const detailsId = useId();
  const { pair } = position;
  const values = liquidityPositionValues(position);
  const tokens = [pair.token0, pair.token1];
  const explorer = CONFIG.EXPLORER_URL ? prepareExplorerUrl(pair.address, CONFIG.EXPLORER_URL) : undefined;
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    if (!await copyToClipboard(pair.address)) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return (
    <article className={`position-row${selected ? ' is-selected' : ''}`} aria-label={`${pair.token0.symbol} / ${pair.token1.symbol}`}>
      <div className="position-identity">
        <div className="position-avatars" aria-hidden="true">
          {tokens.map((token) => (
            <span key={token.address} className={`position-badge${token.address === CONFIG.DEX_WAE ? ' is-ae' : ''}`}>
              {token.address === CONFIG.DEX_WAE ? <img src={aeMark} alt="" /> : token.symbol.slice(0, 1)}
            </span>
          ))}
        </div>
        <div className="position-name">
          <h3>
            <bdi>{pair.token0.symbol}</bdi>
            <span>/</span>
            <bdi>{pair.token1.symbol}</bdi>
          </h3>
          <p>{tokens.filter((token) => token.address !== CONFIG.DEX_WAE).map((token) => token.name).join(' · ')}</p>
        </div>
        <span className="position-share">
          <bdi title={values.sharePct}>{values.sharePct === undefined ? '—' : `${formatLiquidityValue(values.sharePct, 4)}%`}</bdi>
          {' '}
          {t('positionsCard.ofPool')}
        </span>
      </div>
      <div className="position-holdings">
        {tokens.map((token, index) => {
          const amount = index === 0 ? values.amount0 : values.amount1;
          return (
            <div key={token.address}>
              <span>{t('positionsCard.pooled', { symbol: token.symbol })}</span>
              <strong>
                <bdi title={amount}>{formatLiquidityValue(amount, 6)}</bdi>
                <small>{token.symbol}</small>
              </strong>
            </div>
          );
        })}
      </div>
      <div className="position-footer">
        <button type="button" className="position-details-trigger" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(!expanded)}>
          <span>
            <bdi title={values.lpBalance}>{formatLiquidityValue(values.lpBalance)}</bdi>
            {' '}
            {t('positionsCard.lpTokens')}
          </span>
          <ChevronDown className={expanded ? 'rotated' : ''} aria-hidden="true" />
        </button>
        <div className="position-actions">
          {onAdd && (
          <button type="button" className="position-add" onClick={() => onAdd(position)}>
            <Plus aria-hidden="true" />
            {t('positionsCard.add')}
          </button>
          )}
          {onRemove && (
          <button type="button" onClick={() => onRemove(position)}>
            <ArrowUpRight aria-hidden="true" />
            {t('positionsCard.remove')}
          </button>
          )}
        </div>
      </div>
      {expanded && (
        <div id={detailsId} className="position-detail">
          <p>{t('positionsCard.detailHint')}</p>
          <div className="position-contract">
            <span>{t('positionsCard.contract')}</span>
            <code>{pair.address}</code>
            <button type="button" onClick={copy} aria-label={t(copied ? 'positionsCard.copied' : 'positionsCard.copy')}>
              <span className="sr-only" role="status">{copied ? t('positionsCard.copied') : ''}</span>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
          </div>
          <div className="position-links">
            <Link to={`/defi/explore/pools/${pair.address}`}>
              {t('positionsCard.viewPool')}
              <ArrowUpRight aria-hidden="true" />
            </Link>
            {explorer && (
            <a href={explorer} target="_blank" rel="noreferrer">
              {t('positionsCard.explorer')}
              <ArrowUpRight aria-hidden="true" />
            </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default LiquidityPositionCard;
