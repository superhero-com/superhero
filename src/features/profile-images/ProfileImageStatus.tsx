import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useImageActions } from './ProfileImageProvider';

export const ProfileImageStatus = () => {
  const { t } = useTranslation('common');
  const actions = useImageActions();
  if (!actions || (!actions.pending && !actions.message && !actions.error)) return null;
  return (
    <div className="space-y-2 text-xs">
      {actions.message && <p role="status" className="text-white/70">{actions.message}</p>}
      {actions.error && <p role="alert" className="text-red-300">{actions.error}</p>}
      {actions.pending && <Button type="button" variant="ghost" size="sm" disabled={actions.busy || actions.checking} onClick={() => { actions.resume(); }}>{t('profileImages.checkPending')}</Button>}
    </div>
  );
};
