import React from 'react';

export default function ImageGallery({ images = [], onClose }: { images: string[]; onClose: () => void }) {
  return (
    <div>
      <h3>Images</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
        {images.map((src) => (
          <img key={src} src={src} alt="" style={{ width: '100%', borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}


