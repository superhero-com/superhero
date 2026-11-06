import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { LoaderCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import type { ImageRole } from './api';
import { useImageActions } from './ProfileImageProvider';
import { exportProfileCrop } from './crop';
import 'react-easy-crop/react-easy-crop.css';
import './profile-image-crop.css';

export interface SelectedProfileImage { url: string; bitmap: ImageBitmap }

const ProfileImageCropDialog = ({
  imageRole: role, image, selectionError, onClose, onChoose, onRestoreFocus,
}: {
  imageRole: ImageRole;
  image?: SelectedProfileImage;
  selectionError: string;
  onClose: () => void;
  onChoose: () => void;
  onRestoreFocus: () => void;
}) => {
  const { t } = useTranslation('common');
  const actions = useImageActions();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const apply = async () => {
    if (!image || !area || applying || actions.busy || actions.pending) return;
    setApplying(true); setError('');
    try {
      const blob = await exportProfileCrop(image.bitmap, area, role);
      await actions.change(role, blob);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('profileImages.saveError'));
    } finally { setApplying(false); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !applying) onClose(); }}>
      <DialogContent
        hideClose={applying}
        className="profile-image-crop-dialog flex w-[calc(100vw-2rem)] max-w-[480px] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-y-auto rounded-2xl border-white/10 bg-[var(--background-color)] p-0 text-white"
        onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
      >
        <div className="border-b border-white/10 px-5 py-4 pr-12">
          <DialogTitle className="text-base font-semibold">
            {t(role === 'avatar' ? 'profileImages.cropAvatar' : 'profileImages.cropCover')}
          </DialogTitle>
        </div>
        <div className="space-y-4 p-5">
          <DialogDescription className="text-sm text-white/60">{t('profileImages.cropHint')}</DialogDescription>
          {image && (
            <>
              <div className={`relative mx-auto w-full max-h-[48dvh] overflow-hidden rounded-lg bg-black ${role === 'avatar' ? 'aspect-square max-w-80' : 'aspect-[4/3]'}`} data-testid="profile-image-crop-area">
                <Cropper
                  image={image.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={role === 'avatar' ? 1 : 8 / 3}
                  cropShape={role === 'avatar' ? 'round' : 'rect'}
                  objectFit="cover"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropAreaChange={(_percent, pixels) => setArea(pixels)}
                  disableAutomaticStylesInjection
                  zoomWithScroll={false}
                  cropperProps={{ 'aria-label': t('profileImages.cropArea') }}
                  onTouchRequest={() => !applying}
                  style={{ containerStyle: { pointerEvents: applying ? 'none' : undefined } }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={t('profileImages.zoomOut')} disabled={applying || zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.1))}><ZoomOut aria-hidden /></Button>
                <input aria-label={t('profileImages.zoom')} type="range" min={1} max={3} step={0.01} value={zoom} disabled={applying} onChange={(event) => setZoom(Number(event.target.value))} className="profile-image-zoom min-w-0 flex-1 cursor-pointer" />
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={t('profileImages.zoomIn')} disabled={applying || zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + 0.1))}><ZoomIn aria-hidden /></Button>
              </div>
            </>
          )}
          {(selectionError || error) && <p role="alert" className="text-sm text-red-300">{selectionError || error}</p>}
          {!image && <Button type="button" variant="outline" onClick={onChoose}>{t('profileImages.chooseAnother')}</Button>}
          {applying && (
          <p role="status" className="flex items-center gap-2 text-sm text-white/70">
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {actions.message || t('profileImages.preparing')}
          </p>
          )}
          {actions.pending && !applying && <p role="status" className="text-sm text-white/70">{actions.message}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button type="button" variant="secondary" className="h-11 rounded-xl" disabled={applying} onClick={onClose}>{t('buttons.cancel')}</Button>
          <Button type="button" className="h-11 rounded-xl bg-[var(--neon-teal)] text-black hover:bg-[var(--neon-teal)]/90" disabled={!area || !image || applying || actions.busy || !!actions.pending} onClick={() => { apply(); }}>{t('profileImages.apply')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileImageCropDialog;
