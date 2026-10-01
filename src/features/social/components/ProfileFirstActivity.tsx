import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useFirstAccountActivity from '@/hooks/useFirstAccountActivity';

const ProfileFirstActivity = ({ address }: { address: string }) => {
  const { t, i18n } = useTranslation('common');
  const { data: timestamp } = useFirstAccountActivity(address);
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(date);

  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-white/60" data-testid="profile-first-activity">
      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {t('account.firstBlockchainActivity')}
        {' '}
        <time dateTime={date.toISOString()}>{formattedDate}</time>
      </span>
    </p>
  );
};

export default ProfileFirstActivity;
