import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowDownWideNarrow, Globe2, Plus } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import ExploreViewSwitch, { type ExploreLayout } from './ExploreViewSwitch';
import './ExploreToolbar.css';

interface Option<T extends string> {
  title: string;
  value: T;
}

interface ToolbarFieldProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  Icon: typeof Globe2;
}

const ToolbarField = <T extends string, >({
  label, value, options, onChange, Icon,
}: ToolbarFieldProps<T>) => {
  const { i18n } = useTranslation();
  const highlight = usePointerHighlight();

  return (
    <Select
      dir={i18n.dir()}
      value={value}
      onValueChange={(nextValue) => {
        const option = options.find((item) => item.value === nextValue);
        if (option) onChange(option.value);
      }}
    >
      <SelectTrigger aria-label={label} className="explore-toolbar__field" {...highlight}>
        <Icon className="explore-toolbar__icon" aria-hidden="true" />
        <span className="explore-toolbar__field-body">
          <span className="explore-toolbar__label">{label}</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className="explore-toolbar-menu" align="start" sideOffset={5}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="explore-toolbar-menu__item"
          >
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface ExploreToolbarProps<T extends string> {
  orderBy: T;
  onOrderByChange: (value: T) => void;
  orderByOptions: Option<T>[];
  collection: string;
  onCollectionChange: (value: string) => void;
  collectionOptions: Option<string>[];
  layout?: ExploreLayout;
  onLayoutChange?: (value: ExploreLayout) => void;
}

const ExploreToolbar = <T extends string, >({
  orderBy, onOrderByChange, orderByOptions,
  collection, onCollectionChange, collectionOptions,
  layout, onLayoutChange,
}: ExploreToolbarProps<T>) => {
  const { t, i18n } = useTranslation('trending');
  const headingId = useId();
  const highlight = usePointerHighlight();
  const hasCollections = collectionOptions.length > 0;

  return (
    <div className="explore-toolbar-container">
      <section className={`explore-toolbar${layout ? ' explore-toolbar--with-layout' : ''}`} dir={i18n.dir()} aria-labelledby={headingId}>
        <h2 id={headingId}>{t('tokenList.tokenizedTrends')}</h2>
        <div className={`explore-toolbar__filters${hasCollections ? '' : ' explore-toolbar__filters--single'}`}>
          <ToolbarField
            label={t('tokenList.sortBy')}
            Icon={ArrowDownWideNarrow}
            value={orderBy}
            onChange={onOrderByChange}
            options={orderByOptions}
          />
          {hasCollections && (
            <ToolbarField
              label={t('tokenListTable.collection')}
              Icon={Globe2}
              value={collection}
              onChange={onCollectionChange}
              options={collectionOptions}
            />
          )}
          {layout && onLayoutChange && (
            <ExploreViewSwitch value={layout} onChange={onLayoutChange} />
          )}
        </div>
        <Link to="/trends/create" className="explore-toolbar__create" {...highlight}>
          <Plus aria-hidden="true" />
          <span>{t('tokenList.tokenizeTrend')}</span>
        </Link>
      </section>
    </div>
  );
};

export default ExploreToolbar;
