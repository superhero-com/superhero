import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SECTIONS = [
  { to: '/trends/daos', labelKey: 'tokenDaosTab' },
  { to: '/voting', labelKey: 'pollsTab' },
] as const;

/** Switches between the per-token DAOs and the network-wide æternity governance polls. */
const DaoSectionTabs = () => {
  const { t } = useTranslation('dao');

  return (
    <nav className="ui-section-tabs" aria-label={t('sectionsLabel')}>
      {SECTIONS.map(({ to, labelKey }) => (
        <NavLink key={to} to={to}>
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};

export default DaoSectionTabs;
