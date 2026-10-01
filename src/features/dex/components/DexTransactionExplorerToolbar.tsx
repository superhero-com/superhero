import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

const groups = [
  { label: 'swaps', methods: ['swap_exact_ae_for_tokens', 'swap_ae_for_exact_tokens', 'swap_exact_tokens_for_ae', 'swap_tokens_for_exact_ae', 'swap_exact_tokens_for_tokens', 'swap_tokens_for_exact_tokens'] },
  { label: 'add', methods: ['add_liquidity_ae', 'add_liquidity'] },
  { label: 'remove', methods: ['remove_liquidity_ae', 'remove_liquidity'] },
];
interface Props {
  type: string;
  ascending: boolean;
  expanded: boolean;
  addressCount: number;
  panelId: string;
  onType: (value: string) => void;
  onOrder: (ascending: boolean) => void;
  onToggle: () => void;
}
const DexTransactionExplorerToolbar = ({
  type, ascending, expanded, addressCount, panelId, onType, onOrder, onToggle,
}: Props) => {
  const { t } = useTranslation();
  const typeId = useId(); const orderId = useId();
  return (
    <div className="dex-tx-toolbar">
      <label className="dex-token-toolbar__select dex-tx-toolbar__type" htmlFor={typeId}>
        <span>{t('dex.transactionExplorer.type')}</span>
        <select id={typeId} aria-label={t('dex.transactionExplorer.type')} value={type} onChange={(event) => onType(event.target.value)}>
          <option value="all">{t('dex.transactionExplorer.all')}</option>
          {groups.map((group) => (
            <optgroup key={group.label} label={t(`dex.transactionExplorer.groups.${group.label}`)}>
              {group.methods.map((method) => <option key={method} value={method}>{t(`dex.transactionExplorer.methods.${method}`)}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown aria-hidden="true" />
      </label>
      <label className="dex-token-toolbar__select" htmlFor={orderId}>
        <span>{t('dex.transactionExplorer.order')}</span>
        <select id={orderId} aria-label={t('dex.transactionExplorer.orderLabel')} value={ascending ? 'ASC' : 'DESC'} onChange={(event) => onOrder(event.target.value === 'ASC')}>
          <option value="DESC">{t('dex.transactionExplorer.newest')}</option>
          <option value="ASC">{t('dex.transactionExplorer.oldest')}</option>
        </select>
        <ChevronDown aria-hidden="true" />
      </label>
      <button className="dex-tx-toolbar__toggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}>
        <SlidersHorizontal aria-hidden="true" />
        <span>{t('dex.transactionExplorer.addressFilters')}</span>
        {' '}
        {addressCount > 0 ? <b>{addressCount}</b> : <ChevronDown className={expanded ? 'is-open' : ''} aria-hidden="true" />}
      </button>
    </div>
  );
};
export default DexTransactionExplorerToolbar;
