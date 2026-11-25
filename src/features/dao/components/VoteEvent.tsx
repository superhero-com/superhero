import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DaoEvent, formatEventDate } from '../utils/voteRules';

/** The event a funding vote is for: name, city and date on one line. */
const VoteEvent = ({ event, className }: { event: DaoEvent; className?: string }) => {
  const { t, i18n } = useTranslation('dao');
  return (
    <p className={`dao-v-event${className ? ` ${className}` : ''}`}>
      <span className="dao-v-event-badge">
        <CalendarDays aria-hidden="true" />
        {t('voting.event.badge')}
      </span>
      <span dir="auto">
        {t('voting.event.line', {
          name: event.name, city: event.city, date: formatEventDate(event.date, i18n.language),
        })}
      </span>
    </p>
  );
};

export default VoteEvent;
