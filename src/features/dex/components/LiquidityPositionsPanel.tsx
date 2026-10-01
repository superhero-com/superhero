import {
  ArrowUpRight, Info, Layers, RefreshCw, Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import LiquidityPositionCard from './LiquidityPositionCard';
import type { LiquidityPosition } from '../types/pool';
import './LiquidityPositions.css';

interface Props {
  connected: boolean;
  positions: LiquidityPosition[];
  loading: boolean;
  error: string | null;
  selectedPair?: string;
  onRefresh: () => void;
  onAdd: (position?: LiquidityPosition) => void;
  onRemove: (position: LiquidityPosition) => void;
}

const LiquidityPositionsPanel = ({
  connected, positions, loading, error, selectedPair, onRefresh, onAdd, onRemove,
}: Props) => {
  const { t } = useTranslation('dex');
  const items = connected ? positions.filter((item) => item?.pair?.address) : [];
  const hasItems = items.length > 0;
  let state = 'empty';
  if (!connected) state = 'disconnected';
  else if (loading) state = 'loading';
  else if (error) state = 'error';
  return (
    <section className="positions-card" aria-label={t('positionsCard.title')}>
      <header className="positions-header">
        <div>
          <h2>
            {t('positionsCard.title')}
            <span>{hasItems || (connected && !loading && !error) ? items.length : '—'}</span>
          </h2>
          <p>{t('positionsCard.description')}</p>
        </div>
        {connected && (
        <button type="button" className="positions-refresh" aria-label={t('positionsCard.refresh')} disabled={loading} onClick={onRefresh}>
          <RefreshCw className={loading ? 'spinning' : ''} aria-hidden="true" />
          <span>{t(loading ? 'pool.refreshing' : 'pool.refresh')}</span>
        </button>
        )}
      </header>
      {hasItems ? (
        <>
          <div className="positions-scope">
            <span>
              <span className="position-live-dot" />
              {t('positionsCard.active', { count: items.length })}
            </span>
            <span>
              <Wallet aria-hidden="true" />
              {t('positionsCard.thisWallet')}
            </span>
          </div>
          {error && <p className="positions-error" role="status">{t('positionsCard.refreshError')}</p>}
          <div className="positions-list" aria-busy={loading}>
            {items.map((position) => <LiquidityPositionCard key={position.pair.address} position={position} selected={selectedPair === position.pair.address} onAdd={onAdd} onRemove={onRemove} />)}
          </div>
          <p className="positions-footnote">
            <Info aria-hidden="true" />
            {t('positionsCard.footnote')}
          </p>
        </>
      ) : (
        <div className="positions-state" role="status">
          <span className="positions-state-icon">{state === 'disconnected' ? <Wallet aria-hidden="true" /> : <Layers aria-hidden="true" />}</span>
          <h3>{t(`positionsCard.${state}Title`)}</h3>
          <p>{t(`positionsCard.${state}Hint`)}</p>
          {state === 'disconnected' && <ConnectWalletButton label={t('swapCard.connectWallet')} variant="swap" />}
          {state === 'error' && <button type="button" onClick={onRefresh}>{t('poolAdd.retry')}</button>}
          {state === 'empty' && (
          <button type="button" onClick={() => onAdd()}>
            {t('poolAdd.title')}
            <ArrowUpRight aria-hidden="true" />
          </button>
          )}
        </div>
      )}
    </section>
  );
};
export default LiquidityPositionsPanel;
