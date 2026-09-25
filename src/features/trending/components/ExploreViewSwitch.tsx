import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ExploreLayout = 'table' | 'cards';

const ExploreViewSwitch = ({ value, onChange }: {
  value: ExploreLayout;
  onChange: (value: ExploreLayout) => void;
}) => {
  const { t } = useTranslation('trending');
  return (
    <div className="explore-view-switch" role="group" aria-label={t('market.layout')}>
      {([{ value: 'table', Icon: List }, { value: 'cards', Icon: LayoutGrid }] as const)
        .map(({ value: option, Icon }) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            aria-label={t(`market.${option}`)}
            title={t(`market.${option}`)}
            onClick={() => onChange(option)}
          >
            <Icon aria-hidden="true" />
            <span>{t(`market.${option}`)}</span>
          </button>
        ))}
    </div>
  );
};

export default ExploreViewSwitch;
