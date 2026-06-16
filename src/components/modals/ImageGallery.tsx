import React from 'react';
import { useTranslation } from 'react-i18next';

const ImageGallery = ({
  images = [],
  onClose,
}: {
  images: string[];
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3>{t('common.imageGallery.images')}</h3>
        <button type="button" onClick={onClose} className="text-sm text-white/80">
          {t('common.buttons.close')}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {images.map((src) => (
          <img key={src} src={src} alt="" style={{ width: '100%', borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
