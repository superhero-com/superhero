import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './TokenExploreLink.css';

const TokenExploreLink = () => {
  const { t, i18n } = useTranslation('trending');
  return (
    <Link className="token-explore-link" to="/trends/tokens" dir={i18n.dir()}>
      <ArrowLeft aria-hidden="true" />
      {t('overview.back')}
    </Link>
  );
};

export default TokenExploreLink;
