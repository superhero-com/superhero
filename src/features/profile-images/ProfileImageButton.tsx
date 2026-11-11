import {
  lazy, Suspense, useEffect, useRef, useState,
} from 'react';
import { Camera, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ImageRole } from './api';
import type { SelectedProfileImage } from './ProfileImageCropDialog';
import { useImageActions } from './ProfileImageProvider';
import { useImageConfig } from './useProfileImages';

const CropDialog = lazy(() => import('./ProfileImageCropDialog'));

export const ProfileImageButton = ({ imageRole: role, className }: {
  imageRole: ImageRole;
  className?: string;
}) => {
  const { t } = useTranslation('common');
  const config = useImageConfig();
  const actions = useImageActions();
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const [selected, setSelected] = useState<SelectedProfileImage>();
  const [selecting, setSelecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => () => {
    if (selected) { selected.bitmap.close(); URL.revokeObjectURL(selected.url); }
  }, [selected]);
  if (!config.data?.enabled) return null;
  const choose = async (file?: File) => {
    if (!file) return;
    generation.current += 1;
    const version = generation.current;
    setSelecting(true); setError(''); setSelected(undefined); setOpen(false);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > config.data.maxBytes) throw new Error(t('profileImages.fileError'));
      const bitmap = await createImageBitmap(file);
      if (version !== generation.current) { bitmap.close(); return; }
      if (Math.min(bitmap.width, bitmap.height) < 128
        || bitmap.width > 8192 || bitmap.height > 8192
        || bitmap.width * bitmap.height > 24000000) {
        bitmap.close(); throw new Error(t('profileImages.sizeError'));
      }
      setSelected({ bitmap, url: URL.createObjectURL(file) }); setOpen(true);
    } catch (cause) {
      if (version === generation.current) {
        setError(cause instanceof Error ? cause.message : t('profileImages.openError')); setOpen(true);
      }
    } finally { if (version === generation.current) setSelecting(false); }
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={t(role === 'avatar' ? 'profileImages.changeAvatar' : 'profileImages.changeCover')}
        title={t(role === 'avatar' ? 'profileImages.changeAvatar' : 'profileImages.changeCover')}
        disabled={selecting || actions.busy || !!actions.pending}
        onClick={() => input.current?.click()}
        className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--background-color)] bg-[var(--neon-teal)] text-black shadow-md transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60', className)}
      >
        {selecting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label={t(role === 'avatar' ? 'profileImages.chooseAvatar' : 'profileImages.chooseCover')} hidden onChange={(event) => { const element = event.target; const file = element.files?.[0]; element.value = ''; choose(file); }} />
      {open && (
        <Suspense fallback={null}>
          <CropDialog
            imageRole={role}
            image={selected}
            selectionError={error}
            onClose={() => { setOpen(false); setSelected(undefined); }}
            onChoose={() => input.current?.click()}
            onRestoreFocus={() => button.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
};
