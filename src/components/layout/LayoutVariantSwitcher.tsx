import React from 'react';
import { useLayoutVariant, LayoutVariant } from '../../contexts/LayoutVariantContext';

const variants: { value: LayoutVariant; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Original layout' },
  { value: 'minimal', label: 'Minimal', description: 'Subtle rail borders' },
  { value: 'clean', label: 'Clean', description: 'Distinct rail backgrounds' },
  { value: 'ultra-minimal', label: 'Ultra Minimal', description: 'Just subtle separators' },
];

export default function LayoutVariantSwitcher() {
  const { variant, setVariant } = useLayoutVariant();

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-lg">
      <div className="text-xs font-semibold text-white/60 mb-2 px-2">Layout Style</div>
      <div className="flex gap-2">
        {variants.map((v) => (
          <button
            key={v.value}
            onClick={() => setVariant(v.value)}
            className={`
              px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
              ${
                variant === v.value
                  ? 'bg-gradient-to-r from-pink-500/80 to-purple-500/80 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }
            `}
            title={v.description}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

