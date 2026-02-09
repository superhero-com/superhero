import React from 'react';

const ImageGallery = ({
  images = [],
  onClose,
}: {
  images: string[];
  onClose: () => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3>Images</h3>
      <button type="button" onClick={onClose} className="text-sm text-white/80">
        Close
      </button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
      {images.map((src) => (
        <img key={src} src={src} alt="" style={{ width: '100%', borderRadius: 8 }} />
      ))}
    </div>
  </div>
);

export default ImageGallery;
