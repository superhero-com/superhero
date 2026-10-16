import React from 'react';
import { useTranslation } from 'react-i18next';

const NewPostsPill = ({ count, onClick }: { count: number; onClick: () => void }) => {
  const { t } = useTranslation('social');
  if (count <= 0) return null;
  return (
    <div className="sticky top-14 md:top-4 z-20 h-0 flex justify-center pointer-events-none">
      <button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className="pointer-events-auto mt-2 rounded-full bg-[var(--neon-teal,#1161FE)] text-white text-sm font-semibold px-4 py-2 shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {t('newPosts.show', { count })}
      </button>
    </div>
  );
};

export default NewPostsPill;
