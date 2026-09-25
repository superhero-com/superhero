import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import AeternityBadge from './AeternityBadge';
import './RailCards.css';

const GetAeButton = () => {
  const { t } = useTranslation('common');
  const highlight = usePointerHighlight();
  return (
    <Link to="/get-ae" className="get-ae-button" {...highlight}>
      <AeternityBadge />
      <span className="get-ae-button__copy">
        <strong>{t('buyAeRail.title')}</strong>
        <span>{t('buyAeRail.buttonSubtitle')}</span>
      </span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
};

export default GetAeButton;
