import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';

const NewPostsPill = ({ count, onClick }: { count: number; onClick: () => void }) => {
  const { t } = useTranslation('social');
  if (count <= 0) return null;
  return (
    // items-start: the default stretch would size the button to this 0-height row.
    <div className="sticky top-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] lg:top-0 z-20 h-0 flex items-start justify-center pointer-events-none">
      {/* hover:shadow-lg keeps the global button:hover glow from base.scss off the pill */}
      <button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1161FE] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-[#0e50d8] hover:shadow-lg active:bg-[#0e50d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        {t('newPosts.show', { count })}
      </button>
    </div>
  );
};

export default NewPostsPill;
