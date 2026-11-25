import { useTranslation } from 'react-i18next';
import AddressAvatar from '@/components/AddressAvatar';
import ProfileBand from '@/features/social/components/ProfileBand';
import { Button } from '@/components/ui/button';
import { ProfileImageButton } from './ProfileImageButton';
import { ProfileImageStatus } from './ProfileImageStatus';
import { useImageActions } from './ProfileImageProvider';
import { useImageConfig, useProfileImages } from './useProfileImages';

export const ProfileImageEditor = ({ address }: { address: string }) => {
  const { t } = useTranslation('common');
  const config = useImageConfig();
  const images = useProfileImages(address);
  const actions = useImageActions();
  if (!config.data?.enabled) return <div className="flex justify-center p-3"><AddressAvatar address={address} size={80} /></div>;
  const disabled = actions.busy || !!actions.pending;
  return (
    <section aria-label={t('profileImages.title')} className="space-y-3">
      <div className="relative rounded-xl border border-white/10">
        <ProfileBand address={address} className="h-28 rounded-t-xl" />
        <ProfileImageButton imageRole="cover" className="absolute right-2 top-2 border-white/10 bg-black/60 text-white" />
        <div className="relative -mt-8 flex items-start gap-4 px-3 pb-3">
          <div className="relative shrink-0 rounded-full ring-4 ring-[var(--background-color)]">
            <AddressAvatar address={address} size={80} />
            <ProfileImageButton imageRole="avatar" className="absolute -bottom-1 -right-2" />
          </div>
          <p className="min-w-0 pt-10 pb-1 text-sm text-white/60">{t('profileImages.personalize')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(['avatar', 'cover'] as const).map((role) => images.data?.[`${role}_cid`] && (
          <Button key={role} type="button" variant="ghost" size="sm" className="text-white/50" disabled={disabled} onClick={() => { actions.change(role, null).catch(() => {}); }}>{t(role === 'avatar' ? 'profileImages.removeAvatar' : 'profileImages.removeCover')}</Button>
        ))}
      </div>
      <ProfileImageStatus />
    </section>
  );
};
